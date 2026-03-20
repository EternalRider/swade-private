import { constants } from '../constants';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ActiveEffectWizard extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options) {
    super(options);
    this.document = options.document;
    if (this.document instanceof SwadeItem) {
      this.#effect.name = this.document.name;
      this.#effect.img = this.document.img;
    }
  }

  #effect: ActiveEffect.CreateData = {
    name: SwadeActiveEffect.defaultName(),
    img: 'systems/swade/assets/icons/active-effect.svg',
  };

  #changes: ChangePreview[] = [];
  #accordions: Accordion[] = [];
  #collapsibleStates: Record<string, boolean> = {
    attribute: true,
    skill: true,
    derived: true,
  };

  currAttribute = 'agility';
  currSkill = '';

  document: SwadeActor | SwadeItem;

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'A.E.G.I.S.',
    },
    position: {
      width: 800,
      height: 800,
    },
    classes: [
      'swade',
      'active-effect-wizard',
      'swade-application',
      'standard-form',
    ],
    tag: 'form',
    form: {
      handler: ActiveEffectWizard.#createEffect,
      submitOnClose: false,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      addChange: ActiveEffectWizard.#onAddChange,
      deleteChange: ActiveEffectWizard.#onDeleteChange,
      clickIcon: ActiveEffectWizard.#onClickIcon,
    },
  };

  static override PARTS = {
    form: {
      template: 'systems/swade/templates/apps/active-effect-wizard.hbs',
      scrollable: ['.presets'],
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  /**
   * Determine if the target of this AE is a vehicle
   */
  get targetIsVehicle() {
    if (this.document instanceof SwadeActor) {
      return this.document.type === 'vehicle';
    } else return this.document.parent?.type === 'vehicle';
  }

  override _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target) return; // TODO: what actually do
    const index = target.closest('li')?.dataset.index;
    if (target.classList.contains('value')) {
      this.#changes[Number(index)].value = target.value;
    } else if (target.classList.contains('mode')) {
      this.#changes[Number(index)].mode = Number(target.value);
    } else if (target.classList.contains('target')) {
      this[target.name] = target.value;
    }
    const formData = new FormDataExtended(this.form);
    foundry.utils.mergeObject(this.#effect, formData.object);
    this.render();
  }

  override async _onRender(context, options) {
    await super._onRender(context, options);
    this.#setupAccordions();
  }

  override async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      isVehicle: this.targetIsVehicle,
      effect: this.#effect,
      changes: this.#changes,
      collapsibleStates: this.#collapsibleStates,
      expirationOptions: this.#getExpirationOptions(),
      skillSuggestions: this.#getSkillSuggestions(),
      derivedPresets: this.#getDerivedPresets(),
      globalModPresets: this.#getGlobalModPresets(),
      otherPresets: this.#getOtherStatsPresets(),
      attributes: {
        agility: 'SWADE.AttrAgi',
        smarts: 'SWADE.AttrSma',
        spirit: 'SWADE.AttrSpr',
        strength: 'SWADE.AttrStr',
        vigor: 'SWADE.AttrVig',
      },
      currAttribute: this.currAttribute,
      currSkill: this.currSkill,
      changeModes: {
        [foundry.CONST.ACTIVE_EFFECT_MODES.ADD]: 'EFFECT.MODE_ADD',
        [foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE]: 'EFFECT.MODE_OVERRIDE',
        [foundry.CONST.ACTIVE_EFFECT_MODES.UPGRADE]: 'EFFECT.MODE_UPGRADE',
      },
      buttons: [
        {
          type: 'submit',
          icon: 'fa-solid fa-arrow-down-to-line',
          label: 'SWADE.ActiveEffects.Add',
        },
      ],
    });
  }

  static async #createEffect(
    this: ActiveEffectWizard,
    _event: SubmitEvent,
    _form: HTMLFormElement,
    _formData: FormDataExtended
  ) {
    this.#prepareChanges();
    const data = foundry.utils.mergeObject(this.#effect, {
      transfer:
        this.document instanceof SwadeItem && this.document.type !== 'power', // only transfer on non-power items
    });

    await getDocumentClass('ActiveEffect').create(data, {
      renderSheet: this.#changes.length === 0,
      parent: this.document as SwadeActor | SwadeItem,
    });
    this.close();
  }

  #getSkillSuggestions(): string[] {
    if (this.document instanceof SwadeActor) {
      return this.document.itemTypes.skill.map((skill) => skill.name!);
    } else if (this.document.parent instanceof SwadeActor) {
      return this.document.parent.itemTypes.skill.map((skill) => skill.name!);
    }
    return [];
  }

  #getDerivedPresets(): ActiveEffectPreset[] {
    if (this.targetIsVehicle) {
      return [
        {
          label: game.i18n.localize('SWADE.Tough'),
          key: 'system.toughness.total',
        },
        {
          label: game.i18n.localize('SWADE.Armor'),
          key: 'system.toughness.armor',
        },
      ];
    } else {
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
        label: game.i18n.localize('SWADE.GlobalMod.TargetAttack'),
        key: 'system.stats.globalMods.targetAttack',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.TargetAttackRanged'),
        key: 'system.stats.globalMods.targetAttackRanged',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.TargetAttackMelee'),
        key: 'system.stats.globalMods.targetAttackMelee',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.TargetDamage'),
        key: 'system.stats.globalMods.targetDamage',
      },
      {
        label: game.i18n.localize('SWADE.GlobalMod.GangUp'),
        key: 'system.stats.globalMods.gangUp',
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
    if (this.targetIsVehicle) {
      return [
        {
          label: game.i18n.localize('SWADE.Size'),
          key: 'system.size',
        },
        {
          label: game.i18n.localize('SWADE.IgnWounds'),
          key: 'system.wounds.ignored',
        },
        {
          label: game.i18n.localize('SWADE.WoundsMax'),
          key: 'system.wounds.max',
        },
      ];
    } else {
      return [
        {
          label: game.i18n.localize('SWADE.Size'),
          key: 'system.stats.size',
        },
        {
          label: game.i18n.localize('SWADE.Pace'),
          key: 'system.pace',
        },
        {
          label: game.i18n.localize('SWADE.RunningDie'),
          key: 'system.pace.running.die',
        },
        {
          label: game.i18n.localize('SWADE.RunningMod'),
          key: 'system.pace.running.mod',
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
            'SWADE.EffectCallbacks.Shaken.UnshakeModifier'
          ),
          key: 'system.attributes.spirit.unShakeBonus',
        },
        {
          label: game.i18n.localize('SWADE.DamageApplicator.SoakModifier'),
          key: 'system.attributes.vigor.soakBonus',
        },
        {
          label: game.i18n.localize(
            'SWADE.EffectCallbacks.Stunned.UnStunModifier'
          ),
          key: 'system.attributes.vigor.unStunBonus',
        },
        {
          label: game.i18n.localize(
            'SWADE.EffectCallbacks.BleedingOut.BleedOutModifier'
          ),
          key: 'system.attributes.vigor.bleedOut.modifier',
        },
        {
          label: game.i18n.localize(
            'SWADE.EffectCallbacks.BleedingOut.IgnoreWounds'
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

  static #onAddChange(
    this: ActiveEffectWizard,
    _event: PointerEvent,
    currentTarget: HTMLElement
  ) {
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
    this.render({ force: true });
  }

  static #onDeleteChange(
    this: ActiveEffectWizard,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const index = target.closest('li')?.dataset.index;
    this.#changes.splice(Number(index), 1);
    this.render({ force: true });
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

  static #onClickIcon(
    this: ActiveEffectWizard,
    _event: PointerEvent,
    _target: HTMLElement
  ) {
    new foundry.applications.apps.FilePicker.implementation({
      current: this.#effect.img as string,
      type: 'image',
      callback: this.#onChangeIcon.bind(this),
    }).render({ force: true });
  }

  #onChangeIcon(path: string, _picker: FilePicker) {
    this.#effect.img = path;
    this.render({ force: true });
  }
}

interface ActiveEffectPreset {
  label: string;
  key: string;
  group?: string;
}

interface ChangePreview extends Partial<ActiveEffect.EffectChangeData> {
  label: string;
}
