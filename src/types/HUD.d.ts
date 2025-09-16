// Type definitions for SWADE HUD context and popout management

export interface HUDActor {
  id: string;
  name: string;
  system: Record<string, any>;
  sheet?: any;
  update: (data: Record<string, any>) => Promise<void>;
}

// If Token is globally available, just alias HUDToken to Token
export type HUDToken = Token;

export interface SwadePopoutInstance {
  actor: HUDActor;
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

export interface HUDContext {
  actor: HUDActor;
  token?: HUDToken;
  element?: HTMLElement;
  popouts: Record<string, SwadePopoutInstance>;
}
