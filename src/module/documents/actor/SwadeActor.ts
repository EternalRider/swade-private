import { AnyObject, NullishProps, ValueOf } from 'fvtt-types/utils';
import { Attribute } from '../../../globals';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import {
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { RollDialog, RollDialogContext } from '../../apps/RollDialog';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import {
  CharacterData,
  GroupData,
  NpcData,
  VehicleData,
} from '../../data/actor';
import { CreatureData, SwadeBaseActorData } from '../../data/actor/base';
import { TokenSize } from '../../data/actor/base/base';
import { PaceSchemaField } from '../../data/fields/PaceSchemaField';
import {
  AbilityData,
  ArmorData,
  ConsumableData,
  EdgeData,
  GearData,
  ShieldData,
  SkillData,
  WeaponData,
} from '../../data/item';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import WildDie from '../../dice/WildDie';
import {
  getStatusEffectDataById,
  mapRange,
  modifierReducer,
  shouldShowBennyAnimation,
  getEdgeToEdgeDistance,
} from '../../util';
import SwadeCombatant from '../combat/SwadeCombatant';
import SwadeItem from '../item/SwadeItem';
import { TraitDie } from './SwadeActor.interface';

declare global {
  interface DocumentClassConfig {
    Actor: typeof SwadeActor;
  }
  interface FlagConfig {
    swade: {
      ambidextrous?: boolean;
      hardy?: boolean;
      ignoreBleedOut?: boolean;
      wildAttackDamage?: string | number;
      jokerBonus?: string | number;
      hiddenActionOverride?: boolean;
    };
  }

  namespace Actor {
    namespace Database {
      interface Update {
        swade?: {
          wounds?: {
            value?: number;
          };
          fatigue?: {
            value?: number;
          };
        };
      }
    }
  }
}

class SwadeActor<
  Subtype extends Actor.SubType = Actor.SubType,
> extends Actor<Subtype> {
  static getWoundsColor(current: number, max: number) {
    const minDegrees = 30;
    const maxDegrees = 120;
    //get the degrees on the HSV wheel, going from 30° (greenish-yellow) to 120° (green)
    const degrees = mapRange(current, 0, max, minDegrees, maxDegrees);
    //invert the degrees and map them from 0 to a third
    const hue = mapRange(maxDegrees - degrees, 0, maxDegrees, 0, 1 / 3);
    //get a usable color value with 100% saturation and 90% value
    return Color.fromHSV([hue, 1, 0.9]);
  }

  static getFatigueColor(current: number, max: number) {
    //get the angle (200°) and map it into the proper range
    const hue = mapRange(200, 0, 360, 0, 1);
    //get the value from the parameter
    const value = mapRange(current, 0, max, 0, 1);
    return Color.fromHSV([hue, value, 0.75]);
  }

  static override migrateData(data: Actor.CreateData & AnyObject) {
    super.migrateData(data);
    if (data.flags?.swade?.auras) {
      data.system ??= {};
      data.system.auras = data.flags.swade.auras;
      delete data.flags.swade.auras;
    }
    return data;
  }

  constructor(
    data: Actor.CreateData,
    ctx?: foundry.abstract.Document.ConstructionContext<TokenDocument>,
  ) {
    if (game.swade.ready && ctx?.pack && data._id) {
      const art = game.swade.compendiumArt.map.get(
        `Compendium.${ctx.pack}.${data._id}`,
      );
      if (art) {
        data.img = art.actor;
        const tokenArt =
          typeof art.token === 'string'
            ? { texture: { src: art.token } }
            : {
                texture: {
                  src: art.token.img,
                  scaleX: art.token.scale,
                  scaleY: art.token.scale,
                },
              };
        data.prototypeToken = foundry.utils.mergeObject(
          data.prototypeToken ?? {},
          tokenArt,
        );
      }
    }
    super(data, ctx);
  }

  // Does not appear to work properly
  // isType<TypeName extends SystemActorTypes>(
  //   type: TypeName,
  // ): this is SwadeActor<TypeName> {
  //   return type === this.type;
  // }

  /** @returns true when the actor is a Wild Card */
  get isWildcard(): boolean {
    return !!this.system.wildcard;
  }

  /** @returns true when the actor has an arcane background or a special ability that grants powers. */
  get hasArcaneBackground(): boolean {
    return !!this.items.find(
      (i: SwadeItem<'edge' | 'ability' | 'power'>) =>
        (i.system instanceof EdgeData && i.system.isArcaneBackground) ||
        (i.system instanceof AbilityData && i.system.grantsPowers),
    );
  }

  /** @returns whether the actor has any power items at all */
  get hasPowers(): boolean {
    return !!this.items.find((i) => i.type === 'power');
  }

  get tokenSize(): TokenSize {
    if ('tokenSize' in this.system) return this.system.tokenSize;
    return { height: 1, width: 1 };
  }

  /** @returns true when the actor is currently in combat and has drawn a joker */
  get hasJoker(): boolean {
    const combatant = this.getCombatant(game.combats?.active);
    return (combatant?.hasJoker as boolean) ?? false;
  }

  get bennies(): number {
    if (!('bennies' in this.system)) return 0;
    return this.system.bennies.value!;
  }

  /** @returns an object that contains booleans which denote the current status of the actor */
  get status() {
    if (!('status' in this.system)) return {};
    return this.system.status;
  }

  get armorPerLocation(): Record<ArmorLocation, number> {
    return {
      head: this._getArmorForLocation(constants.ARMOR_LOCATIONS.HEAD),
      torso: this._getArmorForLocation(constants.ARMOR_LOCATIONS.TORSO),
      arms: this._getArmorForLocation(constants.ARMOR_LOCATIONS.ARMS),
      legs: this._getArmorForLocation(constants.ARMOR_LOCATIONS.LEGS),
    };
  }

  get hasHeavyArmor(): boolean {
    return this.itemTypes.armor.some(
      (a) =>
        !!foundry.utils.getProperty(a, 'system.isHeavyArmor') &&
        foundry.utils.getProperty(a, 'system.equipStatus') >=
          constants.EQUIP_STATE.EQUIPPED,
    );
  }

  get isUnarmored(): boolean {
    return this.itemTypes.armor.every(
      (a) =>
        foundry.utils.getProperty(a, 'system.equipStatus') <
        constants.EQUIP_STATE.EQUIPPED,
    );
  }

  get ancestry(): SwadeItem | undefined {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return;
    const ancestries = this.items.filter((i) => i.type === 'ancestry');
    if (ancestries.length > 1) {
      Logger.warn(
        `Actor ${this.name} (${this.id}) has more than one ancestry!`,
      );
    }
    return ancestries[0];
  }

  get archetype(): SwadeItem | undefined {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return;
    const archetypes = this.items.filter(
      (i) =>
        i.type === 'ability' &&
        (i as SwadeItem<'ability'>).system.subtype === 'archetype',
    );
    if (archetypes.length > 1) {
      Logger.warn(
        `Actor ${this.name} (${this.id}) has more than one archetype!`,
      );
    }
    return archetypes[0];
  }

  override get itemTypes() {
    const types = super.itemTypes;
    //sort the items before returning them
    for (const type in types) {
      types[type].sort((a, b) => a.sort - b.sort);
    }
    return types;
  }

  /**
   * Helper property to prevent double-application of modifiers
   */
  declare _embeddedPreparation: boolean | undefined;

  override prepareEmbeddedDocuments() {
    this._embeddedPreparation = true;
    if (this.system instanceof SwadeBaseActorData) {
      this.system.prepareEmbeddedDocuments();
    } else super.prepareEmbeddedDocuments();
    delete this._embeddedPreparation;
  }

  override prepareDerivedData() {
    this._filterOverrides();

    /**
     * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
     * @category Hooks
     * @param {SwadeActor} actor                The actor whose data is being prepared
     */
    Hooks.callAll('swadeActorPrepareDerivedData', this);
  }

  async rollAttribute(
    attribute: Attribute,
    options: IRollOptions = {},
  ): Promise<TraitRoll | null> {
    if (!('attributes' in this.system)) return null;
    if (options.rof && options.rof > 1) {
      ui.notifications.warn(
        'Attribute Rolls with RoF greater than 1 are not currently supported',
      );
    }
    const label: string = SWADE.attributes[attribute].long;
    const abl = this.system.attributes[attribute];
    const rolls = new Array<Roll>();

    rolls.push(
      Roll.fromTerms([
        this._buildTraitDie(abl.die.sides!, game.i18n.localize(label)),
      ]),
    );

    if (this.isWildcard) {
      rolls.push(Roll.fromTerms([this._buildWildDie(abl['wild-die'].sides!)]));
    }

    const basePool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
    basePool.modifiers.push('kh');

    const effects = structuredClone<RollModifier[]>([
      ...abl.effects,
      ...this.system.stats.globalMods[attribute],
      ...this.system.stats.globalMods.trait,
    ]);

    if (options.additionalMods) {
      options.additionalMods.push(...effects);
    } else {
      options.additionalMods = effects;
    }

    const modifiers = this.getTraitRollModifiers(
      abl.die,
      options,
      game.i18n.localize(label),
    );

    //add encumbrance penalty if necessary
    if (attribute === 'agility' && this.system.encumbered) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    const roll = TraitRoll.fromTerms([basePool]) as TraitRoll;
    roll.modifiers = modifiers;
    if ('isRerollable' in options) roll.setRerollable(options.isRerollable!);

    /**
     * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * Returning `false` in a hook callback will cancel the roll entirely
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    const permitContinue = Hooks.call(
      'swadePreRollAttribute',
      this,
      attribute,
      roll,
      modifiers,
      options,
    );
    if (permitContinue === false) return null;

    if (options.suppressChat) {
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(false),
        ),
      ]) as TraitRoll;
    }

    // Roll and return
    const retVal = await RollDialog.asPromise({
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        options.flavour ??
        `${game.i18n.localize(label)} ${game.i18n.localize(
          'SWADE.AttributeTest',
        )}`,
      title:
        options.title ??
        `${game.i18n.localize(label)} ${game.i18n.localize(
          'SWADE.AttributeTest',
        )}`,
      actor: this,
    });

    /**
     * A hook event that is fired after an attribute is rolled
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.callAll(
      'swadeRollAttribute',
      this,
      attribute,
      roll,
      modifiers,
      options,
    );

    return retVal as TraitRoll | null;
  }

  async rollSkill(
    skillId: string | null | undefined,
    options: IRollOptions = { rof: 1 },
    tempSkill?: SwadeItem,
  ): Promise<TraitRoll | null> {
    if (
      this.system instanceof VehicleData ||
      this.system instanceof GroupData
    ) {
      Logger.error('Only Extras and Wildcards can roll skills!', {
        toast: true,
      });
      return null;
    }
    let skill: SwadeItem | undefined;
    skill = this.items.find((i) => i.id == skillId);
    if (tempSkill) skill = tempSkill;

    // TODO: (Improved) Arcane Resistance, when -> Powers
    const isAttack = options.item?.type === 'weapon';
    const { isRanged=null, isMelee=null } = options.item?.system ?? {};
    const isRangedAttack = isRanged && (!isMelee || (skill?.system.swid !== 'fighting'));
    const isMeleeAttack = isMelee && (!isRanged || (skill?.system.swid === 'fighting'));

    // Only for attacks, and only if skill is defined (to avoid double-counting on unskilled attempts)
    if (isAttack && skill) {
      const currToken = this.getActiveTokens(false, true)[0];
      const additionalMods: RollModifier[] = [];
      
      // Unstable Platform
      if (isRangedAttack && currToken?.regions?.some(r => 
        r.behaviors.some(b => !b.disabled && (b.type === 'attackModifiers') && b.system.unstablePlatform)
      )) {
        if (!this.getSingleItemBySwid('steady-hands', 'edge'))
          additionalMods.push({ label: game.i18n.localize('SWADE.UnstablePlatform'), value: -2 });
      }

      const targetToken = game.user.targets.first()?.document;
      let bestIllumination: RollModifier | undefined;
      let bestCover: RollModifier | undefined;
      if (targetToken) {
        // For use with range increments & prone
        const distanceToTarget = targetToken.parent.grid.measurePath([currToken.getCenterPoint(), targetToken.getCenterPoint()])?.distance ?? 0;

        // Illumination & Cover
        const targetBehaviors = Array.from(targetToken.regions.map(r =>
          r.behaviors.filter(b => !b.disabled && (b.type === 'attackModifiers'))
        )).deepFlatten();
        if (isRangedAttack && targetToken.hasStatusEffect('prone') && (distanceToTarget >= 3)) {
          bestCover = {
            label: game.i18n.localize('SWADE.Cover.MediumProne'),
            value: -4
          };
        }
        const modMap = {
          illuminationDim: -2,
          illuminationDark: -4,
          illuminationPitch: -6,
          coverLight: -2,
          coverMedium: -4,
          coverHeavy: -6,
          coverTotal: -8
        };
        for (const behavior of targetBehaviors) {
          const { illumination, cover } = behavior.system;
          if (illumination) {
            const currMod = modMap[illumination];
            const currLabel = game.i18n.localize(`SWADE.Illumination.${illumination.slice(12)}`);
            if (!bestIllumination || currMod < bestIllumination.value) {
              bestIllumination = {
                label: currLabel,
                value: currMod
              };
            }
          }
          if (cover) {
            const currMod = modMap[cover];
            const currLabel = game.i18n.localize(`SWADE.Cover.${cover.slice(5)}`);
            if (!bestCover || currMod < bestCover.value) {
              bestCover = {
                label: currLabel,
                value: currMod
              }
            }
          }
        }
        if (bestIllumination) additionalMods.push(bestIllumination);
        
        // Shield cover
        const equippedShields = targetToken.actor.itemTypes.shield.filter(i => i.isReadied);
        const shieldCoverMod = -equippedShields.reduce((bestCover, shield) => {
          return Math.max(shield.system.cover, bestCover);
        }, 0);
        if (shieldCoverMod) {
          if (!bestCover || (bestCover.value as number) > shieldCoverMod) {
            bestCover = {
              label: game.i18n.localize('SWADE.Cover.Shield'),
              value: shieldCoverMod
            };
          }
        }

        // Dodge
        if (isRangedAttack) {
          const dodgeItem = targetToken.actor.getSingleItemBySwid('dodge', 'edge');
          if (dodgeItem && (!bestCover || (bestCover.value as number > -2))) {
            bestCover = {
              label: dodgeItem.name,
              value: -2
            }
          }
        }
        // Best of cover regions, shield cover, prone, dodge
        if (bestCover) additionalMods.push(bestCover);

        // Combat Acrobat
        const combatAcrobatItem = targetToken.actor.getSingleItemBySwid('combat-acrobat', 'edge');
        if (combatAcrobatItem && !targetToken.actor.system.encumbered) {
          additionalMods.push({
            label: combatAcrobatItem.name,
            value: -1
          })
        }
        
        // Range
        const range = options.item!.range;
        if (range) {
          if (distanceToTarget > range.long) additionalMods.push({ label: game.i18n.localize('SWADE.Range.Extreme'), value: -8 });
          else if (distanceToTarget > range.medium) additionalMods.push({ label: game.i18n.localize('SWADE.Range.Long'), value: -4 });
          else if (distanceToTarget > range.short) additionalMods.push({ label: game.i18n.localize('SWADE.Range.Medium'), value: -2 });
        }

        // Vulnerable
        if (targetToken.hasStatusEffect('vulnerable')) additionalMods.push({ label: game.i18n.localize('SWADE.TargetVulnerable'), value: '+2' });

        // Gang-up, including (Improved) Block
        if (isMeleeAttack && (currToken.disposition * targetToken.disposition === -1)) {
          const scene = targetToken.parent;
          const numAttackerAllies = scene.tokens.filter(t => {
            if (t.disposition !== currToken.disposition) return false;
            if (t.hasStatusEffect('stunned')) return false;
            return getEdgeToEdgeDistance(targetToken, t) < 1;
          }).length;
          const numDefenderAllies = scene.tokens.filter(t => {
            if (t.disposition !== targetToken.disposition) return false;
            if (t.hasStatusEffect('stunned')) return false;
            if (getEdgeToEdgeDistance(targetToken, t) >= 1) return false;
            return getEdgeToEdgeDistance(currToken, t) < 1;
          }).length;
          let gangUpBonus = Math.min(4, numAttackerAllies - numDefenderAllies)
          if (targetToken.actor.getSingleItemBySwid('improved-block', 'edge')) gangUpBonus -= 2;
          else if (targetToken.actor.getSingleItemBySwid('block', 'edge')) gangUpBonus -= 1;
          if (gangUpBonus > 0) additionalMods.push({
            label: game.i18n.localize('SWADE.GangUp'),
            value: `+${gangUpBonus}`
          });
        }

        // Size
        const attackerScale = this.system.stats.scale;
        const defenderScale = targetToken.actor.system.stats.scale;
        const scaleDifference = defenderScale - attackerScale;
        if (scaleDifference !== 0) {
          additionalMods.push({
            label: game.i18n.localize('SWADE.ScaleDifference'),
            value: scaleDifference < 0 ? scaleDifference : `+${scaleDifference}`
          });
        }
      }

      /**
       * A hook event that is fired immediately before adding `additionalMods` to the Roll Dialog options, allowing additional default
       * modifiers to be added (or existing ones to be removed)
       * @category Hooks
       * @param {TokenDocument} currToken                     The attacking token
       * @param {TokenDocument | undefined} targetToken       The first-targeted token, or `undefined` if no targets
       * @param {SwadeItem} skill                             The skill being used for the attack
       * @param {SwadeItem} item                              The item being used for the attack
       * @param {boolean} isRangedAttack                      `true` if ranged weapon or mixed with non-`fighting` skill
       * @param {boolean} isMeleeAttack                       `true` if melee weapon or mixed with `fighting` skill
       * @param {RollModifier[]} additionalMods               The list of default-applied modifiers so far, to be modified directly
       * @param {RollModifier | undefined} bestCover          The best "cover" modifier, provided to be able to replace/remove it in `additionalMods`
       * @param {RollModifier | undefined} bestIllumination   The best "illumination" modifier, provided to be able to replace/remove it in `additionalMods`
       */
      Hooks.call(
        'swadeCalculateDefaultAttackMods',
        currToken,
        targetToken,
        skill,
        options.item!,
        isRangedAttack,
        isMeleeAttack,
        additionalMods,
        bestCover,
        bestIllumination
      );
      
      if (additionalMods.length) {
        if (options.additionalMods) options.additionalMods.push(...additionalMods);
        else options.additionalMods = additionalMods;
      }
    }

    if (!skill) return this.makeUnskilledAttempt(options);

    const skillRoll = this._handleComplexSkill(skill, options);
    const roll = skillRoll[0];
    const modifiers = skillRoll[1];
    roll.modifiers = modifiers;
    if ('isRerollable' in options) roll.setRerollable(options.isRerollable!);

    //Build Flavour
    let flavour = '';
    if (options.flavour) flavour = ` - ${options.flavour}`;

    /**
     * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * Returning `false` in a hook callback will cancel the roll entirely
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the skill
     * @param {SwadeItem} skill                 The Skill item that is being rolled
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    const permitContinue = Hooks.call(
      'swadePreRollSkill',
      this,
      skill,
      roll,
      modifiers,
      options,
    );

    if (!permitContinue) return null;

    if (options.suppressChat) {
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(false),
        ),
      ]) as TraitRoll;
    }

    const rollDialogContext: RollDialogContext = {
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        options.flavour ??
        `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}${flavour}`,
      title:
        options.title ??
        `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}`,
      actor: this,
    };

    if (options.item) rollDialogContext.item = options.item;

    // Roll and return
    const retVal = await RollDialog.asPromise(rollDialogContext);

    /**
     * A hook event that is fired after a skill is rolled
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the skill
     * @param {SwadeItem} skill                 The Skill item that is being rolled
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.callAll('swadeRollSkill', this, skill, roll, modifiers, options);

    return retVal as TraitRoll | null;
  }

  async rollWealthDie() {
    if (!('details' in this.system)) return null;
    const die = this.system.details.wealth.die ?? 6;
    const mod = this.system.details.wealth.modifier ?? 0;
    const wildDie = this.system.details.wealth['wild-die'] ?? 6;
    if (die < 4) {
      ui.notifications.warn('SWADE.WealthDie.Broke.Hint', { localize: true });
      return null;
    }
    const rolls = [
      Roll.fromTerms([
        this._buildTraitDie(die, game.i18n.localize('SWADE.WealthDie.Label')),
      ]),
    ];
    if (this.isWildcard) {
      rolls.push(Roll.fromTerms([this._buildWildDie(wildDie)]));
    }

    const pool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
    pool.modifiers.push('kh');

    const roll = SwadeRoll.fromTerms([pool]);
    const mods = [{ label: 'Modifier', value: mod }];
    roll.modifiers = mods;

    return RollDialog.asPromise({
      roll: roll,
      mods: mods,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      actor: this,
      flavor: game.i18n.localize('SWADE.WealthDie.Label'),
      title: game.i18n.localize('SWADE.WealthDie.Label'),
    });
  }

  async rollRunningDie() {
    if (
      this.system instanceof VehicleData ||
      this.system instanceof GroupData
    ) {
      return null;
    }

    const system = this.system as CharacterData | NpcData;

    const availableKeys = PaceSchemaField.paceKeys.filter(
      (key) => !!system.pace[key],
    );

    let paceKey: string | null = availableKeys[0];
    if (Object.keys(availableKeys).length > 1) {
      paceKey = await foundry.applications.api.DialogV2.wait({
        window: {
          title: 'SWADE.Movement.Running.Dialog.Title',
        } satisfies Partial<foundry.applications.api.ApplicationV2.WindowConfiguration>,
        content: `<p>${game.i18n.localize('SWADE.Movement.Running.Dialog.Content')}</p>`,
        buttons: availableKeys.map((key) => {
          return {
            label: `SWADE.Movement.Pace.${key.capitalize()}.Label`,
            action: key,
            default: key === paceKey,
          };
        }),
        rejectClose: false,
        render: (_event, app) =>
          app.querySelector('footer')?.classList.add('flexcol'),
      });
    }

    if (paceKey === null) return;
    let pace = system.pace[paceKey];
    const running = system.pace.running;
    const runningDie = `1d${running.die}[${game.i18n.localize(
      'SWADE.RunningDie',
    )}]`;

    const mods: RollModifier[] = [];

    if (running.mod) {
      mods.push({
        label: game.i18n.localize('SWADE.Modifier'),
        value: running.mod,
      });
    }

    if ('encumbered' in this.system && this.system.encumbered) {
      pace += 2; //add the base value back, the roll modifier will take care of it
      mods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }
    const paceLabel = `${game.i18n.localize('SWADE.Pace')} (${game.i18n.localize(`SWADE.Movement.Pace.${paceKey.capitalize()}.Label`)})`;
    mods.unshift({ label: paceLabel, value: pace });

    return RollDialog.asPromise({
      roll: new SwadeRoll(runningDie, this.getRollData(false), {
        modifiers: mods,
        rollType: "running",
      }),
      mods,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        game.i18n.localize('SWADE.RunningHint.Header') +
        game.i18n.localize('SWADE.RunningHint.Reminder'),
      title: game.i18n.localize('SWADE.Running'),
      actor: this,
    });
  }

  async makeUnskilledAttempt(options: IRollOptions = {}) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.Unskilled'),
      type: 'skill',
      system: {
        swid: 'unskilled-attempt',
        die: {
          sides: 4,
          modifier: 0,
        },
        'wild-die': {
          sides: 6,
        },
      },
    });
    const modifier: RollModifier = {
      label: game.i18n.localize('SWADE.Unskilled'),
      value: -2,
    };
    if (options.additionalMods) {
      options.additionalMods.push(modifier);
    } else {
      options.additionalMods = [modifier];
    }
    return this.rollSkill(null, options, tempSkill);
  }

  async makeArcaneDeviceSkillRoll(
    arcaneSkillDie: TraitDie,
    options: IRollOptions = {},
  ) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.ArcaneSkill'),
      type: 'skill',
      system: {
        die: arcaneSkillDie,
        'wild-die': {
          sides: 6,
        },
      },
    });
    return this.rollSkill(null, options, tempSkill);
  }

  async spendBenny() {
    //return early if there no bennies to spend
    if (this.bennies < 1) return;
    const msgClass = getDocumentClass('ChatMessage');
    if (game.settings.get('swade', 'notifyBennies')) {
      const speaker = msgClass.getSpeaker({
        actor: this,
      });
      const message = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.spend, {
        target: this,
        speaker: speaker,
      });
      const chatData = { content: message, speaker: speaker };
      await msgClass.create(chatData);
    }
    await this.update({ 'system.bennies.value': this.bennies - 1 });
    if (game.settings.get('swade', 'hardChoices')) {
      const gms = game
        .users!.filter((u) => u.isGM && u.active)
        .map((u) => u.id);
      game.swade.sockets.giveBenny(gms);
    }

    /**
     * A hook event that is fired after an actor spends a Benny
     * @category Hooks
     * @param {SwadeActor} actor                     The actor that spent the benny
     */
    Hooks.call('swadeSpendBenny', this);

    if (!!game.dice3d && (await shouldShowBennyAnimation())) {
      game.dice3d.showForRoll(
        await new Roll('1dB').evaluate(),
        game.user!,
        true,
        null,
        false,
      );
    }
  }

  async getBenny() {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return;
    const combatant = this.token?.combatant as SwadeCombatant | undefined;
    await this.update({ 'system.bennies.value': this.bennies + 1 });

    const msgClass = getDocumentClass('ChatMessage');

    const hiddenNPC = combatant?.isNPC && combatant?.hidden;
    if (game.settings.get('swade', 'notifyBennies') && !hiddenNPC) {
      const speaker = msgClass.getSpeaker({
        actor: this,
      });
      const content = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.add, {
        target: this,
        speaker: speaker,
      });
      await msgClass.create({
        content: content,
        speaker: speaker,
      });
    }

    /**
     * A hook event that is fired after an actor has been awarded a benny
     * @category Hooks
     * @param {SwadeActor} actor                     The actor that received the benny
     */
    Hooks.call('swadeGetBenny', this);

    if (!!game.dice3d && (await shouldShowBennyAnimation())) {
      game.dice3d.showForRoll(
        await new Roll('1dB').evaluate(),
        game.user!,
        true,
        null,
        false,
      );
    }
  }

  /**
   * Toggles the actor's conviction state on/off, subtracting the relevant resource
   * @param toChat Whether to post a chat message when toggling, defaults to `true`
   */
  async toggleConviction(toChat = true): Promise<void> {
    if (!('details' in this.system)) return;
    const current = this.system.details.conviction.value!;
    const active = this.system.details.conviction.active;
    let template = '';

    if (current > 0 && !active) {
      await this.update({
        'system.details.conviction.value': current - 1,
        'system.details.conviction.active': true,
      });
      template = CONFIG.SWADE.conviction.templates.start;
    } else {
      await this.update({
        'system.details.conviction.active': false,
      });
      template = CONFIG.SWADE.conviction.templates.end;
    }
    if (!toChat) return;
    const msgClass = getDocumentClass('ChatMessage');
    await msgClass.create({
      speaker: msgClass.getSpeaker({ actor: this }),
      content: await foundry.applications.handlebars.renderTemplate(template, {
        icon: CONFIG.SWADE.conviction.icon,
        actor: this,
      }),
    });
  }

  /** @see {TokenDocument#toggleActiveEffect} */
  async toggleActiveEffect(
    effect: CONFIG.StatusEffect | string,
    {
      overlay = false,
      active,
    }: NullishProps<{ overlay: boolean; active: boolean }> = {},
  ) {
    const statusEffect =
      typeof effect === 'string' ? getStatusEffectDataById(effect) : effect;
    if (!statusEffect?.id) return false;

    // Remove existing single-status effects.
    const existing = this.effects.reduce<string[]>((acc, cur) => {
      if (cur.statuses.size === 1 && cur.statuses.has(statusEffect.id)) {
        acc.push(cur.id);
      }
      return acc;
    }, []);
    const state = active ?? !existing.length;
    if (!state && existing.length) {
      await this.deleteEmbeddedDocuments('ActiveEffect', existing);
    }
    // Add a new effect
    else if (state) {
      const aeClass = getDocumentClass('ActiveEffect');
      const data = foundry.utils.deepClone(statusEffect);
      foundry.utils.setProperty(data, 'statuses', [statusEffect.id]);
      delete data.id; //remove the ID to not trigger validation errors
      aeClass.migrateDataSafe(data);
      aeClass.cleanData(data);
      data.name = game.i18n.localize(data.name as string);
      if (overlay) foundry.utils.setProperty(data, 'flags.core.overlay', true);
      await aeClass.create(data, { parent: this });
    }
    return state;
  }

  /**
   * Reset the bennies of the Actor to their default value
   */
  async refreshBennies(notify = true) {
    if ('refreshBennies' in this.system) this.system.refreshBennies(notify);
  }

  /** Calculates the total Wound Penalties
   * and returns them as a negative number */
  calcWoundPenalties(ignoreAll: boolean = false): number {
    if (ignoreAll) return 0;
    let total = 0;
    const wounds = foundry.utils.getProperty(
      this,
      'system.wounds.value',
    ) as number;
    const ignoredWounds = foundry.utils.getProperty(
      this,
      'system.wounds.ignored',
    ) as number;

    //clamp the value between 0 and the maximum
    total = Math.clamp(wounds - ignoredWounds, 0, 3);
    return total * -1;
  }

  /** Calculates the total Fatigue Penalties */
  calcFatiguePenalties(): number {
    let total = 0;
    const fatigue = foundry.utils.getProperty(
      this,
      'system.fatigue.value',
    ) as number;
    const ignoredFatigue = foundry.utils.getProperty(
      this,
      'system.fatigue.ignored',
    ) as number;

    //get the bigger of the two values so we don't accidentally return a negative value for the penalty
    total = Math.max(fatigue - ignoredFatigue, 0);
    return total * -1;
  }

  calcStatusPenalties(): number {
    let retVal = 0;
    const isDistracted = foundry.utils.getProperty(
      this,
      'system.status.isDistracted',
    );
    if (isDistracted) {
      retVal -= 2;
    }
    return retVal;
  }

  calcScale(size: number): number {
    let scale = 0;
    if (Number.between(size, 20, 12)) scale = 6;
    else if (Number.between(size, 11, 8)) scale = 4;
    else if (Number.between(size, 7, 4)) scale = 2;
    else if (Number.between(size, 3, -1)) scale = 0;
    else if (size === -2) scale = -2;
    else if (size === -3) scale = -4;
    else if (size === -4) scale = -6;
    return scale;
  }

  /**
   * Returns an array of items that match a given SWID and optionally an item type
   * @param swid The SWID of the item(s) which you want to retrieve
   * @param type Optionally, a type name to restrict the search
   * @returns an array containing the found items
   */
  getItemsBySwid<T extends Item.SubType>(
    swid: string,
    type?: T,
  ): SwadeItem<T>[] {
    const swidFilter = (i: SwadeItem) => i.system.swid === swid;
    if (!type) return this.items.filter(swidFilter);
    const itemTypes = this.itemTypes;
    if (!Object.hasOwn(itemTypes, type)) {
      throw new Error(`Type ${type} is invalid!`);
    }
    return itemTypes[type].filter(swidFilter) as SwadeItem<T>[];
  }

  /**
   * Fetch an item that matches a given SWID and optionally an item type
   * @param swid The SWID of the item(s) which you want to retrieve
   * @param type Optionally, a type name to restrict the search
   * @returns The matching item, or undefined if none was found.
   */
  getSingleItemBySwid<T extends Item.SubType>(
    swid: string,
    type?: T,
  ): SwadeItem<T> | undefined {
    return this.getItemsBySwid<T>(swid, type)[0];
  }

  /**
   * Function for shortcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x+1", sma: "1d6x", spi: "1d6x", str: "1d6x-1", vig: "1d6x"}
   */
  override getRollData(
    includeModifiers = true,
  ): Record<string, number | string> {
    let rollData;
    if ('getRollData' in this.system)
      rollData = this.system.getRollData(includeModifiers);
    return rollData ?? {};
  }

  /** Calculates the maximum carry capacity based on the strength die and any adjustment steps */
  calcMaxCarryCapacity(): number {
    if (!('attributes' in this.system)) return 0;
    const unit = game.settings.get('swade', 'weightUnit');
    const strength = foundry.utils.deepClone(this.system.attributes.strength);
    const stepAdjust = Math.max(strength.encumbranceSteps! * 2, 0);
    strength.die.sides! += stepAdjust;
    //bound the adjusted strength die to 12
    const encumbDie = this._boundTraitDie(strength.die);

    if (unit === 'imperial') {
      return this._calcImperialCapacity(encumbDie);
    } else if (unit === 'metric') {
      return this._calcMetricCapacity(encumbDie);
    } else {
      throw new Error(`Value ${unit} is an unknown value!`);
    }
  }

  calcInventoryWeight(): number {
    const items = this.items.map((i) =>
      i.system instanceof ArmorData ||
      i.system instanceof WeaponData ||
      i.system instanceof ShieldData ||
      i.system instanceof GearData ||
      i.system instanceof ConsumableData
        ? i.system
        : null,
    );
    let retVal = 0;
    if (this.system instanceof VehicleData) {
      for (const item of items) {
        if (!item) continue;
        retVal += Number(item.weight) * Number(item.quantity);
      }
    } else {
      for (const item of items) {
        if (!item) continue;
        if (item.equipStatus !== constants.EQUIP_STATE.STORED) {
          retVal += Number(item.weight) * Number(item.quantity);
        }
      }
    }
    return retVal;
  }

  /**
   * @deprecated
   * Helper Function for Vehicle Actors, to roll Maneuvering checks
   */
  async rollManeuverCheck() {
    foundry.utils.logCompatibilityWarning(
      'SwadeActor#rollManeuverCheck has been moved to the VehicleData class and can be accessed via system.rollManeuverCheck',
      { since: '4.4', until: '5.1' },
    );
    if (!(this.system instanceof VehicleData)) return;
    await this.system.rollManeuverCheck();
  }

  /** @deprecated */
  async getDriver(): Promise<SwadeActor<'character' | 'npc'> | null> {
    foundry.utils.logCompatibilityWarning(
      'SwadeActor#getDriver deprecated in favor of the crew members array, which can be found at system.crew.members',
      { since: '4.4', until: '5.1' },
    );
    return this.system.operator;
  }

  getTraitRollModifiers(
    die: TraitDie,
    options: IRollOptions,
    name?: string | null,
  ): RollModifier[] {
    const mods = new Array<RollModifier>();

    //Trait modifier
    if (die.modifier !== 0) {
      mods.push({
        label: name
          ? `${name} ${game.i18n.localize('SWADE.Modifier')}`
          : game.i18n.localize('SWADE.TraitMod'),
        value: die.modifier,
      });
    }

    const wounds = this.calcWoundPenalties(!!options.ignoreWounds);
    const fatigue = this.calcFatiguePenalties();
    const numbness =
      'woundsOrFatigue' in this.system
        ? this.system.woundsOrFatigue?.ignored!
        : 0;
    if (numbness > 0) {
      const label = `${game.i18n.localize('SWADE.Wounds')}/${game.i18n.localize(
        'SWADE.Fatigue',
      )}`;
      mods.push({
        label: label,
        value: Math.min(wounds + fatigue + numbness, 0),
      });
    } else {
      //Wounds
      mods.push({
        label: game.i18n.localize('SWADE.Wounds'),
        value: wounds,
      });
      //Fatigue
      mods.push({
        label: game.i18n.localize('SWADE.Fatigue'),
        value: fatigue,
      });
    }

    //Additional Mods
    if (options.additionalMods) {
      mods.push(...options.additionalMods);
    }

    // Joker, Dramatic Task Complication
    if (game.combats.active && 'rollModifiers' in game.combats.active.system) {
      mods.push(...game.combats.active.system.rollModifiers(this));
    }

    if (
      !(this.system instanceof VehicleData || this.system instanceof GroupData)
    ) {
      //Status penalties
      if (this.system.status.isDistracted) {
        mods.push({
          label: game.i18n.localize('SWADE.Distr'),
          value: -2,
        });
      }

      //Conviction Die
      const useConviction =
        this.isWildcard &&
        this.system.details.conviction.active &&
        game.settings.get('swade', 'enableConviction');
      if (useConviction) {
        mods.push({
          label: game.i18n.localize('SWADE.Conv'),
          value: '+1d6x',
        });
      }
    }

    return mods
      .filter((m) => m.value) //filter out the nullish values
      .sort((a, b) => a.label.localeCompare(b.label)); //sort the mods alphabetically by label
  }

  private _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [TraitRoll, RollModifier[]] {
    if (
      this.system instanceof VehicleData ||
      this.system instanceof GroupData
    ) {
      throw new Error('Only Extras and Wildcards can roll skills!');
    }
    if (!(skill.system instanceof SkillData)) {
      throw new Error('Detected-non skill in skill roll construction');
    }
    if (!options.rof) options.rof = 1;
    const skillData = skill.system;

    const rolls = new Array<Roll>();

    //Add all necessary trait die
    for (let i = 0; i < options.rof; i++) {
      rolls.push(
        Roll.fromTerms([this._buildTraitDie(skillData.die.sides, skill.name!)]),
      );
    }

    //Add Wild Die
    if (this.isWildcard) {
      rolls.push(
        Roll.fromTerms([this._buildWildDie(skillData['wild-die'].sides!)]),
      );
    }

    const kh = options.rof > 1 ? `kh${options.rof}` : 'kh';
    const basePool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
    basePool.modifiers.push(kh);
    const attGlobalMods: RollModifier[] =
      this.system.stats.globalMods[skill.system.attribute ?? ''] ?? [];
    const effects = structuredClone<RollModifier[]>([
      ...(skillData.effects ?? []),
      ...attGlobalMods,
      ...this.system.stats.globalMods.trait,
    ]);

    if (options.additionalMods) options.additionalMods.push(...effects);
    else options.additionalMods = effects;

    const rollMods = this.getTraitRollModifiers(
      skillData.die,
      options,
      skill.name,
    );

    //add encumbrance penalty if necessary
    if (skill.system.attribute === 'agility' && this.system.encumbered) {
      rollMods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return [TraitRoll.fromTerms<TraitRoll>([basePool]), rollMods];
  }

  /**
   * @param sides number of sides of the die
   * @param flavor flavor of the die
   * @param modifiers modifiers to the die
   * @returns a Die instance that already has the exploding modifier by default
   */
  private _buildTraitDie(
    sides: number,
    flavor: string,
  ): foundry.dice.terms.Die {
    const modifiers: (keyof foundry.dice.terms.Die.Modifiers)[] = [];
    if (sides > 1) modifiers.push('x');
    return new foundry.dice.terms.Die({
      faces: sides,
      modifiers: modifiers,
      options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
    });
  }

  /**
   * @param die The die to adjust
   * @returns the properly adjusted trait die
   */
  private _boundTraitDie(die: TraitDie): TraitDie {
    const sides = die.sides;
    if (sides < 4 && sides !== 1) {
      die.sides = 4;
    } else if (sides > 12) {
      const difference = sides - 12;
      die.sides = 12;
      die.modifier += difference / 2;
    }
    return die;
  }

  private _buildWildDie(sides = 6): WildDie {
    return new WildDie({ faces: sides });
  }

  private _calcImperialCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return Math.max((strength.sides / 2 - 1 + modifier) * 20, 0);
  }

  private _calcMetricCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return Math.max((strength.sides / 2 - 1 + modifier) * 10, 0);
  }

  /** Calculates the correct armor value based on SWADE v5.0 and returns that value */
  calcArmor(): number {
    const torsoArmor = this._getArmorForLocation(
      constants.ARMOR_LOCATIONS.TORSO,
    );
    return this._calcDerivedEffects('armor', torsoArmor);
  }

  /** Calculates the Toughness value without armor and returns it */
  calcToughness(): number {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return 0;
    /** base value of all toughness calculations */
    const toughnessBaseValue = 2;

    const sources: DerivedModifier[] = this.system.stats.toughness.sources;

    //get the base values we need
    const vigor = this.system.attributes.vigor.die.sides!;
    const vigMod = this.system.attributes.vigor.die.modifier!;
    // const toughMod = this.system.stats.toughness.modifier;

    let finalToughness = Math.round(vigor / 2) + toughnessBaseValue;
    if (vigMod > 0) {
      finalToughness += Math.floor(vigMod / 2);
    }
    sources.push({
      label: game.i18n.localize('SWADE.AttrVig'),
      value: finalToughness,
    });

    const size = this.system.stats.size ?? 0;
    finalToughness += size;
    if (size !== 0) {
      sources.push({
        label: game.i18n.localize('SWADE.Size'),
        value: size,
      });
    }

    //add the toughness from the armor
    for (const armor of this.itemTypes.armor) {
      if (!(armor.system instanceof ArmorData)) continue;
      if (armor.isReadied && armor.system.locations.torso) {
        finalToughness += Number(armor.system.toughness);
        sources.push({
          label: armor.name,
          value: armor.system.toughness!,
        });
      }
    }
    return this._calcDerivedEffects('toughness', finalToughness);
  }

  calcParry(): number {
    if (
      this.system instanceof VehicleData ||
      this.system instanceof CreatureData
    ) {
      return this._calcDerivedEffects('parry', this.system.calcParry());
    }
    return 0;
  }

  private _calcDerivedEffects(
    target: 'parry' | 'toughness' | 'armor',
    derivedStat: number,
  ): number {
    let effects: DerivedModifier[] = [];
    let sources: DerivedModifier[] = [];
    if (
      this.system instanceof CreatureData ||
      this.system instanceof VehicleData
    ) {
      effects =
        target === 'armor'
          ? (this.system.stats.toughness?.armorEffects ?? [])
          : this.system.stats[target].effects;
      sources =
        target === 'armor'
          ? new Array<DerivedModifier>() // currently gets discarded
          : this.system.stats[target].sources;
    }

    effects.forEach((e: DerivedModifier) => {
      switch (e.mode) {
        case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
          derivedStat *= e.value;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
        case CONST.ACTIVE_EFFECT_MODES.ADD:
          derivedStat += e.value;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
        case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          if (derivedStat > e.value) {
            derivedStat = e.value;
            sources.length = 0;
            sources.push({
              label: e.label,
              value: e.value,
              mode: e.mode,
            });
          }
          break;
        case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          if (derivedStat < e.value) {
            derivedStat = e.value;
            sources.length = 0;
            sources.push({
              label: e.label,
              value: e.value,
              mode: e.mode,
            });
          }
          break;
        case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
          derivedStat = e.value;
          sources.length = 0;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
      }
    });
    return derivedStat;
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns The total amount of armor for that location
   */
  private _getArmorForLocation(location: ArmorLocation): number {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return 0;

    return Object.values(this._getArmorSourcesForLocation(location)).reduce(
      (acc, value) => (acc += value),
      0,
    );
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns A record of armor sources and values
   */
  private _getArmorSourcesForLocation(
    location: ArmorLocation,
  ): Record<string, number> {
    const armorSources = {};
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return armorSources;

    const [regularArmor, naturalArmor] = this.itemTypes.armor
      .filter((i) => {
        //filter away armor that doesn't match the location and isn't equipped
        const system = i.system as ArmorData;
        const isEquipped = system.equipStatus! > constants.EQUIP_STATE.CARRIED;
        return isEquipped && system.locations[location];
      })
      .map((i) => {
        // map the data into a usable format
        const system = i.system as ArmorData;
        return {
          name: i.name,
          armor: system.armor as number,
          isNaturalArmor: system.isNaturalArmor as boolean,
        } satisfies ArmorCalcContext;
      })
      .sort((a, b) => b.armor - a.armor) // sort the items by armor value, descending
      .partition((i) => i.isNaturalArmor); //split them into natural and regular armor

    const isCoreStacking =
      game.settings.get('swade', 'armorStacking') ===
      constants.ARMOR_STACKING.CORE;

    const [baseArmor, extraArmor] = regularArmor;
    if (baseArmor) {
      armorSources[baseArmor.name] = baseArmor.armor;
      if (extraArmor && isCoreStacking) {
        armorSources[extraArmor.name] = Math.floor(extraArmor.armor / 2);
      }
    }

    //add the natural armor to the object
    return naturalArmor.reduce((acc, cur) => {
      acc[cur.name] = cur.armor;
      return acc;
    }, armorSources);
  }

  getPTTooltip(target: 'parry' | 'toughness'): string {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return '';
    let tooltip =
      target === 'parry'
        ? `<h4>${game.i18n.localize('SWADE.Parry')}
       ${this.system.stats.parry.value}
      (${this.system.stats.parry.shield})</h4>`
        : `<h4>${game.i18n.localize('SWADE.Tough')}
       ${this.system.stats.toughness.value}
      (${this.system.stats.toughness.armor})</h4>`;

    tooltip += this._sourcesToTooltip(this.system.stats[target].sources);

    return tooltip;
  }

  getArmorTooltip(): string {
    if (this.system instanceof VehicleData || this.system instanceof GroupData)
      return '';
    let tooltip = '';

    const armor = this.armorPerLocation;
    tooltip += game.i18n.localize('SWADE.Head') + `: ${armor.head}<br>`;
    tooltip += game.i18n.localize('SWADE.Torso') + `: ${armor.torso}<br>`;
    tooltip += game.i18n.localize('SWADE.Arms') + `: ${armor.arms}<br>`;
    tooltip += game.i18n.localize('SWADE.Legs') + `: ${armor.legs}<hr>`;

    tooltip += this._sourcesToTooltip(this.system.stats.toughness.armorEffects);

    tooltip += Object.entries(
      this._getArmorSourcesForLocation(constants.ARMOR_LOCATIONS.TORSO),
    ).reduce((acc, [source, value]) => acc + `${source}: ${value}<br>`, '');

    return tooltip;
  }

  /**
   * Looks up the combatant instance for this actor in a given Combat encounter, taking into account whether the actor is an unlinked token or not.
   * @param combat The combat instance to look in.
   * @returns The found combatant for this actor, if one exists
   */
  getCombatant(combat?: Combat): SwadeCombatant | undefined {
    if (!combat) return;
    const combatant = this.isToken
      ? combat?.getCombatantsByToken(this.token?.id as string)[0]
      : combat?.getCombatantsByActor(this.id as string)[0];
    return combatant as SwadeCombatant;
  }

  private _sourcesToTooltip(sources: DerivedModifier[]): string {
    let tooltip = '';

    sources.forEach((source) => {
      let effect = '';
      switch (source.mode) {
        case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
          effect = 'x' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          effect =
            game.i18n.localize('EFFECT.MODE_DOWNGRADE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          effect =
            game.i18n.localize('EFFECT.MODE_UPGRADE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
          effect =
            game.i18n.localize('EFFECT.MODE_OVERRIDE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.ADD:
        default:
          effect = (source.value ?? 0).signedString();
      }
      tooltip += `${source.label}: ${effect}<br>`;
    });

    return tooltip;
  }

  private _filterOverrides() {
    const overrides = foundry.utils.flattenObject(this.overrides);
    for (const k of Object.keys(overrides)) {
      if (k.startsWith('@')) {
        delete overrides[k];
      }
    }
    this.overrides = foundry.utils.expandObject(overrides);
  }

  protected override _onUpdate(
    changed: Actor.UpdateData,
    options: Actor.Database.OnUpdateOperation,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    if (
      foundry.utils.hasProperty(changed, 'system.bennies') &&
      this.hasPlayerOwner
    ) {
      ui.players?.render(true);
    }
    if (
      foundry.utils.hasProperty(options, 'swade.wounds.value') ||
      foundry.utils.hasProperty(options, 'swade.fatigue.value')
    ) {
      const isDamage = foundry.utils.hasProperty(changed, 'system.wounds.value')
        ? changed.system.wounds.value > options.swade!.wounds!.value!
        : foundry.utils.hasProperty(changed, 'system.fatigue.value')
          ? changed.system.fatigue.value > options.swade!.fatigue!.value!
          : false;
      const tokens = this.getActiveTokens(true, false);
      for (const token of tokens) {
        token.ring?.flashColor(
          isDamage ? Color.from('#D41159') : Color.from('#1A85FF'),
          {
            duration: 1000,
            easing: CONFIG.Token.ring.ringClass.createSpikeEasing(0.4),
          },
        );
      }
    }
  }
}

export default SwadeActor;

type ArmorLocation = ValueOf<typeof constants.ARMOR_LOCATIONS>;

interface ArmorCalcContext {
  name: string;
  armor: number;
  isNaturalArmor: boolean;
}
