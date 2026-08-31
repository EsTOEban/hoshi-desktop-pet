/**
 * @module main/ipc
 * IPC handlers bridging main process and renderer.
 * All communication flows through here — renderer never touches state directly.
 */

import { IpcMain } from 'electron';
import { PetStateManager } from '../state/pet-state-manager';
import { IpcChannel, IpcRequest } from '../shared/ipc-contracts';

import { DesktopAwareness } from './desktop-awareness';
import { NotificationManager } from './notifications';
import { VoiceReactionManager } from './voice-reactions';

const awareness = new DesktopAwareness();
const notifications = new NotificationManager();
const voice = new VoiceReactionManager();

export function createIpcHandlers(ipcMain: IpcMain, stateManager: PetStateManager): void {
  ipcMain.handle(IpcChannel.DISPATCH, (_, request: IpcRequest) => {
    stateManager.dispatch(request.action);
    return { success: true, state: stateManager.getState() };
  });

  ipcMain.handle(IpcChannel.GET_STATE, () => {
    return stateManager.getState();
  });

  ipcMain.handle(IpcChannel.GET_MOOD, () => {
    return stateManager.getMood();
  });

  ipcMain.handle(IpcChannel.SUBSCRIBE, (event) => {
    const sender = event.sender;
    stateManager.subscribe((state) => {
      sender.send(IpcChannel.STATE_CHANGED, state);
    });
  });

  // Desktop awareness handlers
  ipcMain.handle(IpcChannel.AWARENESS_TOGGLE, (_, enabled: boolean) => {
    awareness.setEnabled(enabled);
  });

  ipcMain.handle(IpcChannel.AWARENESS_SET_IDLE, (_, minutes: number) => {
    awareness.setIdleThreshold(minutes);
  });

  // Notification handlers
  ipcMain.handle(IpcChannel.NOTIFICATION_SHOW, (_, options: { title: string; message: string; iconPath?: string; durationMs?: number }) => {
    return notifications.show(options);
  });

  ipcMain.handle(IpcChannel.NOTIFICATION_TOGGLE, (_, enabled: boolean) => {
    notifications.setEnabled(enabled);
    return notifications.isEnabled();
  });

  // Voice reaction handlers
  ipcMain.handle(IpcChannel.VOICE_SPEAK, (_, text: string) => {
    return voice.speak(text);
  });

  ipcMain.handle(IpcChannel.VOICE_TOGGLE, (_, enabled: boolean) => {
    voice.setEnabled(enabled);
    return voice.isEnabled();
  });

  ipcMain.handle(IpcChannel.VOICE_SET_CONFIG, (_, config: { volume?: number; rate?: number; voiceIndex?: number }) => {
    voice.setConfig(config);
    return voice.getConfig();
  });
}

export { awareness as desktopAwareness };
