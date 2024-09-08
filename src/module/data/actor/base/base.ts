import type SwadeActor from '../../../documents/actor/SwadeActor';

declare namespace SwadeBaseActorData {
  type Schema = {};
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
    return {};
  }

  get tokenSize(): TokenSize {
    return { width: 1, height: 1 };
  }
}

export { SwadeBaseActorData };
