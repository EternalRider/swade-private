const fields = foundry.data.fields;

declare namespace AttackModifiersRegionBehaviorType {
  interface Schema extends foundry.data.fields.DataSchema {
    illumination: foundry.data.fields.StringField;
    cover: foundry.data.fields.StringField;
    unstablePlatform: foundry.data.fields.BooleanField;
  }
}

class AttackModifiersRegionBehaviorType 
  extends foundry.data.regionBehaviors.RegionBehaviorType<AttackModifiersRegionBehaviorType.Schema> {
  static override LOCALIZATION_PREFIXES = ['BEHAVIOR.TYPES.base', 'SWADE.BEHAVIOR.TYPES.attackModifiers'];
  static override defineSchema() {
    return {
      illumination: new fields.StringField({
        choices: {
          illuminationDim: 'SWADE.Illumination.Dim',
          illuminationDark: 'SWADE.Illumination.Dark',
          illuminationPitch: 'SWADE.Illumination.Pitch',
        },
        nullable: true,
      }),
      cover: new fields.StringField({
        choices: {
          coverLight: 'SWADE.Cover.Light',
          coverMedium: 'SWADE.Cover.Medium',
          coverHeavy: 'SWADE.Cover.Heavy',
          coverTotal: 'SWADE.Cover.Total',
        },
        nullable: true,
      }),
      unstablePlatform: new fields.BooleanField({
        label: 'SWADE.UnstablePlatform',
        initial: false,
      }),
    };
  }
}

export { AttackModifiersRegionBehaviorType };