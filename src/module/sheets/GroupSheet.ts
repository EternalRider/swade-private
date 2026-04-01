import { DeepPartial } from 'fvtt-types/utils';
import { PhysicalItem, SwadeApplicationTab, SwadeDocumentSheetConfiguration } from '../../globals';
import { Logger } from '../Logger';
import { constants } from '../constants';
import { GroupMember } from '../data/actor/group';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { hotReloadActorSheet } from '../hmr';
import { mapRange } from '../util';
import { SwadeActorSheetV2 } from './SwadeActorSheetV2';
import { SwadeBaseSheetMixin } from './SwadeBaseSheetMixin';

export class GroupSheet extends SwadeActorSheetV2<GroupSheetRenderContext> {
  declare actor: SwadeActor<'group'>;
  static override DEFAULT_OPTIONS: DeepPartial<SwadeDocumentSheetConfiguration<SwadeActor<'group'>>> = {
    classes: ['group', 'standard-form'],
    position: { height: 700, width: 700 },
    window: { resizable: true },
    actions: {
      deleteMember: GroupSheet.deleteMember,
      openMember: GroupSheet.openMember,
      showMemberImage: GroupSheet.showMemberImage,
      toggleLock: GroupSheet.toggleLock,
    },
  };

  static override PARTS = {
    header: { template: 'systems/swade/templates/actors/group/header.hbs' },
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    stash: { template: 'systems/swade/templates/actors/group/tab-stash.hbs' },
    members: {
      template: 'systems/swade/templates/actors/group/tab-members.hbs',
    },
    supplies: {
      template: 'systems/swade/templates/actors/group/tab-supplies.hbs',
    },
    description: {
      template: 'systems/swade/templates/actors/group/tab-description.hbs',
    },
  };

  static override TABS: Record<string, Partial<SwadeApplicationTab>> = {
    members: {
      id: 'members',
      group: 'primary',
      label: 'SWADE.Group.Sheet.Members.Header',
    },
    stash: {
      id: 'stash',
      group: 'primary',
      label: 'SWADE.Group.Sheet.Stash.Header',
    },
    supplies: {
      id: 'supplies',
      group: 'primary',
      label: 'SWADE.Supplies.Label',
    },
    description: { id: 'description', group: 'primary', label: 'SWADE.Desc' },
  };

