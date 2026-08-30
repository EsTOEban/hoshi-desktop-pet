/**
 * @module main/preload
 * Exposes safe, typed APIs to the renderer process.
 * Renderer NEVER accesses Node.js or Electron APIs directly.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, PetAction } from '../shared/ipc-contracts';
import { PetState } from '../shared/types';

const electron = {
  dispatch(action: PetAction): void {
    ipcRenderer.invoke(IpcChannel.DISPATCH, { action });
  },

  async getState(): Promise<PetState> {
    return ipcRenderer.invoke(IpcChannel.GET_STATE) as Promise<PetState>;
  },

  async getMood(): Promise<string> {
    return ipcRenderer.invoke(IpcChannel.GET_MOOD) as Promise<string>;
  },

  onStateUpdate(callback: (state: PetState) => void): () => void {
    const listener = (_event: unknown, state: PetState) => callback(state);
    ipcRenderer.on(IpcChannel.STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IpcChannel.STATE_CHANGED, listener);
  },

  subscribe(): void {
    ipcRenderer.invoke(IpcChannel.SUBSCRIBE);
  },

  // Desktop awareness
  onAwarenessStateChange(callback: (state: string) => void): () => void {
    const listener = (_event: unknown, state: string) => callback(state);
    ipcRenderer.on(IpcChannel.AWARENESS_STATE, listener);
    return () => ipcRenderer.removeListener(IpcChannel.AWARENESS_STATE, listener);
  },

  setAwarenessEnabled(enabled: boolean): void {
    ipcRenderer.invoke(IpcChannel.AWARENESS_TOGGLE, enabled);
  },

  setIdleThreshold(minutes: number): void {
    ipcRenderer.invoke(IpcChannel.AWARENESS_SET_IDLE, minutes);
  },
};

contextBridge.exposeInMainWorld('electron', electron);

export type ElectronAPI = typeof electron;
