import { Attribute } from '../globals';
import { RollModifier } from '../interfaces/additional.interface';
import { RollDialog } from './apps/RollDialog';
import { DamageRoll } from './dice/DamageRoll';
import SwadeActor from './documents/actor/SwadeActor';
import { chunkArray } from './util';

export function registerEnrichers() {
  const toEnrich = ['d', 'damage', 't', 'trait'];

  CONFIG.TextEditor.enrichers.push({
    pattern: new RegExp(`\\[\\[/(?<type>${toEnrich.join('|')})(?<config> .*?)?]](?!])(?:{(?<label>[^}]+)})?`, 'gi'),
    enricher,
  });

  document.body.addEventListener('click', rollDamage);
  document.body.addEventListener('click', rollTrait);
}

export function processFormula(formula: string, type: 'damage' | 'trait', actor?: SwadeActor | null): ProcessedFormula {
  formula = formula.replace(/([+-])/g, ' $1 ').trim(); //add extra spaces around every operator, then trim excess
  const rollData = actor?.getRollData(false) ?? {};
  const terms = foundry.dice.Roll.parse(formula, rollData);
  let firstTerm: foundry.dice.terms.RollTerm | null = terms[0];
  const remainingTerms = terms.toSpliced(0, 1);
  formula = firstTerm.formula;
  if (firstTerm instanceof foundry.dice.terms.NumericTerm) {
    firstTerm = new foundry.dice.terms.Die({ faces: firstTerm.number });
  }

  if (type === 'trait' && firstTerm instanceof foundry.dice.terms.Die) {
    if (!firstTerm.modifiers.includes('x')) firstTerm.modifiers.push('x');

    let expression = `{${firstTerm.expression}[${firstTerm.flavor || game.i18n.localize('SWADE.Die')}]`;
    if (actor?.isWildcard) expression += ',1dw}kh';
    else expression += '}';

    firstTerm = foundry.dice.terms.PoolTerm.fromExpression(expression)!;
    const newTerms = [firstTerm, ...remainingTerms];
    const newRoll = foundry.dice.Roll.fromTerms(newTerms);
    formula = newRoll.formula;
  }
  const mods: RollModifier[] = chunkArray(remainingTerms).map(([operator, number]) => {
    return {
      label: number.flavor || game.i18n.localize('SWADE.Addi'),
      value: operator.expression.trim() + number.expression.trim(),
    };
  });
  return { formula, mods };
}

const diceIcon = '<i class="fa-solid fa-image-portrait" inert></i>';
const damageIcon = '<i class="fa-solid fa-house-flood-water" inert></i>';

const enricher: foundry.applications.ux.TextEditor.Enricher = async function (match) {
  if (!match.groups) return null;
  const { type, config, label } = match.groups;

  const parsed = parseConfig(config, type, label);
  if (!parsed) return null;

  switch (type.toLowerCase()) {
    case 'damage':
    case 'd':
      return enrichDamage(parsed, label);
    case 'trait':
    case 't':
      return enrichTrait(parsed, label);
    default:
      throw new Error();
  }
};

async function enrichDamage(config: ParsedConfig, label: string): Promise<HTMLElement | null> {
  const anchor = document.createElement('a');
  anchor.classList.add('swade-inline-roll', 'damage');
  config.forEach((i) => anchor.setAttribute('data-' + i.type, i.value));
  anchor.innerHTML = damageIcon + ' ' + (label || config[0].value);
  anchor.setAttribute('data-flavor', label || config[0].value);
  return anchor;
}

async function enrichTrait(config: ParsedConfig, label: string): Promise<HTMLElement | null> {
  const anchor = document.createElement('a');
  anchor.classList.add('swade-inline-roll', 'trait');
  config.forEach((i) => anchor.setAttribute('data-' + i.type, i.value));
  anchor.innerHTML = diceIcon + ' ' + (label || config[0].value);
  return anchor;
}

async function rollTrait(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('a.swade-inline-roll.trait')) return;
  event.preventDefault();
  const formula = target.dataset.formula;
  if (!formula) return;
  const [type, command] = formula.split('.');
  const match = command.match(/^[a-zA-Z0-9]+/); //get the cleaned command ;
  if (!match) return;
  const actor = canvas?.tokens?.controlled[0]?.document?.actor || game.user.character;
  const trait = match[0];
  const { mods } = processFormula(formula, 'trait', actor);
  if (type === '@skill') {
    const skill = actor?.getSingleItemBySwid(trait, 'skill');
    await skill?.roll({ additionalMods: mods });
  } else if (type === '@attribute') {
    await actor?.rollAttribute(trait as Attribute, {
      additionalMods: mods,
    });
  }
}

async function rollDamage(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('a.swade-inline-roll.damage')) return;
  event.preventDefault();
  const dataset = target.dataset;
  const baseFormula = dataset.formula;
  if (!baseFormula) return;
  const actor = canvas?.tokens?.controlled[0]?.document?.actor || game.user.character;
  if (!actor) return;
  const speaker = CONFIG.ChatMessage.documentClass.getSpeaker({ actor });
  const { formula, mods } = processFormula(baseFormula, 'damage', actor);
  const roll = new DamageRoll(formula);
  const flavor =
    dataset.flavor !== formula ? dataset.flavor || game.i18n.localize('SWADE.Dmg') : game.i18n.localize('SWADE.Dmg');
  const title = flavor;
  await RollDialog.asPromise({
    roll,
    mods,
    actor,
    speaker,
    flavor,
    title,
  });
}

function parseConfig(config: string, type: string, label?: string): ParsedConfig | undefined {
  config = config.trim();
  let pattern = /@[^ ]+/; //default behavior trait
  const isDamage = ['d', 'damage'].includes(type);
  const isTrait = ['t', 'trait'].includes(type);
  if (isDamage) pattern = /[^ ]+/;
  const match = config.match(pattern);
  if (!match) return;
  const formula = match[0];
  if (!formula) return;
  const rest = config.slice(match.index! + formula.length + 1);
  const split: ParsedConfig = [];
  for (const part of rest.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []) {
    if (!part) continue;
    const [type, value] = part.trim().split('=');
    split.push({
      type: type.trim(),
      value: value.trim().replace(/(^"|"$)/g, ''),
    });
  }

  const arr: ParsedConfig = [{ type: 'formula', value: formula }, ...split];
  const hasTooltip = arr.some(({ type }) => type === 'tooltip');
  if (hasTooltip) return arr;
  if (label) arr.push({ type: 'tooltip', value: label });
  else if (isDamage) {
    arr.push({ type: 'tooltip', value: game.i18n.localize('SWADE.Dmg') });
  } else if (isTrait) {
    arr.push({ type: 'tooltip', value: game.i18n.localize('SWADE.Trait') });
  }
  return arr;
}

type ParsedConfig = { type: string; value: string }[];
export interface ProcessedFormula {
  formula: string;
  mods: RollModifier[];
}
