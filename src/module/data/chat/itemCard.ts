import { EmptyObject } from 'fvtt-types/utils';
import { ItemActions } from '../../../globals';
import { ItemAction } from '../../../interfaces/additional.interface';
import SwadeMeasuredTemplate from '../../canvas/SwadeMeasuredTemplate';
import { constants } from '../../constants';
import type SwadeActor from '../../documents/actor/SwadeActor';
import SwadeItem from '../../documents/item/SwadeItem';

import { DamageRoll } from '../../dice/DamageRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import { Logger } from '../../Logger';
import ItemCardService from '../../models/ItemCardService';
import { VehicleData } from '../actor';

declare namespace ItemCardData {
  interface Schema extends foundry.data.fields.DataSchema {
    uuid: foundry.data.fields.DocumentUUIDField<{
      blank: false;
      required: true;
    }>;
  }
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

class ItemCardData extends foundry.abstract.TypeDataModel<
  ItemCardData.Schema,
  ChatMessage.Implementation,
  ItemCardData.BaseData,
  ItemCardData.DerivedData
> {
  static override defineSchema(): ItemCardData.Schema {
    const fields = foundry.data.fields;
    return {
      uuid: new fields.DocumentUUIDField({ blank: false, required: true }),
    };
  }

  /** A list of selectors for action button groups that should be hidden if the party seeing the message is not the author */
  static #TO_HIDE = [
    '.trait-rolls',
    '.damage-rolls',
    '.template-controls',
    '.pp-controls',
    '.arcane-device-controls',
    '.pp-counter',
    '.ammo-counter',
    '.reload-controls',
    '.benny-reroll',
    '.free-reroll',
  ];

  _item: SwadeItem | null = null;
  #handler = new ItemCardService();

  get macros(): { id: string; uuid: string }[] {
    if (!this._item) return [];
    const additionalActions: ItemActions =
      foundry.utils.getProperty(this._item, 'system.actions.additional') || {};
    return Object.entries(additionalActions)
      .filter(([_k, v]) => v.type === constants.ACTION_TYPE.MACRO)
      .map(([k, v]) => {
        return { id: k, uuid: v.uuid ?? '' };
      });
  }

  get cardActor(): SwadeActor | null {
    return this._item?.parent ?? null;
  }

  async renderHTML({
    canDelete = false,
    canClose = false,
    ..._rest
  } = {}): Promise<HTMLElement> {
    this._item = fromUuidSync(this.uuid) as SwadeItem | null;

    let content: string;
    if (!this._item) content = this._renderMissingItemHTML();
    else content = await this._renderFoundItemHTML();

    //render the message shell
    const html = await this._renderMessageShell(content, canDelete, canClose);

    //hide unused elements
    this._hideChatActionButtons(html);
    await this._hideMacroButtons(html);

    //display magazine tooltip, if necessary
    this._magazineTooltip(html);
    //attach listeners
    this._attachButtonListeners(html);
    return html;
  }

  /** Attaches listeners to the rendered HTMLElement */
  protected _attachButtonListeners(html: HTMLElement) {
    html
      .querySelectorAll<HTMLButtonElement>('button[data-action]')
      .forEach((btn) =>
        btn.addEventListener('click', (ev) =>
          this._handleButtonClick(ev, btn, html),
        ),
      );

    html
      .querySelector<HTMLElement>('.card-header .item-name')
      ?.addEventListener('click', () => {
        html
          .querySelector<HTMLElement>('.card-content')
          ?.classList.toggle('expanded');
      });
  }

