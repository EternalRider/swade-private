import { AdditionalStat } from '../interfaces/additional.interface';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import { Logger } from './Logger';
import { copyToClipboard } from './util';

/**
 * Produce short, plaintext summaries of the most important aspects of an Actor's character sheet.
 */
export default class CharacterSummarizer {
  actor: SwadeActor;
  summary: string;

  constructor(actor: SwadeActor) {
    this.actor = actor;

    if (!CharacterSummarizer.isSupportedActorType(actor)) {
      ui.notifications.error(
        `Can't do character summariser against actor of type ${actor.type}`,
      );
      this.summary = '';
      return;
    }
    this.summary = this._makeSummary();
  }

  static isSupportedActorType(char: SwadeActor): boolean {
    return char.type === 'character' || char.type === 'npc';
  }

  static summarizeCharacters(chars: SwadeActor[]) {
    for (const char of chars) {
      const s = new game.swade.CharacterSummarizer(char);
      CharacterSummarizer._showDialog(s);
    }
  }

  static _showDialog(summarizer: CharacterSummarizer) {
    if (summarizer.getSummary() === '') return;

    const d = new Dialog({
      title: game.i18n.localize('SWADE.CharacterSummary'),
      content: summarizer.getSummary(),
      buttons: {
        close: {
          label: game.i18n.localize('SWADE.Ok'),
        },
        copyHtml: {
          label: game.i18n.localize('SWADE.CopyHtml'),
          callback: () => {
            summarizer.copySummaryHtml();
          },
        },
        copyMarkdown: {
          label: game.i18n.localize('SWADE.CopyMarkdown'),
          callback: () => {
            summarizer.copySummaryMarkdown();
          },
        },
      },
      default: 'close',
    });
    d.render(true);
  }

  // Util method for calling this code from macros
  getSummary() {
    return this.summary;
  }

  copySummaryHtml() {
    copyToClipboard(this.summary);
  }

  copySummaryMarkdown() {
    // as the HTML is so simple here, just going to convert
    // it inline.
    const markdownSummary = this.summary
      .replace(/<\/?p>/g, '\n')
      .replace(/<br\/?>/g, '\n')
      .replace(/<\/?strong>/g, '*')
      .replace(/<h1>/g, '# ')
      .replace(/<\/h1>/g, '\n')
      .replace(/&mdash;/g, '—');

    copyToClipboard(markdownSummary);
  }

