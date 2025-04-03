import { AdditionalStat } from '../../../../interfaces/additional.interface';
import { SwadeRoll } from '../../../dice/SwadeRoll';
import type SwadeActor from '../../../documents/actor/SwadeActor';
import type SwadeItem from '../../../documents/item/SwadeItem';
import { makeAdditionalStatsSchema } from '../../shared/additionalStats';

declare namespace SwadeBaseActorData {
  interface Schema extends foundry.data.fields.DataSchema {
    additionalStats: ReturnType<typeof makeAdditionalStatsSchema>;
  }
  type BaseData = {};
  type DerivedData = {};
}

export type TokenSize = { width: number; height: number };

class SwadeBaseActorData<
  Schema extends SwadeBaseActorData.Schema,
  BaseData extends SwadeBaseActorData.BaseData,
  DerivedData extends SwadeBaseActorData.DerivedData,
> extends foundry.abstract.TypeDataModel<
  Schema,
  SwadeActor,
  BaseData,
  DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): SwadeBaseActorData.Schema {
    return {
      additionalStats: makeAdditionalStatsSchema(),
    };
  }

  get tokenSize(): TokenSize {
    return { width: 1, height: 1 };
  }

  getRollData(_includeModifiers = true): Record<string, number | string> {
    return {};
  }

  async rollAdditionalStat(stat: string) {
    const statData: AdditionalStat = this.additionalStats[stat];
    if (statData.dtype !== 'Die') return;
    let modifier = statData.modifier || '';
    if (!!modifier && !modifier.match(/^[+-]/)) {
      modifier = '+' + modifier;
    }
    //return early if there's no data to roll
    if (!statData.value) return;
    const roll = new SwadeRoll(
      `${statData.value}${modifier}`,
      this.getRollData(),
    );
    await roll.evaluate();
    const message = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      flavor: statData.label,
    });
    return message;
  }

  getParryBaseSkill(): SwadeItem<'skill'> | undefined {
    return undefined;
  }

  /**
   * Actor type specific preparation of embedded documents
   * @see {@link Actor.prepareEmbeddedDocuments}
   */
  prepareEmbeddedDocuments() {
    if (!this.parent) return;
    for (const effect of this.parent.effects) effect._safePrepareData();
    this.parent.applyActiveEffects();
    const sortedItems = this.parent.items.contents.sort((a, b) => {
      // make sure actions come first
      if (a.type === 'action' && b.type !== 'action') return -1;
      if (a.type !== 'action' && b.type === 'action') return 1;
      return 0;
    });
    for (const item of sortedItems) item._safePrepareData();
  }
}

export { SwadeBaseActorData };
