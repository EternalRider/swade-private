import { ItemCardData } from './itemCard';

export { ItemCardData } from './itemCard';

export const config = {
  itemCard: ItemCardData,
};

declare global {
  interface DataModelConfig {
    ChatMessage: {
      itemCard: typeof ItemCardData;
    };
  }
}
