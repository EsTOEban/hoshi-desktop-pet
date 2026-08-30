/**
 * @module main/ipc
 * IPC handlers bridging main process and renderer.
 * All communication flows through here — renderer never touches state directly.
 */

import { IpcMain } from 'electron';
import { PetStateManager } from '../state/pet-state-manager';
import { IpcChannel, IpcRequest } from '../shared/ipc-contracts';

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
}