  protected async _handleButtonClick(
    event: MouseEvent,
    btn: HTMLButtonElement,
    html: HTMLElement,
  ) {
    event.preventDefault();
    const actor = this._getActor();
    const action = btn.dataset.action as string;

    if (!this._item || !actor || !action) return;

    const actionObj = foundry.utils.getProperty(
      this._item,
      'system.actions.additional.' + action,
    ) as ItemAction | undefined;

    let roll: TraitRoll | DamageRoll | null = null;
    const additionalMods = this.#handler.gatherRollModifiers({
      item: this._item,
      html,
      action,
      actionObj,
    });

    switch (action) {
      case 'refresh':
        await this._refreshMessage();
        break;
      case 'template':
        SwadeMeasuredTemplate.fromPreset(btn.dataset.template!, this._item);
        break;
      case 'reload':
        await this._item.reload();
        await this._refreshMessage();
        break;
      case 'consume':
        await this._item.consume();
        await this._refreshMessage();
        break;
      case 'pp-adjust':
        await this.#handler.handlePowerPoints(this._item, actor, btn, html);
        await this._refreshMessage();
        break;
      case 'damage':
        roll = await this.#handler.handleDamageAction(
          this._item,
          actor,
          additionalMods,
        );
        break;
      case 'formula':
        roll = await this.#handler.handleFormulaAction(
          this._item,
          actor,
          additionalMods,
        );
        break;
      case 'arcane-device':
        roll = await actor.makeArcaneDeviceSkillRoll(
          foundry.utils.getProperty(this._item, 'system.arcaneSkillDie'),
        );
        break;
      default:
        // No need to call the hook here, as handleAdditionalActions already calls the hook
        // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
        roll = await this.#handler.handleAdditionalAction(
          this._item,
          actor,
          actionObj,
          action,
          additionalMods,
        );
        break;
    }

    //Only refresh the card if there is a roll and the item isn't a power
    if (roll && this._item.type !== 'power') await this._refreshMessage();
  }

  protected _getActor(action?: ItemAction): SwadeActor | null {
    let actor = this._item?.parent ?? null;

    //If the item's parent is a vehicle swap in the operator
    if (actor?.system instanceof VehicleData) {
      if (this._item.type === 'weapon') {
        actor = actor.system.getCrewMemberForWeapon(this._item) ?? null;
        if (!actor) {
          Logger.warn('Could not retrieve an assigned user for this weapon.', {
            toast: true,
          });
        }
      } else {
        actor = actor.system.operator;
      }
    }

    // "Resist" types target the actor with a currently selected token, not the
    // one that spawned the chat card. So swap that actor in.
    if (action?.type === constants.ACTION_TYPE.RESIST) {
      // swap the selected token's actor in as the target for the roll
      if (!canvas?.tokens || canvas?.tokens.controlled.length !== 1) {
        ui.notifications.warn('SWADE.NoTokenSelectedForResistRoll', {
          localize: true,
        });
        return null;
      }
      actor = canvas.tokens?.controlled[0].actor ?? actor;
    }
    return actor;
  }

  /** Remove the chat card action buttons which cannot be performed by the user */
  protected _hideChatActionButtons(html: HTMLElement) {
    const msg = this.parent;
    // If the user is the message author or the actor owner, proceed
    const actor = game.actors?.get(msg.speaker.actor ?? '');
    if (actor?.isOwner || game.user?.isGM || msg.isAuthor) return;

    // Otherwise conceal all action button sections except for
    // resistance rolls (which can be rolled by other actors as a defense)
    for (const selector of ItemCardData.#TO_HIDE) {
      html.querySelectorAll<HTMLElement>(selector).forEach((e) => e.remove());
    }
  }

  protected _magazineTooltip(html: HTMLElement) {
    const magazine = html.querySelector<HTMLElement>(
      '.swade.chat-card .magazine',
    );

    magazine?.addEventListener('mouseenter', async () => {
      const loadedAmmo = this._item?.getFlag('swade', 'loadedAmmo');

      const enriched = loadedAmmo
        ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            `<h4>${loadedAmmo?.name}</h4>${loadedAmmo?.system!.description ?? ''}`,
            {
              relativeTo: this._item,
              rollData: this._item?.getRollData() ?? {},
              secrets: this._item?.isOwner,
            },
          )
        : game.i18n.localize('SWADE.Magazine.NoneLoaded');

      const content = foundry.utils.parseHTML('<span>' + enriched + '</span>');

      game.tooltip.activate(magazine, {
        html: content as HTMLElement,
        cssClass: 'themed theme-dark',
      });
    });
  }

  /** Hide macros if the user can't execute them */
  protected async _hideMacroButtons(html: HTMLElement) {
    let hiddenCounter = 0;
    for (const macro of this.macros) {
      const doc = (await fromUuid(macro.uuid)) as Macro | null;
      if (doc?.canExecute) continue;
      html
        .querySelectorAll<HTMLButtonElement>(
          `button[data-action="${macro.id}"]`,
        )
        .forEach((btn) => {
          btn.remove();
          hiddenCounter++;
        });
    }
    const macroButtonsTotal = html.querySelectorAll<HTMLButtonElement>(
      '.card-buttons.macros button',
    ).length;
    //if all macros have been hidden, then also hide the header
    if (macroButtonsTotal <= hiddenCounter) {
      html.querySelector<HTMLElement>('.card-buttons.macros')?.remove();
    }
  }

  protected async _renderFoundItemHTML(): Promise<string> {
    const data = await this._item!.getChatData();
    return foundry.applications.handlebars.renderTemplate(
      'systems/swade/templates/chat/item-card.hbs',
      data,
    ) as Promise<string>;
  }

  protected _renderMissingItemHTML(): string {
    return `<p>Item with UUID <code>${this.uuid}</code> could not be found</p>`;
  }

  protected _getBaseMessageData(
    canDelete: boolean,
    canClose: boolean,
  ): ChatMessage.MessageData {
    const isWhisper = !!this.parent.whisper.length;

    // Construct message data
    const messageData: ChatMessage.MessageData = {
      canDelete,
      canClose,
      message: this.parent.toObject(false),
      user: game.user,
      author: this.parent.author,
      alias: this.parent.alias,
      cssClass: [
        this.parent.style === CONST.CHAT_MESSAGE_STYLES.IC ? 'ic' : null,
        this.parent.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? 'emote' : null,
        this.parent.blind ? 'blind' : null,
        isWhisper ? 'whisper' : null,
      ].filterJoin(' '),
      isWhisper,
      whisperTo: this.parent.whisper
        .map((u) => game.users.get(u)?.name)
        .filterJoin(', '),
    };
    return messageData;
  }

  /** Create a standard foundry message shell */
  protected async _renderMessageShell(
    content: string,
    canDelete: boolean,
    canClose: boolean,
  ): Promise<HTMLElement> {
    const messageData = this._getBaseMessageData(canDelete, canClose);
    messageData.message.content = content;
    const template = await foundry.applications.handlebars.renderTemplate(
      CONFIG.ChatMessage.template,
      messageData,
    );
    return foundry.utils.parseHTML(template) as HTMLElement;
  }

  protected async _refreshMessage() {
    await ui.chat.updateMessage(this.parent, false);
  }
}

export { ItemCardData };
