import { EquipState } from '../globals';
import { SWADE } from './config';
import { constants } from './constants';
import SwadeItem from './documents/item/SwadeItem';

/*****************************
 * General Utility Helpers
 *****************************/

function add(a, b) {
  const result = parseInt(a) + parseInt(b);
  return result.signedString();
}

function times(a: number, b: number) {
  return a * b;
}

function signedString(num) {
  const result = parseInt(num);
  if (isNaN(result)) return '';
  return result.signedString();
}

function enrich(content: string) {
  const enriched = TextEditor.enrichHTML(content, { async: false }) as string;
  return new Handlebars.SafeString(enriched);
}

function formatNumber(num) {
  return Math.round((num + Number.EPSILON) * 1000) / 1000;
}

function capitalize(str: string) {
  return str.capitalize();
}

function isEmpty(value) {
  return Handlebars.Utils.isEmpty(value);
}

function eachInMap(map: Map<any, any>, block: Handlebars.HelperOptions) {
  let output = '';
  for (const [key, value] of map) {
    output += block.fn({ key, value });
  }
  return output;
}

function stringify(obj: any) {
  return JSON.stringify(
    Object.hasOwn(obj, 'toObject') ? obj.toObject() : obj,
    null,
    2,
  );
}

/** A replacement radioboxes helper that enables the use of numeric values */
function radioBoxes(
  name: string,
  choices: Record<string | number, string>,
  options: Handlebars.HelperOptions,
) {
  const checked = options.hash['checked'] ?? null;
  const localize = options.hash['localize'] ?? false;
  let html = '';
  for (const key in choices) {
    let label = choices[key];
    if (localize) label = game.i18n.localize(label);
    const isNumeric = Number.isNumeric(key);
    const value = isNumeric ? Number(key) : key;
    const isChecked = checked === value;
    html += `<label class="checkbox"><input type="radio" name="${name}" value="${value}" ${
      isChecked ? 'checked' : ''
    } ${isNumeric ? 'data-dtype="Number"' : ''}> ${label}</label>`;
  }
  return new Handlebars.SafeString(html);
}

/*****************************
 * Helpers for sheets
 *****************************/

function collapsible(states: Record<string, boolean>, id: string) {
  const currentlyOpen = Boolean(states[id]);
  return currentlyOpen ? 'open' : '';
}

function localizeSkillAttribute(attribute: string, useShorthand = false) {
  if (!attribute) return '';
  return game.i18n.localize(
    useShorthand
      ? SWADE.attributes[attribute].short
      : SWADE.attributes[attribute].long,
  );
}

function advanceType(type: number) {
  switch (type) {
    case constants.ADVANCE_TYPE.EDGE:
      return game.i18n.localize('SWADE.Advances.Types.Edge');
    case constants.ADVANCE_TYPE.SINGLE_SKILL:
      return game.i18n.localize('SWADE.Advances.Types.SingleSkill');
    case constants.ADVANCE_TYPE.TWO_SKILLS:
      return game.i18n.localize('SWADE.Advances.Types.TwoSkills');
    case constants.ADVANCE_TYPE.ATTRIBUTE:
      return game.i18n.localize('SWADE.Advances.Types.Attribute');
    case constants.ADVANCE_TYPE.HINDRANCE:
      return game.i18n.localize('SWADE.Advances.Types.Hindrance');
    default:
      return 'Unknown';
  }
}

function modifier(str: string) {
  str = str === '' || str === null ? '0' : str;
  const value = typeof str == 'string' ? parseInt(str) : str;
  return value == 0 ? '' : value > 0 ? ` + ${value}` : ` - ${-value}`;
}

function canBeEquipped(item: SwadeItem) {
  return item['system']['equippable'] || item['system']['isVehicular'];
}

