import { InexactPartial } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import SwadeActor from '../module/documents/actor/SwadeActor';
import SwadeItem from '../module/documents/item/SwadeItem';
import { RollModifier } from './additional.interface';

export interface SwadeRollOptions
  extends InexactPartial<foundry.dice.terms.RollTerm.EvaluationOptions> {
  modifiers?: RollModifier[];
  rerollMode?: 'benny' | 'free';
  critfailConfirmationRoll?: boolean;
  rerollable?: boolean;
  rollType?: string;
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
