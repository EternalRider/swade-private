import {
  RollModifier,
  RollModifierGroup,
} from '../../interfaces/additional.interface';
import { constants } from '../constants';
import { DamageRoll } from '../dice/DamageRoll';
import { SwadeRoll } from '../dice/SwadeRoll';
import { TraitRoll } from '../dice/TraitRoll';
import WildDie from '../dice/WildDie';
import type SwadeActor from '../documents/actor/SwadeActor';
import type SwadeItem from '../documents/item/SwadeItem';
import { modifierReducer, normalizeRollModifiers } from '../util';

export class RollDialog extends FormApplication<
  FormApplicationOptions,
  RollDialogContext
> {
  #callback: (roll: SwadeRoll | null) => void;
  #isResolved = false;
  #extraButtonUsed = false;

  static asPromise(ctx: RollDialogContext): Promise<SwadeRoll | null> {
    return new Promise<SwadeRoll | null>(
      (resolve) => new RollDialog(ctx, resolve),
    );
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/roll-dialog.hbs',
      classes: ['swade', 'roll-dialog', 'swade-app'],
      width: 400,
      filters: [
        {
          inputSelector: '.searchBox',
          contentSelector: '.selections',
        },
      ],
      height: 'auto' as const,
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
    });
  }

  constructor(
    ctx: RollDialogContext,
    resolve: (roll: SwadeRoll | null) => void,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(ctx, options);
    this.#callback = resolve;
    this.render(true);
  }

  get ctx() {
    return this.object;
  }

  get rollCls(): typeof SwadeRoll {
    //@ts-expect-error JS somehow resolves that as a function
    return this.ctx.roll.constructor as SwadeRoll;
  }

  override get title(): string {
    return this.ctx.title ?? 'SWADE Rolldialog';
  }

  get rollMode(): foundry.CONST.DICE_ROLL_MODES {
    return this.form!.querySelector<HTMLSelectElement>('#rollMode')!
      .value as foundry.CONST.DICE_ROLL_MODES;
  }

  get isTraitRoll(): boolean {
    return this.ctx.roll instanceof TraitRoll;
  }

  get isDamageRoll(): boolean {
    return this.ctx.roll instanceof DamageRoll;
  }

  get isAttack(): boolean {
    return this.ctx?.item?.type === 'weapon' && this.isTraitRoll;
  }

  get modifiers(): RollModifier[] {
    return this.ctx.mods;
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    $(document).on('keydown.chooseDefault', this.#onKeyDown.bind(this));
    html[0]
      .querySelector<HTMLButtonElement>('button#close')
      ?.addEventListener('click', this.close.bind(this));
    html[0]
      .querySelector<HTMLButtonElement>('button.add-modifier')
      ?.addEventListener('click', () => {
        this.#addModifier();
        this.render();
      });
    html[0]
      .querySelectorAll<HTMLButtonElement>('.modifier .add-preset')
      .forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          this.#addPreset(ev);
          this.render();
        });
      });
    html[0]
      .querySelector<HTMLButtonElement>('button.toggle-list')
      ?.addEventListener('click', (ev) => {
        const target = ev.currentTarget as HTMLButtonElement;
        const width = getComputedStyle(target).width;
        html[0]
          .querySelector('.fas.fa-caret-right')
          ?.classList.toggle('rotate');
        html.find('.searchBox').outerWidth(width, true);
        html.find('.dropdown').outerWidth(width).slideToggle({ duration: 200 });
      });
    html[0]
      .querySelectorAll<HTMLButtonElement>('button.submit-roll')
      .forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const target = ev.currentTarget as HTMLButtonElement;
          this.#extraButtonUsed = target.dataset.type === 'extra';
          this.submit();
        });
      });

    html[0]
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((el) =>
        el.addEventListener('change', (ev) => {
          const target = ev.currentTarget as HTMLInputElement;
          const index = Number(target.dataset.index);
          this.modifiers[index].ignore = !target.checked;
          this.render();
        }),
      );
  }

  override async getData() {
    const data = {
      displayExtraButton: true,
      rollModes: CONFIG.Dice.rollModes,
      modGroups: new Array<RollModifierGroup>(),
      extraButtonLabel: '',
      rollMode: game.settings.get('core', 'rollMode'),
      modifiers: this.modifiers
        .map(normalizeRollModifiers)
        .map(this.#fillModifierLabels.bind(this)),
      formula: this.#buildRollForEvaluation().formula,
      isTraitRoll: this.isTraitRoll,
    };

    CONFIG.SWADE.prototypeRollGroups.forEach((m) => {
      if (m.rollType === constants.ROLL_TYPE.TRAIT && !this.isTraitRoll) return;
      if (m.rollType === constants.ROLL_TYPE.ATTACK && !this.isAttack) return;
      if (m.rollType === constants.ROLL_TYPE.DAMAGE && !this.isDamageRoll)
        return;
      data.modGroups.push(m);
    });

    if (this.isDamageRoll) {
      data.extraButtonLabel = game.i18n.localize('SWADE.RollRaise');
    } else if (this.isTraitRoll && !this.ctx.actor?.isWildcard) {
      data.extraButtonLabel = game.i18n.localize('SWADE.GroupRoll');
    } else {
      data.displayExtraButton = false;
    }

    return data;
  }

  protected override async _updateObject(ev: Event, formData: FormData) {
    const expanded = foundry.utils.expandObject(formData) as RollDialogFormData;
    Object.values(expanded.modifiers ?? []).forEach(
      (v, i) => (this.modifiers[i].ignore = !v.active),
    );
    if (expanded.map && expanded.map !== 0) {
      this.modifiers.push({
        label: game.i18n.localize('SWADE.MAPenalty.Label'),
        value: expanded.map,
      });
    }

    //add any unsubmitted modifiers, evaluate and resolve the promise
    this.#addModifier();
    this.#resolve(await this.#evaluateRoll());
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    //fallback if the roll has not yet been resolved
    if (!this.#isResolved) this.#callback(null);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  async #evaluateRoll(): Promise<SwadeRoll<any>> {
    this.#checkForAndAddBonusDamage();

    const roll = this.#buildRollForEvaluation();
    const terms = roll.terms;

    //Add the Wild Die for a group roll of
    if (
      this.#extraButtonUsed &&
      this.isTraitRoll &&
      !this.ctx.actor?.isWildcard
    ) {
      const traitPool = terms[0];
      if (traitPool instanceof foundry.dice.terms.PoolTerm) {
        const wildDie = new WildDie();
        const wildRoll = this.rollCls.fromTerms([wildDie]);
        traitPool.rolls.push(wildRoll);
        traitPool.terms.push(wildRoll.formula);
      }
    }

    //recreate the roll
    const finalizedRoll = this.rollCls.fromTerms(
      terms,
      roll.options,
    ) as SwadeRoll;
    if (finalizedRoll instanceof TraitRoll) {
      finalizedRoll.groupRoll =
        this.#extraButtonUsed && !this.ctx.actor?.isWildcard;
    }

    //evaluate
    await finalizedRoll.evaluate();

    if (finalizedRoll instanceof DamageRoll) {
      finalizedRoll.ap = this.ctx.ap ?? 0;
      finalizedRoll.isHeavyWeapon = this.ctx.isHeavyWeapon ?? false;
    }

    finalizedRoll.setRerollable(this.ctx.roll.isRerollable);

    // Convert the roll to a chat message and return it
    const msg = await finalizedRoll.toMessage(
      {
        flavor: this.ctx.flavor,
        speaker: this.ctx.speaker,
      },
      { rollMode: this.rollMode },
    );
    // TODO: Remove type annotation after toMessage gets fixed upstream in types
    finalizedRoll.setMessageId(msg?.id as string);

    return finalizedRoll;
  }

  protected override _onSearchFilter(
    _event: KeyboardEvent,
    _query: string,
    rgx: RegExp,
    html: HTMLElement,
  ) {
    for (const li of Array.from(html.children) as HTMLLIElement[]) {
      if (li.classList.contains('group-header')) continue;
      const btn = li.querySelector('.add-preset');
      const name = btn?.textContent;
      const match = rgx.test(SearchFilter.cleanQuery(name!));
      li.style.display = match ? 'block' : 'none';
    }
  }

  #buildRollForEvaluation(): SwadeRoll {
    const formula =
      this.ctx.roll.formula +
      this.modifiers
        .filter((v) => !v.ignore) //remove the disabled modifiers
        .map(normalizeRollModifiers)
        .reduce(modifierReducer, '');
    // Create new roll from pure formula text
    const intermediateRoll = new this.rollCls(formula, this.#getRollData());
    const oldTerms = this.ctx.roll.terms;
    const newTerms = intermediateRoll.terms;
    // Replace "duplicate" terms with the originals to retain any extra data set on them
    newTerms.splice(0, oldTerms.length, ...oldTerms);
    const roll = this.rollCls.fromTerms(newTerms) as SwadeRoll;
    roll.modifiers = this.modifiers;
    return roll;
  }

  #fillModifierLabels(mod: RollModifier): RollModifier {
    if (typeof mod.value === 'string' && mod.value.startsWith('@')) {
      const key = mod.value.split('@')[1];
      const rollData = this.#getRollData();
      const value = rollData[key];
      const match = value.match(/\[(\w+)\]/); //extract the roll flavor text
      if (value && match) mod.label = match[1];
    }
    mod.label ||= game.i18n.localize('SWADE.Addi');
    return mod;
  }

  #resolve(roll: SwadeRoll) {
    this.#isResolved = true;
    this.#callback(roll);
    this.close();
  }

  /** add a + if no +/- is present in the situational mod */
  #sanitizeModifierInput(modifier: string): string {
    if (modifier.startsWith('@')) return modifier;
    if (!modifier[0].match(/[+-]/)) return '+' + modifier;
    return modifier;
  }

  #getRollData() {
    if (this.ctx.actor) return this.ctx.actor.getRollData(false);
    return this.ctx.item?.actor?.getRollData(false) ?? {};
  }

  #checkForAndAddBonusDamage() {
    if (this.#extraButtonUsed && this.ctx.item && !this.ctx.actor) {
      const bonusDamageDice = this.ctx.item?.['system']['bonusDamageDice'];
      const bonusDamageDieType = this.ctx.item?.['system']['bonusDamageDie'];
      this.modifiers.push({
        label: game.i18n.localize('SWADE.BonusDamage'),
        value: `+${bonusDamageDice ?? 1}d${bonusDamageDieType}x`,
      });
    }
  }

  /** Reads the modifier inputs, sanitizes them and adds the values to the mod array */
  #addModifier() {
    const label = this.form?.querySelector<HTMLInputElement>(
      '.new-modifier-label',
    )?.value;
    const value = this.form?.querySelector<HTMLInputElement>(
      '.new-modifier-value',
    )?.value;
    if (value) {
      this.modifiers.push({
        label: label || game.i18n.localize('SWADE.Addi'),
        value: this.#sanitizeModifierInput(value),
      });
    }
  }

  #addPreset(ev: MouseEvent): void {
    const target = ev.currentTarget as HTMLButtonElement;
    const group = CONFIG.SWADE.prototypeRollGroups.find(
      (v) => v.name === target.dataset.group,
    );
    const modifier = group?.modifiers[Number(target.dataset.index)];
    if (modifier) {
      this.modifiers.push({
        label: modifier.label,
        value: modifier.value,
      });
    }
  }

  #onKeyDown(event) {
    // Close dialog
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }

    // Confirm default choice or add a modifier
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const modValue = this.form?.querySelector<HTMLInputElement>(
        '.new-modifier-value',
      )?.value;
      if (modValue) {
        this.#addModifier();
        return this.render();
      }
      return this.submit();
    }
  }
}

export interface RollDialogContext {
  roll: SwadeRoll<any>;
  mods: RollModifier[];
  speaker: foundry.documents.BaseChatMessage.Properties['speaker'];
  flavor: string;
  title: string;
  item?: SwadeItem;
  actor?: SwadeActor;
  ap?: number;
  isHeavyWeapon?: boolean;
}
interface RollDialogFormData {
  modifiers?: Array<RollModifier & { active: boolean }>;
  map?: number;
  rollMode: foundry.CONST.DICE_ROLL_MODES;
}
