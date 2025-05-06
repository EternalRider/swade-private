import { DieSidesOption } from '../../globals';
import SwadeActor from '../documents/actor/SwadeActor';
import { getDieSidesRange } from '../util';

export default class AttributeManager extends FormApplication<
  FormApplicationOptions,
  SwadeActor
> {
  constructor(actor: SwadeActor, options?: FormApplicationOptions) {
    if (!(actor instanceof Actor)) throw new Error('Not an Actor!');
    super(actor, options);
  }

  static override get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/attribute-manager.hbs',
      classes: ['swade', 'attribute-manager', 'swade-app'],
      resizable: false,
      submitOnClose: false,
      submitOnChange: true,
      closeOnSubmit: false,
      width: 600,
      height: 'auto' as const,
    });
  }

  override get id(): string {
    return `${this.object.id}-attributeManager`;
  }

  override get title(): string {
    return game.i18n.format('SWADE.AttributeManager.Title', {
      name: this.object.name,
    });
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html[0]
      .querySelector('footer button')
      ?.addEventListener('click', this.close.bind(this));
  }

  override async getData(
    options?: Partial<FormApplicationOptions>,
  ): Promise<AttributeManagerData> {
    const data: AttributeManagerData = {
      isExtra: !this.object.isWildcard,
      dieSides:
        this.object.type === 'character'
          ? getDieSidesRange(4, 20)
          : getDieSidesRange(4, 24),
      wildDieSides: getDieSidesRange(4, 12),
      dieSidesWithMinimum:
        this.object.type === 'character'
          ? getDieSidesRange(1, 20)
          : getDieSidesRange(1, 24),
    };
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected override async _updateObject(_event: Event, formData?: object) {
    await this.object.update(formData);
    return this.render(true);
  }
}

interface AttributeManagerData
  extends Partial<FormApplication.Data<{}, FormApplicationOptions>> {
  isExtra: boolean;
  isVehicle: boolean;
  dieSides: DieSidesOption[];
  wildDieSides: DieSidesOption[];
  dieSidesWithMinimum: DieSidesOption[];
}
