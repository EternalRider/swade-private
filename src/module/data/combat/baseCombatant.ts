import { DeepPartial, EmptyObject } from 'fvtt-types/utils';
import type SwadeCombatant from '../../documents/combat/SwadeCombatant';
import { SWADE } from '../../config';
import { firstOwner } from '../../util';

/**
 * External function to define the schema for the BaseCombatant type
 * Used to prevent type recursion issues
 */
function baseCombatantSchema() {
  const fields = foundry.data.fields;
  return {
    suitValue: new fields.NumberField(),
    cardValue: new fields.NumberField(),
    cardString: new fields.StringField(),
    hasJoker: new fields.BooleanField(),
    roundHeld: new fields.NumberField(),
    turnLost: new fields.BooleanField(),
    firstRound: new fields.NumberField(),
    // jokerBenniesGiven field removed
  };
}

export declare namespace BaseCombatantModel {
  interface Schema extends ReturnType<typeof baseCombatantSchema> {}
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

export class BaseCombatantModel<
  Schema extends BaseCombatantModel.Schema = BaseCombatantModel.Schema,
  BaseData extends BaseCombatantModel.BaseData = BaseCombatantModel.BaseData,
  DerivedData extends BaseCombatantModel.DerivedData = BaseCombatantModel.DerivedData,
> extends foundry.abstract.TypeDataModel<Schema, SwadeCombatant, BaseData, DerivedData> {
  static override defineSchema() {
    return baseCombatantSchema();
  }

  override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<Schema, SwadeCombatant>,
    options: Combatant.Database.PreUpdateOptions,
    user: User
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const combatants = game?.combat?.combatants.size ?? 0;
    const tokenID = data.tokenId instanceof TokenDocument ? data.tokenId.id : data.tokenId;
    const tokenIndex = canvas.tokens?.controlled.map((t) => t.id).indexOf(tokenID as string) ?? 0;
    const sortValue = tokenIndex + combatants;
    this.updateSource({
      firstRound: this.parent.combat?.round,
      cardValue: sortValue,
      suitValue: sortValue,
    });
  }

  override _onUpdate(
    changed: DeepPartial<foundry.abstract.TypeDataModel.ParentAssignmentType<Schema, SwadeCombatant>>,
    options: Combatant.Database.OnUpdateOperation,
    userId: string
  ) {
    super._onUpdate(changed, options, userId);
    const hasCardChanged =
      foundry.utils.hasProperty(changed, 'system.cardValue') || foundry.utils.hasProperty(changed, 'system.suitValue');
    const holdRemoved = foundry.utils.getProperty(changed, 'system.-=roundHeld') === null;
    if (hasCardChanged && !holdRemoved && game.userId === userId) {
      this.handOutBennies();
    }
  }

  /** Checks if this combatant has a joker and hands out bennies based on the actor type and disposition */
  async handOutBennies() {
    if (
      !game.settings.get('swade', 'jokersWild') ||
      this.parent.groupId ||
      !this.parent.hasJoker ||
      // jokerBenniesGiven check removed
      !this.parent
    )
      return;
    await this.#createJokersWildMessage();
    // TODO: This is actually going to be a collection, rather than an array
    const combatants = this.parent.parent!.combatants;
    const isTokenHostile = this.parent.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
    //Give bennies to PCs
    if (this.parent.actor?.type === 'character') {
      await this.#friendlyBennies(combatants);
    } else if (this.parent.actor?.type === 'npc' && isTokenHostile) {
      await this.#adversaryBennies(combatants);
    }
    // Removed update for jokerBenniesGiven
  }

  async #friendlyBennies(combatants: foundry.utils.Collection<SwadeCombatant>) {
    //filter combatants for PCs and give them bennies
    const pcs = combatants.filter((c) => c.actor?.type === 'character');
    await this.#triggerBennies(pcs);
  }

  async #adversaryBennies(combatants: foundry.utils.Collection<SwadeCombatant>) {
    //give all GMs a benny
    const gmUsers = game.users!.filter((u) => u.active && u.isGM);
    for (const gm of gmUsers) await gm.getBenny();
    //give all enemy wildcards a benny
    const hostiles = combatants.filter((c) => {
      const isHostile = c.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
      return c.actor?.type === 'npc' && isHostile && c.actor?.isWildcard;
    });
    await this.#triggerBennies(hostiles);
  }

  async #triggerBennies(combatants: SwadeCombatant[]) {
    for (const c of combatants) {
      if (c.actor?.isOwner) await c.actor?.getBenny();
      else game.swade.sockets.giveBenny([firstOwner(c.actor)?.id as string], [c.actor?.uuid ?? '']);
    }
  }

  async #createJokersWildMessage() {
    await getDocumentClass('ChatMessage').create({
      author: game.userId,
      content: await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.joker, {
        speaker: game.user,
      }),
    });
  }
}
