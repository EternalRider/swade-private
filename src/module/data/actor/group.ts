import { constants } from '../../constants';
import type SwadeActor from '../../documents/actor/SwadeActor';
import {
  DocumentFn,
  ForeignDocumentUUIDField,
} from '../fields/ForeignDocumentUUIDField';
import { SwadeBaseActorData } from './base';

const fields = foundry.data.fields;

interface GroupMember {
  actor: SwadeActor<'character' | 'npc'> | null;
}

declare namespace GroupData {
  interface Schema extends DataSchema {
    supplyLevels: ReturnType<(typeof GroupData)['makeSupplyLevelSchema']>;
    members: foundry.data.fields.SetField<ForeignDocumentUUIDField>;
    description: foundry.data.fields.HTMLField<{ textSearch: true }>;
    locked: foundry.data.fields.BooleanField<{
      gmOnly: true;
      hint: string;
      label: string;
    }>;
  }
  type BaseData = {
    members: Map<string, GroupMember>;
  };
  type DerivedData = {};
}

class GroupData<
  Schema extends GroupData.Schema = GroupData.Schema,
  BaseData extends GroupData.BaseData = GroupData.BaseData,
  DerivedData extends GroupData.DerivedData = GroupData.DerivedData,
> extends SwadeBaseActorData<Schema, BaseData, DerivedData> {
  static override defineSchema(): DataSchema {
    return {
      ...super.defineSchema(),
      members: new fields.SetField(
        new ForeignDocumentUUIDField({
          type: 'Actor',
          validate: (
            value: string,
            _options: DataField.ValidationOptions<foundry.data.fields.StringField>,
          ) => {
            if (value.startsWith('Compendium')) {
              return new foundry.data.validation.DataModelValidationFailure({
                unresolved: true,
                invalidValue: value,
                message: 'Groups cannot contain actors from Compendiums!',
              });
            }
          },
        }),
        {
          label: 'SWADE.Group.Sheet.Members.Header',
          hint: 'SWADE.Group.Sheet.Members.Hint',
        },
      ),
      description: new fields.HTMLField({ textSearch: true }),
      locked: new fields.BooleanField({
        gmOnly: true,
        label: 'SWADE.Group.Sheet.Lock.Label',
        hint: 'SWADE.Group.Sheet.Lock.Hint',
      }),
      supplyLevels: this.makeSupplyLevelSchema(),
    };
  }

  static #supplyLevelField = (label: string) =>
    new fields.NumberField({
      initial: constants.SUPPLY_LEVEL.HIGH,
      integer: true,
      choices: {
        [constants.SUPPLY_LEVEL.OUT]: 'SWADE.Supplies.Level.Out',
        [constants.SUPPLY_LEVEL.LOW]: 'SWADE.Supplies.Level.Low',
        [constants.SUPPLY_LEVEL.HIGH]: 'SWADE.Supplies.Level.High',
        [constants.SUPPLY_LEVEL.VERY_HIGH]: 'SWADE.Supplies.Level.VeryHigh',
      },
      label,
    });

  private static makeSupplyLevelSchema = () =>
    new fields.SchemaField(
      {
        ammo: this.#supplyLevelField('SWADE.Supplies.Ammo.Label'),
        fuel: this.#supplyLevelField('SWADE.Supplies.Fuel.Label'),
        food: this.#supplyLevelField('SWADE.Supplies.Food.Label'),
        supply: this.#supplyLevelField('SWADE.Supplies.Supply.Label'),
      },
      { label: 'SWADE.Supplies.Label' },
    );

  override prepareBaseData(this: GroupData) {
    super.prepareBaseData();
    this.members = new Map<string, GroupMember>(
      this.members.map<[string, GroupMember]>((fn: DocumentFn<SwadeActor>) => {
        const result = fn();
        if (typeof result === 'string') return [result, { actor: null }];
        return [result.uuid as string, { actor: result }];
      }),
    );
  }

  get wildcard() {
    return false;
  }
}

export { GroupData, GroupMember };
