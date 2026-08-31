/**
 * @module renderer/photo-mode-ui
 * UI overlay for photo mode — camera controls, filters, capture button.
 */

import { PhotoMode, PhotoResult } from './photo-mode';

export class PhotoModeUI {
  private photoMode: PhotoMode;
  private container: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor(photoMode: PhotoMode) {
    this.photoMode = photoMode;
  }

  /**
   * Create and show the photo mode overlay.
   */
  show(petElement: HTMLElement): void {
    if (this.isVisible) return;
    this.isVisible = true;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'photo-mode-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Create controls container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      background: #2a2a2a;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 300px;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = '📸 Photo Mode';
    title.style.cssText = 'margin: 0; color: #fff; text-align: center;';
    this.container.appendChild(title);

    // Filter buttons
    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;';

    const filters = PhotoMode.getFilterPresets();
    for (const filter of filters) {
      const btn = document.createElement('button');
      btn.textContent = filter;
      btn.style.cssText = `
        padding: 6px 12px;
        border: 1px solid #555;
        border-radius: 6px;
        background: #333;
        color: #fff;
        cursor: pointer;
        text-transform: capitalize;
      `;
      btn.addEventListener('click', () => this.applyFilter(filter));
      filterContainer.appendChild(btn);
    }
    this.container.appendChild(filterContainer);

    // Capture button
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📷 Capture';
    captureBtn.style.cssText = `
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      background: #4CAF50;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
    `;
    captureBtn.addEventListener('click', () => this.capturePhoto(petElement));
    this.container.appendChild(captureBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #555;
      border-radius: 6px;
      background: transparent;
      color: #fff;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => this.hide());
    this.container.appendChild(closeBtn);

    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  /**
   * Hide the photo mode overlay.
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.container = null;
    }
  }

  /**
   * Toggle photo mode visibility.
   */
  toggle(petElement: HTMLElement): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(petElement);
    }
  }

  /**
   * Apply a filter effect.
   */
  private applyFilter(filter: string): void {
    const petSprite = document.getElementById('pet-sprite');
    if (!petSprite) return;

    const img = petSprite.querySelector('img');
    if (!img) return;

    // Remove existing filters
    img.style.filter = '';

    switch (filter) {
      case 'sepia':
        img.style.filter = 'sepia(0.8)';
        break;
      case 'grayscale':
        img.style.filter = 'grayscale(1)';
        break;
      case 'brightness':
        img.style.filter = 'brightness(1.3)';
        break;
      case 'contrast':
        img.style.filter = 'contrast(1.5)';
        break;
      default:
        // No filter
        break;
    }
  }

  /**
   * Capture a photo of the pet.
   */
  private async capturePhoto(petElement: HTMLElement): Promise<void> {
    const result = await this.photoMode.capture(petElement);
    if (result.success) {
      this.showFlash();
    }
  }

  /**
   * Show a camera flash effect.
   */
  private showFlash(): void {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      opacity: 0.8;
      z-index: 1001;
      pointer-events: none;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(flash);

    // Fade out
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    });
  }
}
