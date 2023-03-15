import {
  AbilitySubType,
  AdditionalStats,
  EquipState,
  LinkedAttribute,
} from '../../../globals';
import { ItemAction } from '../../../interfaces/additional.interface';
import { TraitDie, WildDie } from '../actor/actor-data-source';
import { ItemGrant } from './SwadeItem.interface';

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
  | AbilityItemDataSource
  | ConsumableDataSource
  | ActionItemDataSource;

interface PhysicalItem {
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

interface Equippable {
  equippable: boolean;
  equipStatus: EquipState;
}

interface EquipStatus {
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
    isHeavyWeapon: boolean;
  };
}

interface GrantEmbedded {
  grants: Array<ItemGrant>;
  grantOn: number;
}

interface BonusDamage {
  bonusDamageDie: number;
  bonusDamageDice: number;
}

interface Templates {
  templates: {
    cone: boolean;
    stream: boolean;
    small: boolean;
    medium: boolean;
    large: boolean;
  };
}

interface Category {
  category: string;
}

interface WeaponData
  extends PhysicalItem,
    ItemDescription,
    Vehicular,
    BonusDamage,
    Favorite,
    ArcaneDevice,
    Equippable,
    Actions,
    Templates,
    Category,
    GrantEmbedded {
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
  isHeavyWeapon: boolean;
}

interface GearData
  extends ItemDescription,
    PhysicalItem,
    Vehicular,
    Favorite,
    ArcaneDevice,
    Equippable,
    Actions,
    Category,
    GrantEmbedded {
  isAmmo: boolean;
}

interface ArmorData
  extends ItemDescription,
    PhysicalItem,
    Favorite,
    ArcaneDevice,
    Equippable,
    Actions,
    Category,
    GrantEmbedded {
  minStr: string;
  armor: number | string;
  toughness: number;
  isNaturalArmor: boolean;
  isHeavyArmor: boolean;
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
    Favorite,
    ArcaneDevice,
    Equippable,
    Actions,
    Category,
    GrantEmbedded {
  minStr: string;
  parry: number;
  cover: number;
}

interface ConsumableData
  extends PhysicalItem,
    ItemDescription,
    Favorite,
    EquipStatus,
    Category,
    GrantEmbedded {
  charges: {
    max: number;
    value: number;
  };
  messageOnUse: boolean;
  destroyOnEmpty: boolean;
}

interface EdgeData extends ItemDescription, Favorite, Category {
  isArcaneBackground: boolean;
  requirements: {
    value: string;
  };
  grants: Array<ItemGrant>;
}

interface HindranceData extends ItemDescription, Favorite {
  major: boolean;
  grants: Array<ItemGrant>;
}

interface PowerData
  extends ItemDescription,
    Actions,
    BonusDamage,
    Favorite,
    Templates {
  rank: string;
  pp: string;
  damage: string;
  range: string;
  duration: string;
  trapping: string;
  arcane: string;
  ap: number;
  modifiers: any[];
  innate: boolean;
}

interface AbilityData extends ItemDescription, Favorite {
  subtype: AbilitySubType;
  grantsPowers: boolean;
  grants: Array<ItemGrant>;
}

interface ActionData extends ItemDescription, Favorite, Actions {}

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

interface ConsumableDataSource {
  data: ConsumableData;
  type: 'consumable';
}

interface ActionItemDataSource {
  data: ActionData;
  type: 'action';
}
