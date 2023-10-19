import { Advance } from '../../interfaces/Advance.interface';
import { constants } from '../constants';
import SwadeActor from '../documents/actor/SwadeActor';
import { getRankFromAdvanceAsString } from '../util';

export class AdvanceEditor extends FormApplication<
  FormApplicationOptions,
  AdvanceEditorContext
> {
  constructor({ advance, actor }: AdvanceEditorContext, options = {}) {
    super({ advance, actor }, options);
    if (actor.type !== 'character' && actor.type !== 'npc') {
      throw TypeError(`Actor type ${actor.type} not permissible`);
    }
  }

  get ctx() {
    return this.object;
  }

  get actor() {
    return this.object.actor;
  }

  get advance() {
    return this.object.advance;
  }

  get advances() {
    return foundry.utils.getProperty(
      this.actor,
      'system.advances.list',
    ) as Collection<Advance>;
  }

  static get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/advanceEditor.hbs',
      title: game.i18n.localize('SWADE.Advances.EditorTitle'),
      classes: ['swade', 'advance-editor', 'swade-app'],
      width: 420,
      height: 'auto' as const,
      submitOnClose: false,
      closeOnSubmit: false,
      submitOnChange: false,
    });
  }

  override activateListeners(jquery: JQuery<HTMLFormElement>): void {
    super.activateListeners(jquery);
    const html = jquery[0];

    html.querySelector('footer .close')?.addEventListener('click', async () => {
      await this.submit();
      this.close();
    });
  }

  override async getData(
    options?: Partial<FormApplicationOptions>,
  ): Promise<any> {
    return foundry.utils.mergeObject(await super.getData(options), {
      advance: this.advance,
      rank: getRankFromAdvanceAsString(this.advance.sort ?? 0),
      advanceTypes: this.#getAdvanceTypes(),
      owner: this.actor.isOwner,
      notes: await TextEditor.enrichHTML(this.advance.notes, {
        async: true,
        secrets: this.actor.isOwner,
      }),
    });
  }

  protected override async _updateObject(
    _event: Event,
    formData: any,
  ): Promise<unknown> {
    const expanded = foundry.utils.expandObject(formData);
    const sortHasChanged = expanded.sort !== this.advance.sort;
    //merge data to update
    const advance: Advance = foundry.utils.mergeObject(this.advance, {
      notes: expanded.advance.notes,
      planned: expanded.planned,
      type: expanded.type,
      sort: Math.clamped(expanded.sort, 1, this.advances.size),
    });
    if (sortHasChanged) return this.#handleSortingChange(advance);
    //normal update operation
    this.advances.set(advance.id, advance);
    return this.ctx.actor.update(
      { 'system.advances.list': this.advances.toJSON() },
      { diff: false },
    );
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

export interface AdvanceEditorContext {
  advance: Advance;
  actor: SwadeActor;
}

export interface AdvanceEditorOptions extends FormApplicationOptions {}
