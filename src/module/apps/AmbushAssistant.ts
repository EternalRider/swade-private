import type SwadeCombat from '../documents/combat/SwadeCombat';
import type SwadeCombatant from '../documents/combat/SwadeCombatant';

export class AmbushAssistant extends Application {
  #combat: SwadeCombat;
  #categories = {
    unassigned: new Array<SwadeCombatant>(),
    hold: new Array<SwadeCombatant>(),
    draw: new Array<SwadeCombatant>(),
    noTurn: new Array<SwadeCombatant>(),
  };

  static override get defaultOptions(): Application.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ambush-assistant',
      title: game.i18n.localize('SWADE.AmbushAssistant.Title'),
      classes: ['swade-app', 'ambush-assistant'],
      template: 'systems/swade/templates/apps/ambush-assistant.hbs',
      dragDrop: [{ dragSelector: '.combatant', dropSelector: '.column' }],
      width: 800,
      height: 500,
    } satisfies Partial<Application.Options>);
  }

  constructor(combat: SwadeCombat, options?: Application.Options) {
    super(options);
    this.#combat = combat;
    this.#categories.unassigned = combat.combatants.contents.filter(
      (c) => !c.groupId,
    ) as SwadeCombatant[];
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    const html = jquery[0];

    html.querySelectorAll<HTMLElement>('.column').forEach((e) => {
      e.addEventListener('dragenter', this._onDragEnter.bind(this));
      e.addEventListener('dragleave', this._onDragLeave.bind(this));
    });

    html
      .querySelector('button[type="submit"]')
      ?.addEventListener('click', this.submit.bind(this));
  }

  override async getData(options?: Partial<Application.Options>) {
    return foundry.utils.mergeObject(await super.getData(options), {
      ...this.#categories,
      submissionLocked: this.#categories.unassigned.length !== 0,
    });
  }

  async submit() {
    for (const noTurn of this.#categories.noTurn) {
      await Promise.all([
        noTurn.setTurnLost(true),
        ...noTurn.followers.map((f) => f.setTurnLost(true)),
      ]);
    }
    await this.#combat.startCombat();
    let initiative = 1000;
    for (const hold of this.#categories.hold) {
      await Promise.all([
        hold.toggleHold(),
        ...hold.followers.map((f) => f.toggleHold()),
      ]);
      await Promise.all([
        hold.setRoundHeld(0.1),
        ...hold.followers.map((f) => f.setRoundHeld(0.1)),
      ]);
      await hold.update({ initiative: (initiative -= 1) });
      // Need each of them to be offset by a small decrement for properly placing interruptors.
      for (const f of hold.followers) {
        await f.update({ initiative: (initiative -= 0.01) });
      }
    }
    await this.close();
  }

  protected override _onDrop(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;

    target.classList.remove('drag-highlight');

    const { id, category } = JSON.parse(
      event.dataTransfer!.getData('text/plain'),
    ) as AmbushDropData;
    const targetCategory = target.closest<HTMLElement>('.column')?.dataset
      .category as string;

    if (category === targetCategory) return;

    const combatant = this.#categories[category].findSplice((c) => c.id === id);
    if (!combatant) throw new Error();
    this.#categories[targetCategory].push(combatant);
    this.render(true);
  }

  protected override _onDragStart(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    const id = target.dataset.combatantId;
    const category = target.closest<HTMLElement>('.column')?.dataset.category;
    event.dataTransfer?.setData('text/plain', JSON.stringify({ id, category }));
  }

  protected _onDragLeave(event: DragEvent) {
    (event.currentTarget as HTMLElement).classList.remove('drag-highlight');
  }

  protected _onDragEnter(event: DragEvent) {
    (event.currentTarget as HTMLElement).classList.add('drag-highlight');
  }
}

interface AmbushDropData {
  id: string;
  category: 'unassigned' | 'hold' | 'draw' | 'noTurn';
}
