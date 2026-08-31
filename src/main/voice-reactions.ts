/**
 * @module main/voice-reactions
 * Text-to-speech voice reactions for the pet.
 * Uses Windows built-in SAPI or PowerShell TTS.
 */

import { exec } from 'child_process';

export interface VoiceReaction {
  text: string;
  mood: string;
  category: 'greeting' | 'care' | 'idle' | 'milestone' | 'reaction';
}

export interface VoiceConfig {
  enabled: boolean;
  volume: number; // 0-100
  rate: number; // -10 to 10
  voiceIndex: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  volume: 80,
  rate: 0,
  voiceIndex: 0,
};

export class VoiceReactionManager {
  private config: VoiceConfig;
  private lastSpokenTime: number = 0;
  private cooldownMs: number = 3000;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  setConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): Readonly<VoiceConfig> {
    return this.config;
  }

  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Speak a reaction. Returns false if blocked by cooldown or disabled.
   */
  speak(text: string): boolean {
    if (!this.config.enabled) return false;

    const now = Date.now();
    if (now - this.lastSpokenTime < this.cooldownMs) {
      return false;
    }
    this.lastSpokenTime = now;

    // Escape for PowerShell
    const safeText = text.replace(/'/g, "''").replace(/"/g, '\\"');

    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.Volume = ${this.config.volume}
      $synth.Rate = ${this.config.rate}
      $synth.Speak("${safeText}")
      $synth.Dispose()
    `;

    exec(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err: Error | null) => {
      if (err) {
        console.error('Voice reaction failed:', err.message);
      }
    });

    return true;
  }

  /**
   * Speak a voice reaction.
   */
  speakReaction(reaction: VoiceReaction): boolean {
    return this.speak(reaction.text);
  }

  /**
   * Get a random greeting reaction.
   */
  getGreeting(): VoiceReaction {
    const greetings: VoiceReaction[] = [
      { text: 'Hello! I missed you!', mood: 'happy', category: 'greeting' },
      { text: 'Welcome back!', mood: 'excited', category: 'greeting' },
      { text: 'You returned!', mood: 'happy', category: 'greeting' },
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get a care reaction based on action type.
   */
  getCareReaction(action: 'feed' | 'play' | 'clean'): VoiceReaction {
    const reactions: Record<string, VoiceReaction[]> = {
      feed: [
        { text: 'Yummy! Thank you!', mood: 'happy', category: 'care' },
        { text: 'Delicious!', mood: 'excited', category: 'care' },
      ],
      play: [
        { text: 'That was fun!', mood: 'excited', category: 'care' },
        { text: 'Wheee!', mood: 'happy', category: 'care' },
      ],
      clean: [
        { text: 'So fresh!', mood: 'happy', category: 'care' },
        { text: 'I feel sparkling!', mood: 'excited', category: 'care' },
      ],
    };
    const options = reactions[action];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Get an idle reaction.
   */
  getIdleReaction(): VoiceReaction {
    const idle: VoiceReaction[] = [
      { text: 'Are you still there?', mood: 'bored', category: 'idle' },
      { text: 'I am getting lonely...', mood: 'sad', category: 'idle' },
      { text: '*stretches*', mood: 'neutral', category: 'idle' },
    ];
    return idle[Math.floor(Math.random() * idle.length)];
  }

  /**
   * Get a milestone reaction.
   */
  getMilestoneReaction(streakDays: number): VoiceReaction {
    return {
      text: `${streakDays} days together! I am so happy!`,
      mood: 'excited',
      category: 'milestone',
    };
  }
}
