import { CompendiumTOC } from './CompendiumTOC';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CompendiumTOCSettings extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  #blockList: Record<string, boolean>;

  constructor(options) {
    super(options);
    this.#blockList = game.settings.get('swade', 'tocBlockList');
  }

  static override DEFAULT_OPTIONS = {
    id: 'compendiumTOCSettings',
    window: {
      title: 'SWADE.TOCSettings.Name',
    },
    tag: 'form',
    position: {
      width: 500,
      height: 600,
    },
    classes: ['swade-application', 'swade', 'toc-settings', 'standard-form'],
    form: {
      handler: CompendiumTOCSettings.onSubmit,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    },
  };

  static override PARTS = {
    main: {
      template: 'systems/swade/templates/apps/compendium-toc-settings.hbs',
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  get blockList() {
    return this.#blockList;
  }

  override async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.buttons = [
      { type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' }, // TODO: localize
    ];
    const packs = game.packs.filter((p) =>
      CompendiumTOC.ALLOWED_TYPES.includes(p.metadata.type)
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

    context.blockList = packsByType;
    return context;
  }

  static async onSubmit(
    _event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ) {
    if (!game.user?.isGM) return;
    // invert the values
    const dataObj = formData.object;
    for (const pack in dataObj) {
      dataObj[pack] = !dataObj[pack];
    }
    await game.settings.set('swade', 'tocBlockList', dataObj);
    game.socket?.emit('reload');
    foundry.utils.debouncedReload();
  }
}
