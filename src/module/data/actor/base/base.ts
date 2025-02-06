import type SwadeActor from '../../../documents/actor/SwadeActor';
import { makeAdditionalStatsSchema } from '../../shared/additionalStats';

declare namespace SwadeBaseActorData {
  interface Schema {
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
