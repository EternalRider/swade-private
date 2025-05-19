import { Advance } from '../../interfaces/Advance.interface';
import { constants } from '../constants';
import SwadeActor from '../documents/actor/SwadeActor';
import { getRankFromAdvanceAsString } from '../util';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AdvanceEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ advance, actor, ...options }: AdvanceEditorConfiguration) {
    super(options);
    if (actor.type !== 'character' && actor.type !== 'npc') {
      throw TypeError(`Actor type ${actor.type} not permissible`);
    }
    this.#actor = actor;
    this.#advance = advance;
  }

  #actor: SwadeActor
  #advance: Advance

  get actor() {
    return this.#actor;
  }

  get advance() {
    return this.#advance;
  }

  get advances() {
    return foundry.utils.getProperty(
      this.actor,
      'system.advances.list',
    ) as Collection<Advance>;
  }

  // TODO: remove once swade-application
  protected override _initializeApplicationOptions(options) {
    if (!options.classes?.includes('themed')) {
      options.classes ??= [];
      options.classes.push('themed', 'theme-light');
    }
    return super._initializeApplicationOptions(options);
  }

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE.Advances.EditorTitle'
    },
    position: {
      width: 420,
      height: 'auto'
    },
    // TODO: swade-app -> swade-application
    classes: ['swade', 'advance-editor', 'swade-app', 'standard-form'],
    tag: 'form',
    form: {
      handler: AdvanceEditor.onSubmit,
      submitOnClose: false,
      closeOnSubmit: false,
      submitOnChange: false,
    }
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/advanceEditor.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  };

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(await super._prepareContext(options), {
      advance: this.advance,
      rank: getRankFromAdvanceAsString(this.advance.sort ?? 0),
      advanceTypes: this.#getAdvanceTypes(),
      owner: this.actor.isOwner,
      notes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.advance.notes, {
        async: true,
        secrets: this.actor.isOwner,
      }),
      buttons: [
        { type: 'submit', icon: 'fa-solid fa-floppy-disk', label: 'Save Changes'}
      ]
    });
    return context;
  }

  static async onSubmit(
    this: AdvanceEditor,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ) {
    const expanded = foundry.utils.expandObject(formData.object);
    const sortHasChanged = expanded.sort !== this.advance.sort;
    // Merge data to update
    const advance: Advance = foundry.utils.mergeObject(this.advance, {
      notes: expanded.advance.notes,
      planned: expanded.planned,
      type: expanded.type,
      sort: Math.clamp(expanded.sort, 1, this.advances.size),
    });
    if (sortHasChanged) return this.#handleSortingChange(advance);
    // Normal update operation
    this.advances.set(advance.id, advance);
    await this.actor.update(
      { 'system.advances.list': this.advances.toJSON() },
      { diff: false },
    );
    await this.render({ force: true });
    if (event.submitter) this.close();
  }

  #getAdvanceTypes(): Record<number, string> {
    return {
      [constants.ADVANCE_TYPE.EDGE]: 'SWADE.Advances.Types.Edge',
      [constants.ADVANCE_TYPE.SINGLE_SKILL]: 'SWADE.Advances.Types.SingleSkill',
      [constants.ADVANCE_TYPE.TWO_SKILLS]: 'SWADE.Advances.Types.TwoSkills',
      [constants.ADVANCE_TYPE.ATTRIBUTE]: 'SWADE.Advances.Types.Attribute',
      [constants.ADVANCE_TYPE.HINDRANCE]: 'SWADE.Advances.Types.Hindrance',
    };
  }

  #handleSortingChange(advance: Advance) {
    //remove the old advance
    if (this.advances.has(advance.id)) this.advances.delete(advance.id);
    const arr = this.advances.toJSON();
    //calculate new index
    const newIndex = Math.max(0, advance.sort - 1);
    //insert new advance into array
    arr.splice(newIndex, 0, advance);
    //update sort values based on index
    arr.forEach((a, i) => (a.sort = i + 1));
    //yeet
    return this.actor.update({ 'system.advances.list': arr }, { diff: false });
  }
}

export interface AdvanceEditorConfiguration extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  advance: Advance;
  actor: SwadeActor;
}
