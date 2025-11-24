// Type definitions for SWADE HUD context and popout management

import SwadeActor from '../module/documents/actor/SwadeActor';
import { AnyObject } from 'fvtt-types/utils';
import SwadeToken from '../module/canvas/SwadeToken';

// Use SwadeToken for HUDToken to leverage SWADE-specific token logic
export type HUDToken = SwadeToken;

export interface SwadePopoutInstance {
  actor: SwadeActor;
  token?: HUDToken;
  panelType: string;
  title: string;
  template: string;
  width?: number;
  height?: number;
  position?: { left: number; top: number };
  hudInstance?: HUDContext;
  render: (force?: boolean, options?: any) => Promise<SwadePopoutInstance>;
  close: () => void;
}

export interface HUDContext extends AnyObject {
  [key: string]: any;
  actor: SwadeActor;
  token?: HUDToken;
  element?: HTMLElement;
  popouts: Record<string, SwadePopoutInstance>;
}
