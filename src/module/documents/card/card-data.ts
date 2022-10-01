declare global {
  interface SourceConfig {
    Card: SwadeCardDataSource;
  }
  interface DataConfig {
    Card: SwadeCardDataSource;
  }
}

export type SwadeCardDataSource =
  | PokerCardDataSource
  | AdventureCardDataSource
  | BaseCardDataSource;

interface PokerCard {
  suit: number;
  isJoker: boolean;
}

interface AdventureCard {}

interface BaseCard {}

interface PokerCardDataSource {
  data: PokerCard;
  type: 'poker';
}

interface AdventureCardDataSource {
  data: AdventureCard;
  type: 'adventure';
}

interface BaseCardDataSource {
  data: BaseCard;
  type: 'base';
}
