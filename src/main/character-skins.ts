/**
 * @module main/character-skins
 * Character manifest and multi-skin system.
 * Manages skin manifests, active skin switching, and skin metadata.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

export interface SkinManifestEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  previewImage: string;
  skinFolder: string;
  moodImages: Record<string, string>; // mood -> filename
  createdAt: number;
  updatedAt: number;
}

export interface SkinManifest {
  version: number;
  defaultSkin: string;
  skins: SkinManifestEntry[];
}

export interface SkinConfig {
  manifestPath: string;
  skinsDirectory: string;
  activeSkinId: string;
}

export const DEFAULT_SKIN_MANIFEST: SkinManifest = {
  version: 1,
  defaultSkin: 'darkness-default',
  skins: [
    {
      id: 'darkness-default',
      name: 'Darkness (Default)',
      description: 'The default Konosuba Darkness skin.',
      author: 'Hoshi Team',
      version: '1.0.0',
      tags: ['default', 'konosuba', 'darkness'],
      previewImage: 'darkness_default/preview.png',
      skinFolder: 'darkness_default',
      moodImages: {
        happy: 'darkness_default/happy.png',
        excited: 'darkness_default/excited.png',
        content: 'darkness_default/content.png',
        neutral: 'darkness_default/neutral.png',
        sad: 'darkness_default/sad.png',
        sick: 'darkness_default/sick.png',
        angry: 'darkness_default/angry.png',
        sleepy: 'darkness_default/sleepy.png',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
};

export class CharacterSkinManager {
  private manifest: SkinManifest;
  private config: SkinConfig;
  private activeSkinId: string;

  constructor(config: SkinConfig) {
    this.config = config;
    this.manifest = {
      ...DEFAULT_SKIN_MANIFEST,
      skins: DEFAULT_SKIN_MANIFEST.skins.map((s) => ({ ...s })),
    };
    this.activeSkinId = config.activeSkinId || this.manifest.defaultSkin;
  }

  /**
   * Load manifest from disk.
   */
  loadManifest(): void {
    if (!existsSync(this.config.manifestPath)) {
      this.saveManifest();
      return;
    }

    const data = readFileSync(this.config.manifestPath, 'utf-8');
    this.manifest = JSON.parse(data);
  }

  /**
   * Save manifest to disk.
   */
  saveManifest(): void {
    const data = JSON.stringify(this.manifest, null, 2);
    // Note: In real implementation, use writeFile
    // For now, this is a stub
  }

  /**
   * Get the active skin.
   */
  getActiveSkin(): SkinManifestEntry | undefined {
    return this.manifest.skins.find((s) => s.id === this.activeSkinId);
  }

  /**
   * Get a skin by ID.
   */
  getSkin(id: string): SkinManifestEntry | undefined {
    return this.manifest.skins.find((s) => s.id === id);
  }

  /**
   * Get all skins.
   */
  getAllSkins(): SkinManifestEntry[] {
    return [...this.manifest.skins];
  }

  /**
   * Set the active skin.
   */
  setActiveSkin(id: string): boolean {
    const skin = this.manifest.skins.find((s) => s.id === id);
    if (!skin) return false;
    this.activeSkinId = id;
    this.config.activeSkinId = id;
    return true;
  }

  /**
   * Add a new skin to the manifest.
   */
  addSkin(skin: SkinManifestEntry): boolean {
    if (this.manifest.skins.find((s) => s.id === skin.id)) {
      return false; // Already exists
    }
    this.manifest.skins.push(skin);
    return true;
  }

  /**
   * Remove a skin from the manifest.
   */
  removeSkin(id: string): boolean {
    const idx = this.manifest.skins.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    // Don't remove the default skin
    if (id === this.manifest.defaultSkin) return false;

    this.manifest.skins.splice(idx, 1);

    // If active skin was removed, switch to default
    if (this.activeSkinId === id) {
      this.activeSkinId = this.manifest.defaultSkin;
    }

    return true;
  }

  /**
   * Get the mood image path for the active skin.
   */
  getMoodImage(mood: string): string | null {
    const skin = this.getActiveSkin();
    if (!skin) return null;
    return skin.moodImages[mood] || null;
  }

  /**
   * Scan the skins directory and register any new skins.
   */
  scanForSkins(): number {
    if (!existsSync(this.config.skinsDirectory)) return 0;

    const folders = readdirSync(this.config.skinsDirectory, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let added = 0;
    for (const folder of folders) {
      const existing = this.manifest.skins.find((s) => s.skinFolder === folder);
      if (!existing) {
        const newSkin: SkinManifestEntry = {
          id: folder,
          name: folder,
          description: `Auto-scanned skin: ${folder}`,
          author: 'Unknown',
          version: '1.0.0',
          tags: ['auto-scanned'],
          previewImage: `${folder}/preview.png`,
          skinFolder: folder,
          moodImages: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.manifest.skins.push(newSkin);
        added++;
      }
    }
    return added;
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      manifest: this.manifest,
      config: this.config,
      activeSkinId: this.activeSkinId,
    };
  }

  /**
   * Restore from JSON.
   */
  static fromJSON(data: any): CharacterSkinManager {
    const manager = new CharacterSkinManager(data.config);
    manager.manifest = data.manifest;
    manager.activeSkinId = data.activeSkinId;
    return manager;
  }
}
