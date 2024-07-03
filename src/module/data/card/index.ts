import { PokerData } from './poker';

export { PokerData } from './poker';

export const config = {
  poker: PokerData,
};

declare global {
  interface DataModelConfig {
    Card: {
      poker: PokerData; 
    }
  }
}