/**
 * @module renderer/photo-mode
 * Photo mode for capturing and saving pet screenshots.
 * Uses Electron's desktopCapturer and nativeImage for cross-platform support.
 */

export interface PhotoModeConfig {
  outputDir: string;
  format: 'png' | 'jpeg';
  quality: number; // 0-100 for jpeg
  includeBackground: boolean;
  framePadding: number; // pixels around the pet
}

export const DEFAULT_PHOTO_CONFIG: PhotoModeConfig = {
  outputDir: '', // defaults to user pictures dir
  format: 'png',
  quality: 90,
  includeBackground: true,
  framePadding: 20,
};

export interface PhotoResult {
  success: boolean;
  filePath: string;
  timestamp: number;
  width: number;
  height: number;
}

export class PhotoMode {
  private config: PhotoModeConfig;
  private photoCount: number = 0;

  constructor(config: Partial<PhotoModeConfig> = {}) {
    this.config = { ...DEFAULT_PHOTO_CONFIG, ...config };
  }

  setConfig(config: Partial<PhotoModeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): Readonly<PhotoModeConfig> {
    return this.config;
  }

  getPhotoCount(): number {
    return this.photoCount;
  }

  /**
   * Generate a filename for the next photo.
   */
  generateFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    return `hoshi_photo_${dateStr}_${this.photoCount.toString().padStart(3, '0')}.${this.config.format}`;
  }

  /**
   * Capture a photo of the pet element.
   * Returns a Promise resolving to the file path.
   */
  async capture(petElement: HTMLElement): Promise<PhotoResult> {
    const now = Date.now();
    const rect = petElement.getBoundingClientRect();

    // Calculate capture region with padding
    const x = Math.max(0, rect.left - this.config.framePadding);
    const y = Math.max(0, rect.top - this.config.framePadding);
    const width = rect.width + (this.config.framePadding * 2);
    const height = rect.height + (this.config.framePadding * 2);

    // Use canvas to capture the element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        success: false,
        filePath: '',
        timestamp: now,
        width: 0,
        height: 0,
      };
    }

    // If we have access to html2canvas or similar, use it
    // For now, use a simple approach: draw the element's content
    ctx.fillStyle = this.config.includeBackground ? 'rgba(0,0,0,0.3)' : 'transparent';
    ctx.fillRect(0, 0, width, height);

    // Draw pet sprite centered
    const spriteImg = petElement.querySelector('img') as HTMLImageElement;
    if (spriteImg && spriteImg.complete) {
      const spriteRect = spriteImg.getBoundingClientRect();
      const sx = spriteRect.left - x;
      const sy = spriteRect.top - y;
      ctx.drawImage(spriteImg, sx, sy, spriteRect.width, spriteRect.height);
    }

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              success: false,
              filePath: '',
              timestamp: now,
              width,
              height,
            });
            return;
          }

          // Create object URL for preview
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.generateFilename();
          link.click();

          // Clean up
          setTimeout(() => URL.revokeObjectURL(url), 1000);

          this.photoCount++;
          resolve({
            success: true,
            filePath: link.download,
            timestamp: now,
            width,
            height,
          });
        },
        `image/${this.config.format}`,
        this.config.quality / 100
      );
    });
  }

  /**
   * Apply a filter effect to the photo (for fun).
   */
  applyFilter(ctx: CanvasRenderingContext2D, width: number, height: number, filter: string): void {
    switch (filter) {
      case 'sepia':
        ctx.filter = 'sepia(0.8)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
        break;
      case 'grayscale':
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
        break;
      case 'brightness':
        ctx.filter = 'brightness(1.3)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
        break;
      case 'contrast':
        ctx.filter = 'contrast(1.5)';
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
        break;
      default:
        // No filter
        break;
    }
  }

  /**
   * Get available filter presets.
   */
  static getFilterPresets(): string[] {
    return ['none', 'sepia', 'grayscale', 'brightness', 'contrast'];
  }
}
