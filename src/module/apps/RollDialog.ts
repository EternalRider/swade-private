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

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ ctx, resolve, ...options }: RollDialogConfiguration) {
    super(options);
    this.#ctx = ctx;
    this.#callback = resolve;
  }

  #callback: (roll: SwadeRoll | null) => void;
  #filters: foundry.applications.ux.SearchFilter[] =
    this.#createFiltersHandlers();
  #isResolved = false;
  #extraButtonUsed = false;
  #keydownListener;
  #ctx: RollDialogContext;

  static asPromise(ctx: RollDialogContext): Promise<SwadeRoll | null> {
    return new Promise<SwadeRoll | null>((resolve) =>
      new RollDialog({ ctx, resolve }).render({ force: true }),
    );
  }

  static override DEFAULT_OPTIONS = {
    window: {
      contentClasses: ['standard-form'],
    },
    classes: ['swade', 'roll-dialog', 'swade-application'],
    position: {
      width: 400,
      height: 'auto',
    },
    filters: [{ inputSelector: '.searchBox', contentSelector: '.selections' }],
    tag: 'form',
    form: {
      handler: RollDialog.onSubmit,
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
    },
    actions: {
      close: RollDialog.#onClose,
      addModifier: RollDialog.#onAddModifier,
      addPreset: RollDialog.#onAddPreset,
      toggleList: RollDialog.#onToggleList,
    },
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/roll-dialog.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  get ctx() {
    return this.#ctx;
  }

  get rollCls(): typeof SwadeRoll {
    //@ts-expect-error JS somehow resolves that as a function
    return this.ctx.roll.constructor as SwadeRoll;
  }

  override get title(): string {
    return this.ctx.title ?? 'SWADE RollDialog';
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

  #createFiltersHandlers() {
    return this.options.filters.map((f) => {
      f.callback = this._onSearchFilter.bind(this);
      return new foundry.applications.ux.SearchFilter(f);
    });
  }

  override async _onRender(context, options) {
    await super._onRender(context, options);
    this.#filters.forEach((f) => f.bind(this.element));
    if (!this.#keydownListener) {
      this.#keydownListener = this.#onKeyDown.bind(this);
      document.addEventListener('keydown', this.#keydownListener);
    }
    this.element
      .querySelector('.new-modifier-value')
      ?.addEventListener('input', (ev) => {
        const addModButton = this.element.querySelector('.add-modifier');
        if (addModButton) addModButton.disabled = !ev.target?.value?.length;
      });
  }

  static #onToggleList(
    this: RollDialog,
    _event: PointerEvent,
    target: HTMLButtonElement,
  ) {
    const style = getComputedStyle(target);
    const html = this.element;
    html.querySelector('.fa-solid.fa-caret-right')?.classList.toggle('rotate');
    const dropdown = html.querySelector('.dropdown');
    if (dropdown) {
      dropdown.style.width = style.width;
      dropdown.classList.toggle('collapsed');
    }
  }

  override _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const target = event.target;
    if (!target) return;
    if (target.type === 'checkbox') {
      const index = Number(target.dataset.index);
      this.modifiers[index].ignore = !target.checked;
      this.render();
    }
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        rollModes: CONFIG.Dice.rollModes,
        modGroups: new Array<RollModifierGroup>(),
        extraButtonLabel: '',
        rollMode: game.settings.get('core', 'rollMode'),
        modifiers: this.modifiers
          .map(normalizeRollModifiers)
          .map(this.#fillModifierLabels.bind(this)),
        formula: this.#buildRollForEvaluation().formula.replace(
          /(?<={[^}]*?),/g,
          ', ',
        ),
        isTraitRoll: this.isTraitRoll,
        buttons: [
          {
            type: 'submit',
            icon: 'fa-solid fa-dice',
            cssClass: 'submit-roll',
            label: 'SWADE.Roll',
          },
          {
            type: 'button',
            icon: 'fa-solid fa-times',
            action: 'close',
            label: 'Close',
          },
        ],
      },
    );

    if (
      this.isDamageRoll ||
      (this.isTraitRoll && !this.ctx.actor?.isWildcard)
    ) {
      context.buttons.splice(1, 0, {
        type: 'submit',
        icon: 'fa-regular fa-square-plus',
        cssClass: 'submit-roll',
        name: 'extra',
        label: this.isDamageRoll ? 'SWADE.RollRaise' : 'SWADE.GroupRoll',
      });
    }

    CONFIG.SWADE.prototypeRollGroups.forEach((m) => {
      if (m.rollType === constants.ROLL_TYPE.TRAIT && !this.isTraitRoll) return;
      if (m.rollType === constants.ROLL_TYPE.ATTACK && !this.isAttack) return;
      if (m.rollType === constants.ROLL_TYPE.DAMAGE && !this.isDamageRoll)
        return;
      context.modGroups.push(m);
    });
    return context;
  }

  static async onSubmit(
    this: RollDialog,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ) {
    this.#extraButtonUsed = event.submitter?.name === 'extra';
    const expanded = foundry.utils.expandObject(
      formData.object,
    ) as RollDialogFormData;
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

  static #onClose(
    this: RollDialog,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    return this.close();
  }

  protected override _onClose(options) {
    super._onClose(options);
    // Fallback if the roll has not yet been resolved
    if (!this.#isResolved) this.#callback(null);
    document.removeEventListener('keydown', this.#keydownListener);
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
    finalizedRoll.setRollType(this.ctx.roll.rollType);

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

  protected _onSearchFilter(
    _event: KeyboardEvent,
    _query: string,
    rgx: RegExp,
    html: HTMLElement,
  ) {
    for (const li of Array.from(html.children) as HTMLLIElement[]) {
      if (li.classList.contains('group-header')) continue;
      const btn = li.querySelector('.add-preset');
      const name = btn?.textContent;
      const match = rgx.test(
        foundry.applications.ux.SearchFilter.cleanQuery(name!),
      );
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

  static #onAddModifier(
    this: RollDialog,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    this.#addModifier();
    this.render({ force: true });
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

  static #onAddPreset(
    this: RollDialog,
    _event: PointerEvent,
    target: HTMLButtonElement,
  ) {
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
    this.render({ force: true });
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
      } else {
        return this.submit();
      }
    }
  }
}

export interface RollDialogContext {
  roll: SwadeRoll<any>;
  mods: RollModifier[];
  speaker: foundry.documents.BaseChatMessage.CreateData['speaker'];
  flavor: string;
  title: string;
  item?: SwadeItem;
  actor?: SwadeActor;
  ap?: number;
  isHeavyWeapon?: boolean;
}
interface RollDialogConfiguration
  extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  ctx: RollDialogContext;
  resolve: (roll: SwadeRoll | null) => void;
}
interface RollDialogFormData {
  modifiers?: Array<RollModifier & { active: boolean }>;
  map?: number;
  rollMode: foundry.CONST.DICE_ROLL_MODES;
}