  _makeSummary() {
    let summary = `<h1>${this.actor.name}</h1>`;

    // Basic character information block
    summary += '<p><strong>' + game.i18n.localize('SWADE.Race') + '</strong>: ';
    summary += TextEditor.enrichHTML(
      getProperty(this.actor.system, 'details.species.name'),
      { async: false },
    );
    summary +=
      '<br/><strong>' + game.i18n.localize('SWADE.Rank') + '</strong>: ';
    summary += getProperty(this.actor.system, 'advances.rank');
    summary += ' (' + getProperty(this.actor.system, 'advances.value');
    summary += ' ' + game.i18n.localize('SWADE.Adv');
    summary +=
      ')<br/><strong>' + game.i18n.localize('SWADE.Bennies') + '</strong>: ';
    summary += getProperty(this.actor.system, 'bennies.max') + '</p>';

    // Attributes
    const attributes = new Array();
    attributes.push(
      game.i18n.localize('SWADE.AttrAgiShort') +
        ' ' +
        this._formatDieStat(this.actor, 'attributes.agility.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrSmaShort') +
        ' ' +
        this._formatDieStat(this.actor, 'attributes.smarts.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrSprShort') +
        ' ' +
        this._formatDieStat(this.actor, 'attributes.spirit.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrStrShort') +
        ' ' +
        this._formatDieStat(this.actor, 'attributes.strength.die'),
    );
    attributes.push(
      game.i18n.localize('SWADE.AttrVigShort') +
        ' ' +
        this._formatDieStat(this.actor, 'attributes.vigor.die'),
    );
    summary += this._formatList(
      attributes,
      game.i18n.localize('SWADE.Attributes'),
    );

    // Speed, pace, toughness
    summary +=
      '<p><strong>' +
      game.i18n.localize('SWADE.Pace') +
      '</strong>: ' +
      getProperty(this.actor.system, 'stats.speed.value') +
      ', ';
    summary +=
      '<strong>' +
      game.i18n.localize('SWADE.Parry') +
      '</strong>: ' +
      getProperty(this.actor.system, 'stats.parry.value') +
      ', ';
    summary +=
      '<strong>' +
      game.i18n.localize('SWADE.Tough') +
      '</strong>: ' +
      getProperty(this.actor.system, 'stats.toughness.value');
    summary +=
      ' (' + getProperty(this.actor.system, 'stats.toughness.armor') + ')</p>';

    // Items - skills, powers, gear, etc
    const skills = new Array<string>();
    const edges = new Array<string>();
    const hindrances = new Array<string>();
    const weaponsAndArmour = new Array<string>();
    const gear = new Array<string>();
    const powers = new Array<string>();
    const abilities = new Array<string>();
    const consumables = new Array<string>();

    for (const item of this.actor.items) {
      switch (item.type) {
        case 'skill':
          skills.push(item.name + ' ' + this._formatDieStat(item, 'die'));
          break;
        case 'edge':
          edges.push(item.name as string);
          break;
        case 'hindrance':
          hindrances.push(item.name as string);
          break;
        case 'weapon':
          weaponsAndArmour.push(
            `${item.name} (${item.system.damage}, ${item.system.range}, ` +
              `${game.i18n.localize('SWADE.Ap')}${item.system.ap}, ` +
              `${game.i18n.localize('SWADE.RoF')}${item.system.rof})`,
          );
          break;
        case 'armor':
          weaponsAndArmour.push(`${item.name} (${item.system.armor})`);
          break;
        case 'shield':
          weaponsAndArmour.push(
            `${item.name} (+${item.system.parry} / ${item.system.cover})`,
          );
          break;
        case 'gear':
          gear.push(item.name as string);
          break;
        case 'power':
          powers.push(item.name as string);
          break;
        case 'ability':
          abilities.push(item.name as string);
          break;
        case 'consumable':
          consumables.push(item.name as string);
          break;
        default:
          Logger.error(`Item ${item.name} has unknown type ${item.type}`, {
            toast: true,
          });
      }
    }

    summary += this._formatList(skills, game.i18n.localize('SWADE.Skills'));
    summary += this._formatList(edges, game.i18n.localize('SWADE.Edges'));
    summary += this._formatList(
      hindrances,
      game.i18n.localize('SWADE.Hindrances'),
    );

    summary += this._formatList(
      weaponsAndArmour,
      game.i18n.localize('SWADE.WeaponsAndArmor'),
    );
    summary += this._formatList(
      consumables,
      game.i18n.localize('SWADE.Consumable.Consumables'),
    );
    summary += this._formatList(gear, game.i18n.localize('SWADE.Inv'));
    summary += this._formatList(powers, game.i18n.localize('SWADE.Pow'));
    summary += this._formatList(
      abilities,
      game.i18n.localize('SWADE.SpecialAbilities'),
    );

    // Additional stats
    const additionalStats = new Array<string>();
    for (const key in this.actor.system.additionalStats) {
      const stat = this.actor.system.additionalStats[key] as AdditionalStat;
      switch (stat.dtype) {
        case 'String':
          additionalStats.push(`${stat.label}: ${stat.value}`);
          break;
        case 'Number':
          if (stat.hasMaxValue) {
            additionalStats.push(`${stat.label}: ${stat.value}/${stat.max}`);
          } else {
            additionalStats.push(`${stat.label}: ${stat.value}`);
          }
          break;
        case 'Die':
          additionalStats.push(
            `${stat.label}: ${stat.value}` +
              this._formatModifier(stat.modifier),
          );
          break;
        case 'Boolean':
          if (stat.value) {
            additionalStats.push(
              `${stat.label}: ${game.i18n.localize('SWADE.Yes')}`,
            );
          } else {
            additionalStats.push(
              `${stat.label}: ${game.i18n.localize('SWADE.No')}`,
            );
          }
          break;
        default:
          Logger.error(
            `For ${key}, cannot process additionalStat of type ${stat.dtype}`,
            { toast: true },
          );
      }
    }

    summary += this._formatList(
      additionalStats,
      game.i18n.localize('SWADE.AddStats'),
    );

    return summary;
  }

  private _formatList(list: string[], name: string) {
    if (list.length === 0) {
      list.push('&mdash;');
    }
    list.sort();
    let val = `<p><strong>${name}</strong>: `;
    val += list.join(', ');
    val += '</p>';
    return val;
  }

  private _formatDieStat(document: SwadeItem | SwadeActor, dataKey: String) {
    const sides = getProperty(document.system, dataKey + '.sides');
    const modifier = getProperty(document.system, dataKey + '.modifier');
    const val = `d${sides}` + this._formatModifier(modifier);
    return val;
  }

  private _formatModifier(modifier) {
    if (modifier === undefined || modifier === null || modifier === 0) {
      return '';
    }

    if (!!modifier && !String(modifier).match(/^[+-]/)) {
      modifier = '+' + modifier;
    }
    return modifier;
  }

  // This is currently unused but will be used later
  private _getSkillAboveAttributeInSteps(skill: SwadeItem) {
    const linkedAttributeName = getProperty(skill.data, 'data.attribute');
    if (linkedAttributeName === undefined || linkedAttributeName === '') {
      return 0;
    }
    const sidesDelta =
      getProperty(skill.data, 'data.die.sides') -
      getProperty(
        this.actor.data,
        `data.attributes.${linkedAttributeName}.die.sides`,
      );
    return sidesDelta / 2;
  }
}
