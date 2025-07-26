import { EquipState } from '../globals';
import { SWADE } from './config';
import { constants } from './constants';
import SwadeCombatant from './documents/combat/SwadeCombatant';
import SwadeItem from './documents/item/SwadeItem';
import { signedNumberString } from './util';

/*****************************
 * General Utility Helpers
 *****************************/

function add(a, b) {
  const result = parseInt(a) + parseInt(b);
  return signedNumberString(result);
}

function multiply(a: number, b: number) {
  return a * b;
}

function isEven(number: number): boolean {
  return number % 2 === 0;
}

function isOdd(number: number): boolean {
  return !isEven(number);
}

function signedString(num) {
  const result = parseInt(num);
  if (isNaN(result)) return '';
  return signedNumberString(result);
}

function rotate(number: number) {
  const rotationVal = (number % 5) + 2;
  if (rotationVal > 4) return 2;
  else return rotationVal;
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

function combatantColor(id: string): string | undefined {
  const fallback = 'transparent';
  const c = game.combat?.combatants.get(id) as SwadeCombatant;
  if (!c) return fallback;
  if (c.groupId) return groupColor(c.groupId);
  else if (c.isDefeated) return '#fff';
  else return groupColor(id);
}

function groupColor(id: string): string | undefined {
  const fallback = 'transparent';
  const c = game.combat?.combatants.get(id);
  if (!c) return fallback;
  const groupColor = c.getFlag('swade', 'groupColor');
  if (groupColor) return groupColor || fallback;

  if (c.players?.length) {
    return c.players[0].color;
  } else {
    return game.users.activeGM?.color;
  }
}

/*****************************
 * Embedded content related Helpers
 *****************************/

// This helper will take a system-formatted damage string and reformat it to the format used in the PEG sources.
// Right now this just removes the '@' and capitalizes and 'str' values
// aka @str+1d6 formats to Str+1d6
function formatDamage(damageStr: string) {
  return damageStr.replace('@', '').replace('str', 'Str');
}

// This helper will take in the locations property found on armor items and will return the list of locations that have armor values in a
// localized string formatted list for display
function formatArmorLocations(locations: any) {
  // Translate hit locations
  const armorLocations: string[] = [];
  const headLocation = game.i18n.localize('SWADE.Head');
  const torsoLocation = game.i18n.localize('SWADE.Torso');
  const armsLocation = game.i18n.localize('SWADE.Arms');
  const legsLocation = game.i18n.localize('SWADE.Legs');

  // Create an array of locations based on whether there are values there
  if (locations.head) armorLocations.push(headLocation);
  if (locations.torso) armorLocations.push(torsoLocation);
  if (locations.arms) armorLocations.push(armsLocation);
  if (locations.legs) armorLocations.push(legsLocation);

  // Use localized list formatting
  const formatter = game.i18n.getListFormatter({
    style: 'long',
    type: 'unit',
  });

  return formatter.format(armorLocations);
}

// This helper will take in the hindrance severity value and format it to an appropriate localized display if the value is 'either', otherwise just return
// the singular localization value represented
function formatHindranceSeverity(severity: string) {
  const minorSeverity = game.i18n.localize('SWADE.HindMinor');
  const majorSeverity = game.i18n.localize('SWADE.HindMajor');

  // If it's just minor or major, return their respective localizations.
  if (severity !== 'minor' && severity !== 'major' && severity !== 'either')
    return '';
  if (severity === 'minor') return minorSeverity;
  if (severity === 'major') return majorSeverity;

  // If it's 'either' then localize the list of both combined
  if (this.severity === 'either') {
    const formatter = game.i18n.getListFormatter({
      style: 'long',
      type: 'disjunction',
    });
    const severities = [minorSeverity, majorSeverity];
    return formatter.format(severities);
  }
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

function prepareFormRendering(path: string, options: Handlebars.HelperOptions) {
  const {
    classes,
    label,
    hint,
    rootId,
    stacked,
    units,
    widget,
    source,
    document,
    ...inputConfig
  } = options.hash;
  inputConfig.localize ??= true;
  const groupConfig = {
    label,
    hint,
    rootId,
    stacked,
    widget,
    localize: inputConfig.localize,
    units,
    classes: typeof classes === 'string' ? classes.split(' ') : [],
  };
  const doc: ClientDocument =
    document ??
    options.data.root.item ??
    options.data.root.actor ??
    options.data.root.document;
  let field: foundry.data.fields.DataField;
  if (path.startsWith('system') && 'system' in doc) {
    const splitPath = path.split('.');
    splitPath.shift();
    field = doc.system.schema.getField(splitPath.join('.'));
  } else {
    field = doc.schema.getField(path);
  }

  if (!('value' in inputConfig)) {
    inputConfig.value = foundry.utils.getProperty(
      source ? doc._source : doc,
      path,
    );
  }
  return { field, inputConfig, groupConfig };
}

function formGroupSimple(path: string, options: Handlebars.HelperOptions) {
  const { field, inputConfig, groupConfig } = prepareFormRendering(
    path.toString(),
    options,
  );
  const group = field.toFormGroup(groupConfig, inputConfig);
  return new Handlebars.SafeString(group.outerHTML);
}

function formInputSimple(path: string, options: Handlebars.HelperOptions) {
  const { field, inputConfig } = prepareFormRendering(path.toString(), options);
  const group = field.toInput(inputConfig);
  return new Handlebars.SafeString(group.outerHTML);
}

/** @internal */
export function registerCustomHelpers() {
  Handlebars.registerHelper({
    readonly: (val) => (val ? 'readonly' : ''),
    add,
    multiply,
    signedString,
    isOdd,
    isEven,
    formatNumber,
    rotate,
    isEmpty,
    collapsible,
    stringify,
    radioBoxes,
    localizeSkillAttribute,
    advanceType,
    modifier,
    canBeEquipped,
    displayEmbedded,
    capitalize,
    combatantColor,
    eachInMap,
    equipStatus,
    equipStatusLabel,
    formGroupSimple,
    formInputSimple,
    formatDamage,
    formatArmorLocations,
    formatHindranceSeverity,
  });
}
