import { CompendiumTOC } from './CompendiumTOC';

export default class CompendiumTOCSettings extends FormApplication<
  FormApplicationOptions,
  Record<string, boolean>
> {
  constructor(options?: FormApplicationOptions) {
    super(game.settings.get('swade', 'tocBlockList'), options);
  }

  static override get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'compendiumTOCSettings',
      title: 'SWADE.TOCSettings.Name',
      template: 'systems/swade/templates/apps/compendium-toc-settings.hbs',
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      classes: ['swade-app', 'swade', 'toc-settings'],
      width: 500,
      height: 600,
    });
  }

  get blockList() {
    return this.object;
  }

  override async getData(options?: Partial<FormApplicationOptions>) {
    const packs = game.packs.filter((p) =>
      CompendiumTOC.ALLOWED_TYPES.includes(p.metadata.type),
    );

    const packsByType: Record<string, unknown[]> = {};
    for (const pack of packs) {
      const type = pack.metadata.type;
      if (!packsByType[type]) {
        packsByType[type] = [];
      }
      packsByType[type].push({
        label: pack.metadata.label,
        collection: pack.collection,
        inUse: !this.blockList[pack.collection],
      });
    }

    return foundry.utils.mergeObject(await super.getData(options), {
      blockList: packsByType,
    });
  }

  protected override async _updateObject(
    _event: Event,
    formData: Record<string, boolean>,
  ): Promise<void> {
    if (!game.user?.isGM) return;
    //invert the values
    for (const pack in formData) {
      formData[pack] = !formData[pack];
    }
    await game.settings.set('swade', 'tocBlockList', formData);
    game.socket?.emit('reload');
    foundry.utils.debouncedReload();
  }
}
