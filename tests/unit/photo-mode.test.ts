/**
 * @module tests/unit/photo-mode.test.ts
 * Unit tests for PhotoMode.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PhotoMode, DEFAULT_PHOTO_CONFIG } from '../../src/renderer/photo-mode';

// Mock canvas and blob APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(),
  toBlob: vi.fn(),
};

const mockContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  filter: '',
  canvas: mockCanvas,
};

mockCanvas.getContext.mockReturnValue(mockContext);

describe('PhotoMode', () => {
  let photoMode: PhotoMode;

  beforeEach(() => {
    photoMode = new PhotoMode();
    vi.clearAllMocks();
    mockContext.filter = '';
    mockContext.fillRect.mockClear();
    mockContext.drawImage.mockClear();
  });

  describe('initialization', () => {
    test('starts with default config', () => {
      const config = photoMode.getConfig();
      expect(config.format).toBe('png');
      expect(config.quality).toBe(90);
      expect(config.includeBackground).toBe(true);
      expect(config.framePadding).toBe(20);
    });

    test('can override config', () => {
      photoMode = new PhotoMode({ format: 'jpeg', quality: 80 });
      const config = photoMode.getConfig();
      expect(config.format).toBe('jpeg');
      expect(config.quality).toBe(80);
    });
  });

  describe('photo count', () => {
    test('starts at zero', () => {
      expect(photoMode.getPhotoCount()).toBe(0);
    });
  });

  describe('generateFilename', () => {
    test('generates filename with correct format', () => {
      const filename = photoMode.generateFilename();
      expect(filename).toMatch(/^hoshi_photo_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_000\.(png|jpeg)$/);
    });

    test('includes photo count in filename', () => {
      const filename = photoMode.generateFilename();
      expect(filename).toContain('_000.');
    });
  });

  describe('filter presets', () => {
    test('returns available filters', () => {
      const filters = PhotoMode.getFilterPresets();
      expect(filters).toContain('none');
      expect(filters).toContain('sepia');
      expect(filters).toContain('grayscale');
      expect(filters).toContain('brightness');
      expect(filters).toContain('contrast');
    });
  });

  describe('applyFilter', () => {
    test('applies sepia filter and draws', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'sepia');
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    test('applies grayscale filter and draws', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'grayscale');
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    test('applies brightness filter and draws', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'brightness');
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    test('applies contrast filter and draws', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'contrast');
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    test('no draw for unknown filter name', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'unknown');
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    test('no draw for none filter', () => {
      const ctx = mockContext as unknown as CanvasRenderingContext2D;
      photoMode.applyFilter(ctx, 100, 100, 'none');
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });
  });
});