function displayEmbedded(array: any[] = []) {
  const collection = new Map(array);
  const entities: string[] = [];
  collection.forEach((val: any, key: string) => {
    const type =
      val.type === 'ability'
        ? game.i18n.localize('SWADE.SpecialAbility')
        : game.i18n.localize(`TYPES.Item.${val.type}`);

    let majorMinor = '';
    if (val.type === 'hindrance') {
      if (val.data.major) {
        majorMinor = game.i18n.localize('SWADE.Major');
      } else {
        majorMinor = game.i18n.localize('SWADE.Minor');
      }
    }

    entities.push(
      `<li class="flexrow">
          <img src="${val.img}" alt="${type}" class="effect-icon" />
          <span class="effect-label">${type} - ${val.name} ${majorMinor}</span>
          <span class="effect-controls">
            <a class="delete-embedded" data-Id="${key}">
              <i class="fas fa-trash"></i>
            </a>
          </span>
        </li>`,
    );
  });
  return `<ul class="effects-list">${entities.join('\n')}</ul>`;
}

/*****************************
 * Combatant related Helpers
 *****************************/

function roundHeld(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  return c.roundHeld;
}

function isOnHold(combatantId: string) {
  return !!roundHeld(combatantId);
}

function isNotOnHold(combatantId: string) {
  return !isOnHold(combatantId);
}

function turnLost(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  return c.turnLost;
}

function isGroupLeader(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  return c.isGroupLeader;
}

function isInGroup(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  return c.groupId!;
}

function groupColor(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  const groupColor = c.getFlag('swade', 'groupColor');
  if (groupColor) return groupColor;

  if (c?.players?.length) {
    return c.players[0].color;
  } else {
    const gm = game.users?.find((u) => u.isGM)!;
    return gm.color;
  }
}

function leaderColor(combatantId: string) {
  const c = game.combat?.combatants.get(combatantId)!;
  return groupColor(c.groupId as string);
}

/*****************************
 * Equipment related Helpers
 *****************************/

function equipStatus(state: EquipState) {
  let icon = '';
  switch (state) {
    case constants.EQUIP_STATE.STORED:
      icon = '<i class="fas fa-archive"></i>';
      break;
    case constants.EQUIP_STATE.CARRIED:
      icon = '<i class="fas fa-shopping-bag"></i>';
      break;
    case constants.EQUIP_STATE.EQUIPPED:
      icon = '<i class="fas fa-tshirt"></i>';
      break;
    case constants.EQUIP_STATE.OFF_HAND:
      icon = '<i class="fas fa-hand-paper"></i>';
      break;
    case constants.EQUIP_STATE.MAIN_HAND:
      icon = '<i class="fas fa-hand-paper fa-flip-horizontal"></i>';
      break;
    case constants.EQUIP_STATE.TWO_HANDS:
      icon = '<i class="fas fa-sign-language"></i>';
      break;
  }
  return new Handlebars.SafeString(icon);
}

function equipStatusLabel(state: EquipState) {
  const states = {
    [constants.EQUIP_STATE.STORED]: game.i18n.localize(
      'SWADE.ItemEquipStatus.Stored',
    ),
    [constants.EQUIP_STATE.CARRIED]: game.i18n.localize(
      'SWADE.ItemEquipStatus.Carried',
    ),
    [constants.EQUIP_STATE.OFF_HAND]: game.i18n.localize(
      'SWADE.ItemEquipStatus.OffHand',
    ),
    [constants.EQUIP_STATE.EQUIPPED]: game.i18n.localize(
      'SWADE.ItemEquipStatus.Equipped',
    ),
    [constants.EQUIP_STATE.MAIN_HAND]: game.i18n.localize(
      'SWADE.ItemEquipStatus.MainHand',
    ),
    [constants.EQUIP_STATE.TWO_HANDS]: game.i18n.localize(
      'SWADE.ItemEquipStatus.TwoHands',
    ),
  };
  return new Handlebars.SafeString(states[state]);
}

/** @internal */
export function registerCustomHelpers() {
  Handlebars.registerHelper({
    add,
    signedString,
    times,
    formatNumber,
    isEmpty,
    collapsible,
    stringify,
    radioBoxes,
    localizeSkillAttribute,
    advanceType,
    modifier,
    enrich,
    canBeEquipped,
    displayEmbedded,
    capitalize,
    roundHeld,
    isOnHold,
    isNotOnHold,
    turnLost,
    isGroupLeader,
    isInGroup,
    groupColor,
    leaderColor,
    eachInMap,
    equipStatus,
    equipStatusLabel,
  });
}
