import {
  AbilitySubType,
  AdditionalStats,
  EquipState,
  LinkedAttribute,
} from '../../../globals';
import { ItemAction } from '../../../interfaces/additional.interface';
import { TraitDie, WildDie } from '../actor/actor-data-source';

declare global {
  interface SourceConfig {
    Item: SwadeItemDataSource;
  }
  interface DataConfig {
    Item: SwadeItemDataSource;
  }
}

export type SwadeItemDataSource =
  | WeaponItemDataSource
  | GearItemDataSource
  | ArmorItemDataSource
  | ShieldItemDataSource
  | EdgeItemDataSource
  | HindranceItemDataSource
  | PowerItemDataSource
  | SkillItemDataSource
  | AbilityItemDataSource;

interface PhysicalItem extends Equipable, ArcaneDevice, Actions {
  weight: number;
  price: number;
  quantity: number;
}

interface ArcaneDevice {
  isArcaneDevice: boolean;
  arcaneSkillDie: TraitDie;
  powerPoints: {
    value: number;
    max: number;
  } & Record<string, { value: number; max: number }>;
}

interface Favorite {
  favorite: true;
}

interface Equipable {
  equippable: boolean;
  /** @deprecated */
  equipped: boolean;
  equipStatus: EquipState;
}

interface ItemDescription {
  description: string;
  notes: string;
  additionalStats: AdditionalStats;
}

interface Vehicular {
  isVehicular: boolean;
  mods: number;
}

interface Actions {
  actions: {
    skill: string;
    skillMod: string;
    dmgMod: string;
    additional: Partial<Record<string, ItemAction>>;
  };
}

interface BonusDamage {
  bonusDamageDie: number;
}

interface WeaponData
  extends PhysicalItem,
    ItemDescription,
    Vehicular,
    BonusDamage,
    Favorite {
  damage: string;
  range: string;
  rof: number;
  ap: number;
  minStr: string;
  shots: number;
  currentShots: number;
  ammo: string;
  autoReload: boolean;
  parry: number;
  trademark: 0 | 1 | 2;
}

interface GearData extends ItemDescription, PhysicalItem, Vehicular, Favorite {}

interface ArmorData extends ItemDescription, PhysicalItem, Favorite {
  minStr: string;
  armor: number | string;
  toughness: number;
  isNaturalArmor: boolean;
  locations: {
    head: boolean;
    torso: boolean;
    arms: boolean;
    legs: boolean;
  };
}

interface ShieldData
  extends ItemDescription,
    PhysicalItem,
    Actions,
    BonusDamage,
    Favorite {
  minStr: string;
  parry: number;
  cover: number;
}

interface EdgeData extends ItemDescription, Favorite {
  isArcaneBackground: boolean;
  requirements: {
    value: string;
  };
}

interface HindranceData extends ItemDescription, Favorite {
  major: boolean;
}

interface PowerData extends ItemDescription, Actions, BonusDamage, Favorite {
  rank: string;
  pp: string;
  damage: string;
  range: string;
  duration: string;
  trapping: string;
  arcane: string;
  ap: number;
  modifiers: any[];
}

interface AbilityData extends ItemDescription, Favorite {
  subtype: AbilitySubType;
  grantsPowers: boolean;
}

interface SkillData extends ItemDescription {
  attribute: LinkedAttribute;
  isCoreSkill: boolean;
  die: TraitDie;
  'wild-die': WildDie;
}

interface WeaponItemDataSource {
  data: WeaponData;
  type: 'weapon';
}

interface GearItemDataSource {
  data: GearData;
  type: 'gear';
}

interface ArmorItemDataSource {
  data: ArmorData;
  type: 'armor';
}

interface ShieldItemDataSource {
  data: ShieldData;
  type: 'shield';
}

interface EdgeItemDataSource {
  data: EdgeData;
  type: 'edge';
}

interface HindranceItemDataSource {
  data: HindranceData;
  type: 'hindrance';
}

interface PowerItemDataSource {
  data: PowerData;
  type: 'power';
}

interface SkillItemDataSource {
  data: SkillData;
  type: 'skill';
}

interface AbilityItemDataSource {
  data: AbilityData;
  type: 'ability';
}