  static async deleteMember(this: GroupSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest<HTMLElement>('[data-member-uuid]')?.dataset.memberUuid;
    if (!id) return;
    if (!this.actor.system.members.has(id)) return;
    const existing = Array.from(this.actor.system.members.keys()).map((v) => v.toString());
    const index = existing.indexOf(id);
    if (index < 0) return;
    const member = this.actor.system.members.get(id)?.actor;
    const name = member ? member.name : id;
    const type = game.i18n.localize('DOCUMENT.Actor');
    const proceed = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      window: {
        title: `${game.i18n.format('DOCUMENT.Delete', { type })}: ${name}`,
      },
      content: `<h3>${game.i18n.localize('AreYouSure')}</h3><p>${game.i18n.format('SWADE.DeleteFromParentWarning', { name, parent: this.actor.name })}</p>`,
    });
    if (!proceed) return;
    existing.splice(index, 1);
    await this.actor.update({ 'system.members': existing });
  }

  static openMember(this: GroupSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest<HTMLElement>('[data-member-uuid]')?.dataset.memberUuid;
    if (!id) return;
    this.actor.system.members.get(id)?.actor?.sheet?.render({ force: true });
  }

  static showMemberImage(this: GroupSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest<HTMLElement>('[data-member-uuid]')?.dataset.memberUuid;
    if (!id) return;
    const actor = this.actor.system.members.get(id)?.actor;
    if (!actor) return;
    new foundry.applications.apps.ImagePopout({
      src: actor.img,
      shareable: actor.isOwner ?? game.user?.isGM,
      uuid: actor.uuid,
      window: { title: actor.name },
    }).render({ force: true });
  }

  static toggleLock(this: GroupSheet, _event: PointerEvent, _target: HTMLElement) {
    if (!game.user!.isGM) return;
    this.actor.update({ 'system.locked': !this.actor.system.locked });
  }

  override tabGroups = {
    primary: 'members',
  };

  override async _prepareContext(options: any) {
    const baseContext = await super._prepareContext(options);

    const settingrules = {
      wealthType: game.settings.get('swade', 'wealthType'),
      currencyName: game.settings.get('swade', 'currencyName'),
    };

    return foundry.utils.mergeObject(baseContext, {
      members: this._prepareMembers(),
      itemTypes: await this._prepareItems(),
      benny: game.settings.get('swade', 'bennyImageSheet'),
      unlocked: !this.actor.system.locked,
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.description, {
        rollData: this.actor.getRollData(),
        secrets: this.isEditable,
      }),
      settingrules, // Add the setting rules here
    });
  }

  protected override async _onFirstRender(
    context: GroupSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheetV2.RenderOptions>
  ) {
    await super._onFirstRender(context, options);
    for (const member of this.actor.system.members.values()) {
      if (!member.actor) continue;
      member.actor.apps[this.id] = this;
    }
  }

  protected override async _onRender(
    context: GroupSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheetV2.RenderOptions>
  ) {
    await super._onRender(context, options);
    if (this.actor.system.locked) this.element.classList.add('locked');
    else this.element.classList.remove('locked');
  }

  protected override _syncPartState(
    partId: string,
    newElement: HTMLElement,
    priorElement: HTMLElement,
    state: GroupSheet.PartState
  ) {
    super._syncPartState(partId, newElement, priorElement, state);
    switch (partId) {
      case 'members': {
        const members = newElement.querySelectorAll<HTMLLIElement>('.member');
        for (const member of members) {
          const uuid = member.dataset.memberUuid!;
          const selector = `.member[data-member-uuid="${uuid}"] .wounds`;
          const oldBar = priorElement.querySelector<HTMLElement>(selector);
          const newBar = member.querySelector<HTMLElement>('.wounds');

          const oldBackground = oldBar?.style.getPropertyValue('--_background');
          const newBackground = newBar?.style?.getPropertyValue('--_background');

          const oldColor = oldBar?.style?.getPropertyValue('--_wounds-color');
          const newColor = newBar?.style?.getPropertyValue('--_wounds-color');

          const frames: Keyframe[] = [
            { background: oldBackground, color: oldColor },
            { background: newBackground, color: newColor },
          ];
          newBar?.animate(frames, { duration: 250, easing: 'ease-in-out' });
        }
        break;
      }
    }
  }

  protected override _onClose(_options: unknown) {
    for (const member of this.actor.system.members.values()) {
      if (!member.actor) continue;
      delete member.actor.apps[this.id];
    }
  }

  protected async _prepareItems(): Promise<ItemTypes> {
    const items = Object.fromEntries<RenderedItem[]>(
      constants.PHYSICAL_ITEMS.map((t: PhysicalItem) => [t, []])
    ) as ItemTypes;

    for (const type of constants.PHYSICAL_ITEMS) {
      for (const item of this.actor.itemTypes[type] as SwadeItem<PhysicalItem>[]) {
        items[type].push({
          name: item.name as string,
          id: item.id as string,
          img: item.img as string,
          quantity: item.system.quantity as number,
          description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
            secrets: this.isEditable,
          }),
        });
      }
    }

    return items;
  }

  protected _prepareMembers(): RenderedMember[] {
    const members: RenderedMember[] = [];
    const systemMembers = this.actor.system.members as Map<string, GroupMember>;
    const redHueThreshold = 20;
    for (const [uuid, member] of systemMembers.entries()) {
      const wounds = member.actor?.system?.wounds;
      const background = SwadeActor.getWoundsColor(wounds?.value ?? 1, wounds?.max ?? 1);
      const actor = member.actor;
      members.push({
        uuid,
        cssClass: actor ? '' : 'broken',
        name: actor?.name ?? game.i18n.localize('Unknown'),
        img: actor?.img ?? '/icons/svg/mystery-man.svg',
        profile: member.actor
          ? [
              actor?.system?.advances?.rank,
              actor?.ancestry?.name ?? actor?.system.details?.species.name,
              actor?.archetype?.name ?? actor?.system?.details?.archetype,
            ]
              .filter(Boolean)
              .join(' ')
          : uuid,
        toughness: actor?.system.stats?.toughness?.value ?? NaN,
        armor: actor?.armorPerLocation.torso ?? NaN,
        pace: actor?.system.pace.default ?? NaN,
        parry: actor?.system.stats?.parry?.value ?? NaN,
        bennies: actor?.bennies ?? NaN,
        wounds: {
          max: wounds?.max ?? NaN,
          value: wounds?.value ?? NaN,
          background: background.toRGBA(0.8),
          color:
            mapRange(background.hsv[0], 0, 1, 0, 360) <= redHueThreshold
              ? 'var(--color-light-2)'
              : 'var(--color-dark-2)',
        },
      });
    }
    return members;
  }

  protected override async _onDropActor(_event: DragEvent, data: object): Promise<object | boolean> {
    if (!this.actor.isOwner || this.actor.system.locked) return false;
    const actor = await getDocumentClass('Actor').fromDropData(data);
    if (actor.type === 'group' || actor.type === 'vehicle') {
      Logger.warn(`You cannot add ${game.i18n.localize('TYPES.Actor.' + actor.type)} Actors to a group!`, {
        toast: true,
        localize: true,
      });
      return false;
    }
    await this.actor.update({
      'system.members': [...this.actor.system._source.members, actor.uuid],
    });
    return true;
  }
}

interface GroupSheetRenderContext extends SwadeActorSheetV2.RenderContext {
  members: SwadeActor[];
  itemTypes: SwadeItem[];
  benny: string;
  unlocked: boolean;
  description: string;
}

type ItemTypes = Record<PhysicalItem, RenderedItem[]>;

interface RenderedItem {
  id: string;
  name: string;
  img: string;
  quantity: number;
  description: string;
}

interface RenderedMember {
  uuid: string;
  name: string;
  img: string;
  profile: string;
  toughness: number;
  armor: number;
  pace: number;
  parry: number;
  bennies: number;
  wounds: {
    value: number;
    max: number;
    background: string;
    color: string;
  };
  cssClass?: string;
}

declare namespace GroupSheet {
  interface PartState extends SwadeBaseSheetMixin.PartState {}
}

if (import.meta.hot) {
  import.meta.hot.accept(hotReloadActorSheet('group', 'GroupSheet'));
}
