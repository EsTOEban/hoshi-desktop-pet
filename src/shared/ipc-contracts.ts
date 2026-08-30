/**
 * @module shared/ipc-contracts
 * Typed IPC message definitions — the single source of truth for
 * what can be sent between main and renderer.
 */

export enum IpcChannel {
  DISPATCH = 'state:dispatch',
  GET_STATE = 'state:get',
  GET_MOOD = 'state:getMood',
  SUBSCRIBE = 'state:subscribe',
  STATE_CHANGED = 'state:changed',
  AWARENESS_STATE = 'awareness:state-change',
  AWARENESS_TOGGLE = 'awareness:toggle',
  AWARENESS_SET_IDLE = 'awareness:set-idle-threshold',
}

export interface IpcRequest {
  action: PetAction;
}

export interface IpcResponse {
  success: boolean;
  state?: unknown;
  error?: string;
}

export type PetAction =
  | { type: 'FEED'; amount: number }
  | { type: 'PLAY'; intensity: number }
  | { type: 'CLEAN' }
  | { type: 'SLEEP' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'LOAD'; saveData: string }
  | { type: 'RESET' };
