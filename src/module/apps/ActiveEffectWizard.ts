import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { EffectChangeDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';

export default class ActiveEffectWizard extends FormApplication {
  private effect: ActiveEffectDataConstructorData = {
    label: game.i18n.format('DOCUMENT.New', {
      type: game.i18n.localize('DOCUMENT.ActiveEffect'),
    }),
    icon: 'systems/swade/assets/icons/active-effect.svg',
  };

  private changes = new Array<ChangePreview>();
  private accordions = new Array<Accordion>();
  private collapsibleStates: Record<string, boolean> = {
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
      submitOnChange: true,
      closeOnSubmit: false,
      width: 800,
      height: 800,
    });
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this._setupAccordions();
    html.find('button[data-key]').on('click', this._addChange.bind(this));
    html.find('button.submit').on('click', async () => {
      await this._createEffect();
      this.close();
    });
    html
      .find('.effect-basics .icon-path input[type="text"]')
      .on('change', (ev) => {
        const input = ev.currentTarget as HTMLInputElement;
        html[0].querySelector<HTMLImageElement>('.effect-basics img')!.src =
          input.value;
      });

    html.find('.change .value').on('change', (ev) => {
      const target = ev.currentTarget as HTMLInputElement;
      const index = $(ev.currentTarget).parents('li.change').data('index');
      this.changes[Number(index)].value = target.value;
    });

    html.find('.change .mode').on('change', (ev) => {
      const target = ev.currentTarget as HTMLSelectElement;
      const index = $(ev.currentTarget).parents('li.change').data('index');
      this.changes[Number(index)].mode = Number(target.value);
    });

    html.find('.change .delete-change').on('click', (ev) => {
      const index = $(ev.currentTarget).parents('li.change').data('index');
      this.changes.splice(index, 1);
      this.render(true);
    });
  }

  override async getData(options?: Partial<ApplicationOptions>) {
    const data = {
      effect: this.effect,
      changes: this.changes,
      collapsibleStates: this.collapsibleStates,
      skillSuggestions: this._getSkillSuggestions(),
      derivedPresets: this._getDerivedPresets(),
      otherPresets: this._getOtherStatsPresets(),
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
    this.effect = foundry.utils.mergeObject(this.effect, formData);
  }

  private async _createEffect() {
    this._prepareChanges();
    CONFIG.ActiveEffect.documentClass.create(
      foundry.utils.mergeObject(this.effect, {
        transfer: this.object instanceof SwadeItem,
      }),
      {
        renderSheet: this.changes.length === 0,
        parent: this.object as SwadeActor | SwadeItem,
      },
    );
  }

  private _getSkillSuggestions(): string[] {
    if (this.object instanceof SwadeActor) {
      return this.object.itemTypes.skill.map((skill) => skill.name!);
    }
    return [];
  }

  private _getDerivedPresets(): ActiveEffectPreset[] {
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

  private _getOtherStatsPresets(): ActiveEffectPreset[] {
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

  private _prepareChanges() {
    this.effect.changes = this.changes.map((c) => {
      return {
        key: c.key,
        mode: c.mode,
        value: c.value,
      };
    });
  }

  private _addChange(ev: JQuery.ClickEvent) {
    const category = $(ev.currentTarget)
      .parents('details')
      .data('category') as string;
    const keyPart = ev.currentTarget.dataset.key as string;
    const target =
      ($(ev.currentTarget)
        .parents('details')
        .find('.target')
        .val() as string) ?? ev.currentTarget.innerText;

    let label = '';
    let key = '';
    if (category === 'skill') {
      if (!target) {
        return ui.notifications.warn('Please enter a skill name first!');
      }
      label = `${target.capitalize()} ${ev.currentTarget.innerText}`.trim();
      key = `@${category.capitalize()}{${target}}[system.${keyPart}]`;
    } else if (category === 'attribute') {
      label = `${target.capitalize()} ${ev.currentTarget.innerText}`.trim();
      key = `system.attributes.${target}.${keyPart}`;
    } else {
      label = target;
      key = keyPart;
    }

    this.changes?.push({
      label: label,
      key: key,
      mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
    });
    this.render(true);
  }

  private _setupAccordions() {
    this.form
      ?.querySelectorAll<HTMLDetailsElement>('.presets details')
      .forEach((el) => {
        this.accordions.push(new Accordion(el, '.content', { duration: 200 }));
        const id = el.dataset.category as string;
        el.querySelector('summary')?.addEventListener('click', () => {
          const states = this.collapsibleStates;
          const currentState = Boolean(states[id]);
          states[id] = !currentState;
        });
      });
  }
}

interface ActiveEffectPreset {
  label: string;
  key: string;
  group?: string;
}

interface ChangePreview extends EffectChangeDataConstructorData {
  label: string;
}
