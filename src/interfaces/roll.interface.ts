import SwadeActor from '../module/documents/actor/SwadeActor';
import SwadeItem from '../module/documents/item/SwadeItem';
import { TraitRollModifier } from './additional.interface';

export interface SwadeRollOptions
  extends InexactPartial<RollTerm.EvaluationOptions> {
  modifiers?: TraitRollModifier[];
  rerollMode?: 'benny' | 'free';
  critfailConfirmationRoll?: boolean;
}

export interface RollRenderOptions {
  flavor?: string;
  template?: string;
  isPrivate?: boolean;
  displayResult?: boolean;
}

export interface RollPart {
  result: string | number;
  class?: string;
  die?: boolean;
  img?: string;
  hint?: string;
}
export type ActorRollData = ReturnType<SwadeActor['getRollData']>;
export type ItemRollData = ReturnType<SwadeItem['getRollData']>;
export type SwadeRollData = ActorRollData | ItemRollData;
