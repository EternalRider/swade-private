import { DeepPartial, ValueOf } from 'fvtt-types/utils';
import { Updates } from '../../../globals';
import { ItemAction } from '../../../interfaces/additional.interface';
import { constants } from '../../constants';
import SwadeItem from './SwadeItem';

export interface ItemChatCardChip {
  icon?: string;
  text?: string | number | null;
  title?: string;
}

export interface ItemChatCardAction {
  key: string;
  type: ItemAction['type'];
  name: string;
}

export interface ItemChatCardData {
  chips: ItemChatCardChip[];
  actions: ItemChatCardAction[];
  description: string;
}

export interface ItemDisplayPowerPoints {
  max: number;
  value: number;
}

export interface UsageUpdatesContext {
  /** whether the item uses a charge */
  charges: number;
  /** Reduce quantity of the item if other consumption modes are not available? */
  useQuantity: boolean;
  /** Use up any resources linked to this item? */
  useResource: boolean;
  useAmmo: boolean;
}

export interface UsageUpdates {
  actorUpdates: Updates;
  itemUpdates: Updates;
  resourceUpdates: Updates[];
}

export interface Requirement {
  type: ValueOf<typeof constants.REQUIREMENT_TYPE>;
  combinator: string;
  selector: string;
  value?: string | number | boolean;
  label?: string;
}

export interface ItemGrant {
  uuid: string;
  img: string | null;
  name: string | null;
  mutation: DeepPartial<Item.CreateData> | undefined;
  missing?: boolean;
  major?: boolean;
}

export interface ChoiceSet {
  title: string;
  choice: number | null;
  choices: MutationOption[];
}

export interface MutationOption {
  name: string;
  addToName?: boolean;
  mutation?: Item.UpdateData;
}

export interface ItemGrantChainLink {
  item: SwadeItem;
  grant: ItemGrant;
}

export type SwadeConsumeItemHook = (item: SwadeItem, charges: number, updates: UsageUpdates) => void | boolean;
