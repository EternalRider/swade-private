import { AdditionalStat } from '../../../../interfaces/additional.interface';
import { SwadeRoll } from '../../../dice/SwadeRoll';
import type SwadeActor from '../../../documents/actor/SwadeActor';
import type SwadeItem from '../../../documents/item/SwadeItem';
import { makeAdditionalStatsSchema } from '../../shared/additionalStats';
import { AuraPointSource } from '../../../canvas/AuraPointSource';
import { AuraData } from '../../../../interfaces/AuraData.interface';

const fields = foundry.data.fields;

declare namespace SwadeBaseActorData {
  interface Schema extends foundry.data.fields.DataSchema {
    additionalStats: ReturnType<typeof makeAdditionalStatsSchema>;
  }
  type BaseData = {};
  type DerivedData = {
    auras: Record<string, AuraData>;
  };
}

export type TokenSize = { width: number; height: number };

class SwadeBaseActorData<
  Schema extends SwadeBaseActorData.Schema = SwadeBaseActorData.Schema,
  BaseData extends SwadeBaseActorData.BaseData = SwadeBaseActorData.BaseData,
  DerivedData extends SwadeBaseActorData.DerivedData = SwadeBaseActorData.DerivedData,
> extends foundry.abstract.TypeDataModel<
  Schema,
  SwadeActor,
  BaseData,
  DerivedData
> {
  static override defineSchema(): SwadeBaseActorData.Schema {
    return {
      additionalStats: makeAdditionalStatsSchema(),
  
      category: new fields.StringField({ 
        required: false, 
        initial: ''
      }),

      auras: new fields.TypedObjectField(
        new fields.SchemaField({
          enabled: new fields.BooleanField({
            label: 'SWADE.Auras.Enabled',
            required: true,
          }),
          radius: new fields.NumberField({
            label: 'SWADE.Auras.Range',
            min: 0,
            step: 1,
            required: true,
            initial: 5,
          }),
          color: new fields.ColorField({
            label: 'SWADE.Auras.Color',
            initial: () => game.user?.color.css ?? '#000000',
          }),
          alpha: new fields.NumberField({
            label: 'SWADE.Auras.Alpha',
            min: 0,
            max: 1,
            step: 0.05,
            required: true,
            initial: 0.25,
          }),
          walls: new fields.BooleanField({
            label: 'SWADE.Auras.WallConstraints.Label',
            hint: 'SWADE.Auras.WallConstraints.Hint',
            required: true,
          }),
          visibleTo: new fields.SetField(
            new fields.NumberField({
              choices: {
                [CONST.TOKEN_DISPOSITIONS.HOSTILE]: 'TOKEN.DISPOSITION.HOSTILE',
                [CONST.TOKEN_DISPOSITIONS.NEUTRAL]: 'TOKEN.DISPOSITION.NEUTRAL',
                [CONST.TOKEN_DISPOSITIONS.FRIENDLY]: 'TOKEN.DISPOSITION.FRIENDLY',
              },
              required: true,
            }),
            {
              label: 'SWADE.Aura.Visibility.Label',
              hint: 'SWADE.Aura.Visibility.Hint',
              required: true,
              initial: [],
            },
          ),
        }),
        {
          initial: {
            aura1: {
              ...AuraPointSource.defaultData,
            },
            aura2: {
              ...AuraPointSource.defaultData,
            },
          },
        },
      ),
    };
  }

  override prepareDerivedData(this: SwadeBaseActorData) {
    super.prepareDerivedData();
    // Ensure all auras have defaults if not provided
    const userColor =
      game.users.find((u) => u.character === this.parent)?.color?.css ??
      '#000000';
    for (const [auraKey, aura] of Object.entries(this.auras)) {
      this.auras[auraKey] = {
        ...AuraPointSource.defaultData,
        color: userColor,
        ...aura,
      };
    }
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
