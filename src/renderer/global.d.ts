/**
 * @module renderer/global
 * Augment Window interface with the ElectronAPI exposed by the preload script.
 * This file is a module (import type) so the global augmentation applies.
 */
import type { ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
