import type SwadeUser from '../documents/SwadeUser';
import type SwadeActor from '../documents/actor/SwadeActor';

export class UserSummary {
  element: HTMLElement;
  player: HTMLElement;
  user: SwadeUser;

  get userIsGM(): boolean {
    return this.user.isGM;
  }

  constructor(element: HTMLElement) {
    //Gather the data
    const userId = element.dataset.userId!;
    const user = game.users!.get(userId, { strict: true });
    //return early if there's not actually anything to display
    if (!user.isGM && !user.character) return;
    this.element = element;
    this.user = user;
    this.player = element.querySelector<HTMLElement>('.player-name')!;
    this.#initialize();
  }

  #initialize() {
    this.player.removeAttribute('data-tooltip');
    this.player.addEventListener('mouseenter', this.#onMouseEnter.bind(this));
    this.player.addEventListener('mouseleave', () => game.tooltip.deactivate());
  }

  async #onMouseEnter(event: MouseEvent) {
    const userId = (event.target as HTMLElement).closest<HTMLLIElement>('[data-user-id]')?.dataset.userId as string;
    const user = game.users!.get(userId, { strict: true });
    const actor = user.character as SwadeActor;
    let text = '';
    if (game.user?.isGM && user.isGM) {
      //GM hovering GM
      text = this.#getGmText();
    } else if (actor?.permission > CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
      //Player hovering Player
      text = this.#getUserText(actor);
    } else {
      return;
    }
    game.tooltip.activate(event.target as HTMLElement, {
      html: text,
      cssClass: 'swade-user-summary themed theme-dark',
    });
  }

  #getFullUsername(): string {
    const charName = this.user.character?.name;
    const suffix = this.user.isGM ? 'GM' : charName;
    return `${this.user.name} [${suffix}]`;
  }

  #getUserText(actor: SwadeActor): string {
    const html = `
    <h4 class="header">{{name}}</h4>
    <h5>{{localize "SWADE.Hindrances"}}</h5>
    <ul>
      {{#each hindrances}}
        <li>{{name}} {{#if system.isMajor}}{{localize "SWADE.Major"}}{{else}}{{localize "SWADE.Minor"}}{{/if}}</li>
      {{/each}}
    </ul>`;
    const template = Handlebars.compile(html);
    const data = {
      name: this.#getFullUsername(),
      hindrances: actor.itemTypes.hindrance,
    };
    return template(data, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true,
    });
  }

  #getGmText(): string {
    const html = `
    <h4 class="noborder">{{localize "SWADE.NpcWildCardsOnScene"}}</h4>
    {{#each wildcards}}
      {{#if tokens}}
        <h5 class="header">{{localize i18n}}</h5>
          <ul>
          {{#each tokens}}
            <li>{{name}}: {{localize "SWADE.BenniesCount" count=actor.system.bennies.value}}</li>
          {{/each}}
          </ul>
      {{/if}}
    {{/each}}`;
    const template = Handlebars.compile(html);
    const data = {
      name: this.#getFullUsername(),
      wildcards: this.#getWildCardList(),
    };
    return template(data, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true,
    });
  }

  #getWildCardList() {
    const wildcards: { i18n: string; tokens: TokenDocument[] }[] = [
      { i18n: 'TOKEN.DISPOSITION.SECRET', tokens: [] },
      { i18n: 'TOKEN.DISPOSITION.HOSTILE', tokens: [] },
      { i18n: 'TOKEN.DISPOSITION.NEUTRAL', tokens: [] },
      { i18n: 'TOKEN.DISPOSITION.FRIENDLY', tokens: [] },
    ];
    const tokens: TokenDocument[] = game.scenes?.viewed?.tokens?.contents ?? [];
    tokens
      .filter((t) => !t.actor?.hasPlayerOwner && t.actor?.isWildcard)
      .forEach((t) => {
        //disposition goes from -2 (secret) to 1 (friendly) so we add 2 to line it up with the array index
        const disposition = t['disposition'] + 2;
        wildcards[disposition].tokens.push(t);
      });
    return wildcards;
  }
}
