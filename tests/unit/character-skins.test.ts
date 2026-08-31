/**
 * @module tests/unit/character-skins.test.ts
 * Unit tests for CharacterSkinManager.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CharacterSkinManager, DEFAULT_SKIN_MANIFEST, SkinConfig } from '../../src/main/character-skins';

describe('CharacterSkinManager', () => {
  let manager: CharacterSkinManager;

  beforeEach(() => {
    const config: SkinConfig = {
      manifestPath: '/tmp/test-manifest.json',
      skinsDirectory: '/tmp/test-skins',
      activeSkinId: 'darkness-default',
    };
    manager = new CharacterSkinManager(config);
  });

  describe('initialization', () => {
    test('starts with default skin active', () => {
      const active = manager.getActiveSkin();
      expect(active).toBeDefined();
      expect(active!.id).toBe('darkness-default');
    });

    test('has default manifest with one skin', () => {
      const skins = manager.getAllSkins();
      expect(skins.length).toBe(1);
      expect(skins[0].id).toBe('darkness-default');
    });
  });

  describe('skin management', () => {
    test('can get a skin by ID', () => {
      const skin = manager.getSkin('darkness-default');
      expect(skin).toBeDefined();
      expect(skin!.name).toBe('Darkness (Default)');
    });

    test('returns undefined for non-existent skin', () => {
      const skin = manager.getSkin('nonexistent');
      expect(skin).toBeUndefined();
    });

    test('can add a new skin', () => {
      const newSkin = {
        id: 'darkness-xmas',
        name: 'Darkness (Christmas)',
        description: 'Holiday outfit',
        author: 'Test',
        version: '1.0.0',
        tags: ['holiday'],
        previewImage: 'xmas/preview.png',
        skinFolder: 'darkness_xmas',
        moodImages: { happy: 'xmas/happy.png' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const added = manager.addSkin(newSkin);
      expect(added).toBe(true);
      expect(manager.getAllSkins().length).toBe(2);
    });

    test('cannot add duplicate skin', () => {
      const dup = {
        ...DEFAULT_SKIN_MANIFEST.skins[0],
      };
      const added = manager.addSkin(dup);
      expect(added).toBe(false);
      expect(manager.getAllSkins().length).toBe(1);
    });

    test('can remove a skin', () => {
      const newSkin = {
        id: 'darkness-xmas',
        name: 'Xmas',
        description: 'x',
        author: 't',
        version: '1',
        tags: [],
        previewImage: 'x',
        skinFolder: 'x',
        moodImages: {},
        createdAt: 0,
        updatedAt: 0,
      };
      manager.addSkin(newSkin);
      const removed = manager.removeSkin('darkness-xmas');
      expect(removed).toBe(true);
      expect(manager.getAllSkins().length).toBe(1);
    });

    test('cannot remove the default skin', () => {
      const removed = manager.removeSkin('darkness-default');
      expect(removed).toBe(false);
      expect(manager.getAllSkins().length).toBe(1);
    });

    test('removing active skin switches to default', () => {
      const newSkin = {
        id: 'alt',
        name: 'Alt',
        description: 'a',
        author: 't',
        version: '1',
        tags: [],
        previewImage: 'x',
        skinFolder: 'x',
        moodImages: {},
        createdAt: 0,
        updatedAt: 0,
      };
      manager.addSkin(newSkin);
      manager.setActiveSkin('alt');
      manager.removeSkin('alt');

      expect(manager.getActiveSkin()!.id).toBe('darkness-default');
    });
  });

  describe('active skin switching', () => {
    test('can switch active skin', () => {
      const newSkin = {
        id: 'alt',
        name: 'Alt',
        description: 'a',
        author: 't',
        version: '1',
        tags: [],
        previewImage: 'x',
        skinFolder: 'x',
        moodImages: {},
        createdAt: 0,
        updatedAt: 0,
      };
      manager.addSkin(newSkin);
      const switched = manager.setActiveSkin('alt');
      expect(switched).toBe(true);
      expect(manager.getActiveSkin()!.id).toBe('alt');
    });

    test('cannot switch to non-existent skin', () => {
      const switched = manager.setActiveSkin('nonexistent');
      expect(switched).toBe(false);
    });
  });

  describe('mood images', () => {
    test('returns mood image path for active skin', () => {
      const path = manager.getMoodImage('happy');
      expect(path).toContain('happy.png');
    });

    test('returns null for missing mood', () => {
      const path = manager.getMoodImage('nonexistent-mood');
      expect(path).toBeNull();
    });
  });

  describe('toJSON/fromJSON', () => {
    test('serializes and restores', () => {
      const json = manager.toJSON();
      const restored = CharacterSkinManager.fromJSON(json);
      expect(restored.getAllSkins().length).toBe(manager.getAllSkins().length);
      expect(restored.getActiveSkin()!.id).toBe(manager.getActiveSkin()!.id);
    });
  });
});
