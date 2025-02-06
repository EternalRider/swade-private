import { ValueOf } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import * as common from './common';

export type Builder = ReturnType<typeof common.builder>;
export type PhysicalItem = ReturnType<typeof common.physicalItem>;
export type Templates = ReturnType<typeof common.templates>;
export type ItemDescription = ReturnType<typeof common.itemDescription>;
export type AdditionalStats = ReturnType<typeof common.additionalStats>;
export type ChoiceSets = ReturnType<typeof common.choiceSets>;
export type Favorite = ReturnType<typeof common.favorite>;
export type Category = ReturnType<typeof common.category>;
export type Actions = ReturnType<typeof common.actions>;
export type GrantEmbedded = ReturnType<typeof common.grantEmbedded>;
export type Grants = ReturnType<typeof common.grants>;
export type Equippable = ReturnType<typeof common.equippable>;
export type ArcaneDevice = ReturnType<typeof common.arcaneDevice>;
export type BonusDamage = ReturnType<typeof common.bonusDamage>;
export type Vehicular = ReturnType<typeof common.vehicular>;
export type Activities = ReturnType<typeof common.activities>;

export type ChoicesType<T> = ValueOf<T>[];
