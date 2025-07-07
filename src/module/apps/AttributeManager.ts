import { DieSidesOption } from '../../globals';
import SwadeActor from '../documents/actor/SwadeActor';
import { getDieSidesRange } from '../util';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class AttributeManager extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor({ actor, ...options }: AttributeManagerConfiguration) {
    if (!(actor instanceof Actor)) throw new Error('Not an Actor!');
    super(options);
    this.#actor = actor;
  }

  #actor: SwadeActor;

  static override DEFAULT_OPTIONS = {
    classes: ['swade', 'attribute-manager', 'swade-application'],
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      contentClasses: ['standard-form'],
    },
    tag: 'form',
    form: {
      handler: AttributeManager.onSubmit,
      submitOnClose: false,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/attribute-manager.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  override get id(): string {
    return `${this.actor.id}-attributeManager`;
  }

  override get title(): string {
    return game.i18n.format('SWADE.AttributeManager.Title', {
      name: this.actor.name,
    });
  }

  get actor(): SwadeActor {
    return this.#actor;
  }

  override async _prepareContext(options) {
    const context: AttributeManagerRenderContext = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        isExtra: !this.actor.isWildcard,
        dieSides:
          this.actor.type === 'character'
            ? getDieSidesRange(4, 20)
            : getDieSidesRange(4, 24),
        wildDieSides: getDieSidesRange(4, 12),
        dieSidesWithMinimum:
          this.actor.type === 'character'
            ? getDieSidesRange(1, 20)
            : getDieSidesRange(1, 24),
        actor: this.actor,
        buttons: [
          {
            type: 'submit',
            icon: 'fa-solid fa-floppy-disk',
            label: 'Save Changes',
          },
        ],
      },
    );
    return context;
  }

  static async onSubmit(
    this: AttributeManager,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ) {
    await this.actor.update(formData.object);
    await this.render({ force: true });
    if (event.submitter) this.close();
  }
}

interface AttributeManagerConfiguration
  extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  actor: SwadeActor;
}

interface AttributeManagerRenderContext
  extends Partial<foundry.applications.api.ApplicationV2.RenderContext> {
  isExtra: boolean;
  dieSides: DieSidesOption[];
  wildDieSides: DieSidesOption[];
  dieSidesWithMinimum: DieSidesOption[];
  actor: SwadeActor;
}
