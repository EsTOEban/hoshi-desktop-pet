/**
 * @module renderer/index
 * Renderer entry point — receives state updates from main, updates the pet display.
 * Uses the mood→asset-folder mapping described in the architecture doc.
 */

import { PetState } from '../shared/types';

const petSprite = document.getElementById('pet-sprite') as HTMLDivElement;
const moodDisplay = document.getElementById('mood-display') as HTMLDivElement | null;

function moodToAssetPath(mood: string): string {
  // Direct 1:1 mapping: mood → folder
  return `assets/characters/darkness/moods/${mood}/`;
}

function updatePetDisplay(state: PetState): void {
  petSprite.textContent = `${state.mood}`;
  if (moodDisplay) {
    moodDisplay.textContent = `Hunger: ${state.hunger} | Happiness: ${state.happiness} | Clean: ${state.cleanliness} | Energy: ${state.energy}`;
  }
  // TODO: read manifest at moodToAssetPath(state.mood) and swap sprite
}

if (window.electron) {
  window.electron.onStateUpdate(updatePetDisplay);
  window.electron.getState().then(updatePetDisplay);
  window.electron.subscribe();
}
