import { makeDiceField, makeTraitDiceFields } from './shared';

export type DiceTrait = ReturnType<typeof makeTraitDiceFields>;
export type DiceField = ReturnType<typeof makeDiceField>;
