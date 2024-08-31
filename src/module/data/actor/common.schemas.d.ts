import { DiceField } from '../common.interface';

type DataFieldLabel = { label: string };
type DataFieldHint = { hint: string };

type RunningDieSchema = foundry.data.fields.SchemaField<
  {
    die: DiceField;
    mod: foundry.data.fields.NumberField<{
      initial: 0;
      integer: true;
    }>;
  },
  DataFieldLabel
>;

export type PaceFieldConfig = {
  nullable: true;
  initial: number | null;
  integer: true;
  min: 0;
} & DataFieldLabel;

export type PaceSchema = {
  base: foundry.data.fields.StringField<{
    required: boolean;
    initial: 'ground';
    choices: Record<string, string>;
  }> &
    DataFieldLabel &
    DataFieldHint;
  ground: foundry.data.fields.NumberField<PaceFieldConfig>;
  fly: foundry.data.fields.NumberField<PaceFieldConfig>;
  swim: foundry.data.fields.NumberField<PaceFieldConfig>;
  burrow: foundry.data.fields.NumberField<PaceFieldConfig>;
  running: RunningDieSchema;
};

export type InitiativeSchema = foundry.data.fields.SchemaField<
  {
    hasHesitant: foundry.data.fields.BooleanField<DataFieldLabel>;
    hasLevelHeaded: foundry.data.fields.BooleanField<DataFieldLabel>;
    hasImpLevelHeaded: foundry.data.fields.BooleanField<DataFieldLabel>;
    hasQuick: foundry.data.fields.BooleanField<DataFieldLabel>;
  },
  DataFieldLabel
>;

export type StatusSchema = foundry.data.fields.SchemaField<
  {
    isShaken: foundry.data.fields.BooleanField<DataFieldLabel>;
    isDistracted: foundry.data.fields.BooleanField<DataFieldLabel>;
    isVulnerable: foundry.data.fields.BooleanField<DataFieldLabel>;
    isStunned: foundry.data.fields.BooleanField<DataFieldLabel>;
    isEntangled: foundry.data.fields.BooleanField<DataFieldLabel>;
    isBound: foundry.data.fields.BooleanField<DataFieldLabel>;
    isIncapacitated: foundry.data.fields.BooleanField<DataFieldLabel>;
  },
  DataFieldLabel
>;

export type AdvanceSchema = foundry.data.fields.SchemaField<
  {
    mode: foundry.data.fields.StringField<
      {
        initial: 'expanded';
        choices: ['legacy', 'expanded'];
      } & DataFieldLabel
    >;
    value: foundry.data.fields.NumberField<{ initial: 0 } & DataFieldLabel>;
    rank: foundry.data.fields.StringField<
      {
        initial: 'Novice';
        textSearch: true;
      } & DataFieldLabel
    >;
    details: foundry.data.fields.HTMLField<{ initial: '' } & DataFieldLabel>;
    list: foundry.data.fields.ArrayField<
      foundry.data.fields.SchemaField<{
        type: foundry.data.fields.NumberField<{ initial: 0 } & DataFieldLabel>;
        notes: foundry.data.fields.HTMLField<{ initial: '' } & DataFieldLabel>;
        sort: foundry.data.fields.NumberField<{ initial: 0 } & DataFieldLabel>;
        planned: foundry.data.fields.BooleanField<DataFieldLabel>;
        id: foundry.data.fields.StringField<{ initial: '' } & DataFieldLabel>;
        rank: foundry.data.fields.NumberField<{ initial: 0 } & DataFieldLabel>;
      }>,
      DataFieldLabel
    >;
  },
  DataFieldLabel
>;
