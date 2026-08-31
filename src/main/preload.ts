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

  // Notifications
  showNotification(options: { title: string; message: string; iconPath?: string; durationMs?: number }): Promise<boolean> {
    return ipcRenderer.invoke(IpcChannel.NOTIFICATION_SHOW, options) as Promise<boolean>;
  },

  setNotificationsEnabled(enabled: boolean): Promise<boolean> {
    return ipcRenderer.invoke(IpcChannel.NOTIFICATION_TOGGLE, enabled) as Promise<boolean>;
  },

  // Voice reactions
  speak(text: string): Promise<boolean> {
    return ipcRenderer.invoke(IpcChannel.VOICE_SPEAK, text) as Promise<boolean>;
  },

  setVoiceEnabled(enabled: boolean): Promise<boolean> {
    return ipcRenderer.invoke(IpcChannel.VOICE_TOGGLE, enabled) as Promise<boolean>;
  },

  setVoiceConfig(config: { volume?: number; rate?: number; voiceIndex?: number }): Promise<{ enabled: boolean; volume: number; rate: number; voiceIndex: number }> {
    return ipcRenderer.invoke(IpcChannel.VOICE_SET_CONFIG, config) as Promise<{ enabled: boolean; volume: number; rate: number; voiceIndex: number }>;
  },
};

contextBridge.exposeInMainWorld('electron', electron);

export type ElectronAPI = typeof electron;
