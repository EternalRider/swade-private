import { DeepPartial } from 'fvtt-types/utils';
import { RollModifier } from '../../../interfaces/additional.interface';
import type SwadeActor from '../../documents/actor/SwadeActor';
import { TraitDie } from '../../documents/actor/SwadeActor.interface';
import type SwadeItem from '../../documents/item/SwadeItem';
import { addUpModifiers, createEmbedElement } from '../../util';
import { DiceTrait } from '../common.interface';
import { boundTraitDie, makeTraitDiceFields } from '../shared';
import { SwadeBaseItemData } from './base/base';
import { constants } from '../../constants';

declare namespace SkillData {
  interface Schema extends SwadeBaseItemData.Schema, DiceTrait {
    attribute: foundry.data.fields.StringField<{ initial: '' }>;
    isCoreSkill: foundry.data.fields.BooleanField<{ label: string }>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {
    die: TraitDie;
    effects: RollModifier[];
  }
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class SkillData extends SwadeBaseItemData<
  SkillData.Schema,
  SkillData.BaseData,
  SkillData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): SkillData.Schema {
    return {
      ...super.defineSchema(),
      ...makeTraitDiceFields(),
      attribute: new foundry.data.fields.StringField({
        initial: '',
        label: 'SWADE.Attribute',
      }),
      isCoreSkill: new foundry.data.fields.BooleanField({
        label: 'SWADE.CoreSkill',
      }),
    };
  }

  override prepareBaseData() {
    this.effects ??= new Array<RollModifier>();
  }

  override prepareDerivedData() {
    this.die = boundTraitDie(this.die);
    this['wild-die'].sides = Math.min(this['wild-die'].sides as number, 12);
  }

  get modifier(): number {
    let mod = this.die.modifier;
    const attribute = this.attribute;
    const globals = this.parent.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    mod += this.effects?.reduce(addUpModifiers, 0);
    mod += globals?.trait.reduce(addUpModifiers, 0) ?? 0;
    if (attribute) mod += globals?.[attribute]?.reduce(addUpModifiers, 0);
    return mod;
  }

  get canRoll(): boolean {
    return !!this.parent.actor;
  }

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<
      SkillData.Schema,
      Item<'skill'>
    >,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.description,
        {
          ...options,
        },
      );
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/skill-embeds.hbs',
      ['item-embed', 'skill'],
    );
  }

  protected override _onUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        SkillData.Schema,
        SwadeItem
      >
    >,
    options: Item.Database.OnUpdateOperation,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);

    if (!this.actor) return;
    //gather all vehicle documents
    const allVehicles: SwadeActor<'vehicle'>[] = game.actors
      .filter((a) => a.type === 'vehicle')
      .concat(
        game.scenes.contents
          .flatMap((scene) => scene.tokens.contents)
          .filter((token) => !token.actorLink)
          .map((token) => token.actor)
          .filter((doc) => doc?.type === 'vehicle'),
      );
    //filter down to only the vehicles this skill's actor is an operator of
    const filtered = allVehicles.filter((vehicle) =>
      vehicle.system.crew.members.find(
        (m) =>
          m.uuid === this.actor?.uuid &&
          m.role === constants.CREW_ROLE.OPERATOR,
      ),
    );
    for (const vehicle of filtered) {
      //possibly trigger dataprep again
      if (
        [
          vehicle.system.driver.skill,
          vehicle.system.driver.skillAlternative,
        ].includes(this.parent.name)
      ) {
        vehicle.reset();
        vehicle.sheet?.render();
      }
    }
  }
}

export { SkillData };
