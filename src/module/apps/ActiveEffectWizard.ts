import { BaseActiveEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/module.mjs';
import { constants } from '../constants';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';
import { DeepPartial } from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';

export default class ActiveEffectWizard extends FormApplication {
  #effect: DeepPartial<BaseActiveEffect.Properties> = {
    name: SwadeActiveEffect.defaultName,
    img: 'systems/swade/assets/icons/active-effect.svg',
  };

  #changes: ChangePreview[] = [];
  #accordions: Accordion[] = [];
  #collapsibleStates: Record<string, boolean> = {
    attribute: true,
    skill: true,
    derived: true,
  };

  static override get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: 'A.E.G.I.S.',
      template: 'systems/swade/templates/apps/active-effect-wizard.hbs',
      classes: ['swade', 'active-effect-wizard', 'swade-app'],
      scrollY: ['.presets'],
      submitOnClose: false,
      submitOnChange: false,
      closeOnSubmit: false,
      width: 800,
      height: 800,
    });
  }

  constructor(
    object: SwadeActor | SwadeItem,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(object, options);
    if (object instanceof SwadeItem) {
      this.#effect.name = object.name as string;
      this.#effect.img = object.img as string;
    }
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    super.activateListeners(jquery);
    this.#setupAccordions();
    const html = jquery[0];
    html
      .querySelectorAll<HTMLButtonElement>('button[data-key]')
      .forEach((btn) =>
        btn.addEventListener('click', this.#onAddChange.bind(this)),
      );
    html
      .querySelectorAll<HTMLButtonElement>('.change .delete-change')
      .forEach((btn) =>
        btn.addEventListener('click', this.#onDeleteChange.bind(this)),
      );

    html.querySelector('button.submit')?.addEventListener('click', async () => {
      await this.#createEffect();
      this.close();
    });

    html
      .querySelectorAll<HTMLSelectElement>('.change .value')
      .forEach((select) =>
        select.addEventListener('change', this.#onChangeValue.bind(this)),
      );

    html
      .querySelectorAll<HTMLSelectElement>('.change .mode')
      .forEach((select) =>
        select.addEventListener('change', this.#onChangeMode.bind(this)),
      );

    html
      .querySelector<HTMLImageElement>('.icon')
      ?.addEventListener('click', this.#onClickIcon.bind(this));

    html
      .querySelectorAll<HTMLInputElement>('[name]')
      .forEach((input) =>
        input.addEventListener('blur', this.submit.bind(this)),
      );
  }

  override async getData(options?: Partial<ApplicationOptions>) {
    const data = {
      effect: this.#effect,
      changes: this.#changes,
      collapsibleStates: this.#collapsibleStates,
      expirationOptions: this.#getExpirationOptions(),
      skillSuggestions: this.#getSkillSuggestions(),
      derivedPresets: this.#getDerivedPresets(),
      globalModPresets: this.#getGlobalModPresets(),
      otherPresets: this.#getOtherStatsPresets(),
      changeModes: {
        [foundry.CONST.ACTIVE_EFFECT_MODES.ADD]: 'EFFECT.MODE_ADD',
        [foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE]: 'EFFECT.MODE_OVERRIDE',
        [foundry.CONST.ACTIVE_EFFECT_MODES.UPGRADE]: 'EFFECT.MODE_UPGRADE',
      },
    };
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected override async _updateObject(
    _event: Event,
    formData?: object,
  ): Promise<void> {
    this.#effect = foundry.utils.mergeObject(this.#effect, formData);
    this.render();
  }

  async #createEffect() {
    this.#prepareChanges();
    const data = foundry.utils.mergeObject(this.#effect, {
      transfer: this.object instanceof SwadeItem,
    });

    getDocumentClass('ActiveEffect').create(data, {
      renderSheet: this.#changes.length === 0,
      parent: this.object as SwadeActor | SwadeItem,
    });
  }

  #getSkillSuggestions(): string[] {
    if (this.object instanceof SwadeActor) {
      return this.object.itemTypes.skill.map((skill) => skill.name!);
    }
    return [];
  }

  #getDerivedPresets(): ActiveEffectPreset[] {
    return [
      {
        label: game.i18n.localize('SWADE.Tough'),
        key: 'system.stats.toughness.value',
      },
      {
        label: game.i18n.localize('SWADE.Armor'),
        key: 'system.stats.toughness.armor',
      },
      {
        label: game.i18n.localize('SWADE.Parry'),
        key: 'system.stats.parry.value',
      },
    ];
  }

  #getGlobalModPresets(): ActiveEffectPreset[] {
    return [
      {
        label: game.i18n.localize('SWADE.GlobalMod.Trait'),
        key: 'system.stats.globalMods.trait',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Agility'),
        key: 'system.stats.globalMods.agility',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Smarts'),
        key: 'system.stats.globalMods.smarts',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Spirit'),
        key: 'system.stats.globalMods.spirit',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Strength'),
        key: 'system.stats.globalMods.strength',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Vigor'),
        key: 'system.stats.globalMods.vigor',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Attack'),
        key: 'system.stats.globalMods.attack',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.Damage'),
        key: 'system.stats.globalMods.damage',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.AP'),
        key: 'system.stats.globalMods.ap',
      },
    ];
  }

  #getOtherStatsPresets(): ActiveEffectPreset[] {
    return [
      {
        label: game.i18n.localize('SWADE.Size'),
        key: 'system.stats.size',
      },
      {
        label: game.i18n.localize('SWADE.Pace'),
        key: 'system.stats.speed.value',
      },
      {
        label: game.i18n.localize('SWADE.RunningDie'),
        key: 'system.stats.speed.runningDie',
      },
      {
        label: game.i18n.localize('SWADE.RunningMod'),
        key: 'system.stats.speed.runningMod',
      },
      {
        label: game.i18n.localize('SWADE.EncumbranceSteps'),
        key: 'system.attributes.strength.encumbranceSteps',
      },
      {
        label: game.i18n.localize('SWADE.IgnWounds'),
        key: 'system.wounds.ignored',
      },
      {
        label: game.i18n.localize('SWADE.WoundsMax'),
        key: 'system.wounds.max',
      },
      {
        label: game.i18n.localize('SWADE.BenniesMax'),
        key: 'system.bennies.max',
      },
      {
        label: game.i18n.localize('SWADE.FatigueMax'),
        key: 'system.fatigue.max',
      },
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.Shaken.UnshakeModifier',
        ),
        key: 'system.attributes.spirit.unShakeBonus',
      },
      {
        label: game.i18n.localize('SWADE.DamageApplicator.SoakModifier'),
        key: 'system.attributes.vigor.soakBonus',
      },
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.Stunned.UnStunModifier',
        ),
        key: 'system.attributes.vigor.unStunBonus',
      },
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.BleedingOut.BleedOutModifier',
        ),
        key: 'system.attributes.vigor.bleedOut.modifier',
      },
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.BleedingOut.IgnoreWounds',
        ),
        key: 'system.attributes.vigor.bleedOut.ignoreWounds',
      },
      {
        label: game.i18n.localize('SWADE.WealthDie.Sides'),
        key: 'system.details.wealth.die',
      },
      {
        label: game.i18n.localize('SWADE.WealthDie.WildSides'),
        key: 'system.details.wealth.wild-die',
      },
      {
        label: game.i18n.localize('SWADE.WealthDie.Modifier'),
        key: 'system.details.wealth.modifier',
      },
    ];
  }

  #getExpirationOptions(): Record<number, string> {
    return {
      [constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto]:
        'SWADE.Expiration.BeginAuto',
      [constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt]:
        'SWADE.Expiration.BeginPrompt',
      [constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto]:
        'SWADE.Expiration.EndAuto',
      [constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt]:
        'SWADE.Expiration.EndPrompt',
    };
  }

  #prepareChanges() {
    this.#effect.changes = this.#changes.map((c) => {
      return {
        key: c.key,
        mode: c.mode,
        value: c.value,
      };
    });
  }

  #onAddChange(ev: PointerEvent) {
    const currentTarget = ev.currentTarget as HTMLButtonElement;
    const details = currentTarget.closest('details');
    const keyPart = currentTarget.dataset.key as string;
    const category = details?.dataset.category as string;
    const target =
      (details?.querySelector<HTMLInputElement | HTMLSelectElement>('.target')
        ?.value as string) ?? currentTarget.innerText;

    let label = '';
    let key = '';
    if (category === 'skill') {
      if (!target) {
        return ui.notifications.warn('Please enter a skill name first!');
      }
      label = `${target.capitalize()} ${currentTarget.innerText}`.trim();
      key = `@${category.capitalize()}{${target}}[system.${keyPart}]`;
    } else if (category === 'attribute') {
      label = `${target.capitalize()} ${currentTarget.innerText}`.trim();
      key = `system.attributes.${target}.${keyPart}`;
    } else {
      label = target;
      key = keyPart;
    }

    this.#changes?.push({
      label: label,
      key: key,
      mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
    });
    this.render(true);
  }

  #onDeleteChange(ev: PointerEvent) {
    const index = (ev.currentTarget as HTMLButtonElement).closest('li')?.dataset
      .index;
    this.#changes.splice(Number(index), 1);
    this.render(true);
  }

  #onChangeValue(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement;
    const index = (ev.currentTarget as HTMLInputElement).closest('li')?.dataset
      .index;
    this.#changes[Number(index)].value = target.value;
  }

  #onChangeMode(ev: Event) {
    const target = ev.currentTarget as HTMLSelectElement;
    const index = (ev.currentTarget as HTMLSelectElement).closest('li')?.dataset
      .index;
    this.#changes[Number(index)].mode = Number(target.value);
  }

  #setupAccordions() {
    this.form
      ?.querySelectorAll<HTMLDetailsElement>('.presets details')
      .forEach((el) => {
        this.#accordions.push(new Accordion(el, '.content', { duration: 200 }));
        const id = el.dataset.category as string;
        el.querySelector('summary')?.addEventListener('click', () => {
          const states = this.#collapsibleStates;
          const currentState = Boolean(states[id]);
          states[id] = !currentState;
        });
      });
  }

  #onClickIcon() {
    new FilePicker({
      current: this.#effect.img as string,
      type: 'image',
      callback: this.#onChangeIcon.bind(this),
    }).render(true);
  }

  #onChangeIcon(path: string, _picker: FilePicker) {
    this.#effect.img = path;
    this.render(true);
  }
}

interface ActiveEffectPreset {
  label: string;
  key: string;
  group?: string;
}

interface ChangePreview extends Partial<EffectChangeData> {
  label: string;
}
