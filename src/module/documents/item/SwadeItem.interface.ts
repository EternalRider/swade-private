import { Updates } from '../../../globals';
import { ItemAction } from '../../../interfaces/additional.interface';
import SwadeItem from './SwadeItem';

export interface ItemChatCardChip {
  icon?: string;
  text?: string | number;
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

export interface ItemChatCardPowerPoints {
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
}

export interface UsageUpdates {
  actorUpdates: Updates;
  itemUpdates: Updates;
  resourceUpdates: Updates[];
}

export type SwadeConsumeItemCallback = (
  item: SwadeItem,
  charges: number,
  updates: UsageUpdates,
) => void | boolean;
