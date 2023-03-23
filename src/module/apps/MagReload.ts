import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import * as util from '../../util';

/***** 

WIP File

*****/

export default class MagReload extends FormApplication<
  FormApplicationOptions,
  object,
  ReloadContext
> {
  #callback: (roll: SwadeRoll | null) => void;
  #isResolved = false;
  
  static asPromise(ctx: ReloadContext): Promise<SwadeItem | null> {
    return new Promise((resolve) => new RollDialog(ctx, resolve));
  }
      
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/magreload.hbs',
      classes: ['swade', 'magreload', 'swade-app'],
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
    ctx: MagReloadContext,
    resolve: (roll: SwadeItem | null) => void,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(ctx, options);
    this.#callback = resolve;
    this.render(true);
  }

  get ctx() {
    return this.object;
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback(null);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  #resolve(roll: SwadeRoll) {
    this.#isResolved = true;
    this.#callback(roll);
    this.close();
  }
}

interface MagReloadContext {
  item: SwadeItem;
  actor: SwadeActor;
  title: String;
}