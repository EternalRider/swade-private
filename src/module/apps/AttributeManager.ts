import { DieSidesOption } from '../../globals';
import SwadeActor from '../documents/actor/SwadeActor';

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
    html.find('footer button').on('click', this.close.bind(this));
  }

  override async getData(
    options?: Partial<FormApplicationOptions>,
  ): Promise<AttributeManagerData> {
    const data: AttributeManagerData = {
      isExtra: !this.object.isWildcard,
      dieSides: this._getDieSides(),
    };
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected _getDieSides(): DieSidesOption[] {
    const options: DieSidesOption[] = [
      { key: 4, label: 'd4' },
      { key: 6, label: 'd6' },
      { key: 8, label: 'd8' },
      { key: 10, label: 'd10' },
      { key: 12, label: 'd12' },
      { key: 14, label: 'd12+1' },
      { key: 16, label: 'd12+2' },
      { key: 18, label: 'd12+3' },
      { key: 20, label: 'd12+4' },
    ];

    if (this.object.type === 'npc') {
      options.push({ key: 22, label: 'd12+5' }, { key: 24, label: 'd12+6' });
    }

    return options;
  }

  protected override async _updateObject(_event: Event, formData?: object) {
    await this.object.update(formData);
    return this.render(true);
  }
}

interface AttributeManagerData
  extends Partial<FormApplication.Data<{}, FormApplicationOptions>> {
  isExtra: boolean;
  dieSides: DieSidesOption[];
}
