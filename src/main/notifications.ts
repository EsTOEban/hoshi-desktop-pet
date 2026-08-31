import { exec } from 'child_process';

/**
 * @module main/notifications
 * Windows toast notification wrapper for pet reactions.
 * Uses PowerShell's System.Windows.Forms for native Windows toasts.
 */

export interface NotificationOptions {
  title: string;
  message: string;
  iconPath?: string;
  durationMs?: number;
  silent?: boolean;
}

export class NotificationManager {
  private enabled: boolean = true;
  private lastNotificationTime: number = 0;
  private cooldownMs: number = 5000; // prevent spam

  constructor() {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }

  /**
   * Show a Windows toast notification.
   * Returns false if blocked by cooldown or disabled.
   */
  show(options: NotificationOptions): boolean {
    if (!this.enabled) return false;

    const now = Date.now();
    if (now - this.lastNotificationTime < this.cooldownMs) {
      return false;
    }
    this.lastNotificationTime = now;

    // Escape single quotes for PowerShell safety
    const title = options.title.replace(/'/g, "''");
    const message = options.message.replace(/'/g, "''");
    const iconPath = options.iconPath?.replace(/'/g, "''") ?? '';
    const duration = options.durationMs ?? 3000;

    // Use PowerShell to show a Windows toast
    const psScript = `
      [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
      $balloon = New-Object System.Windows.Forms.NotifyIcon
      $balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${iconPath || 'C:\\Windows\\System32\\shell32.dll'}')
      $balloon.BalloonTipTitle = '${title}'
      $balloon.BalloonTipText = '${message}'
      $balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
      $balloon.Visible = $true
      $balloon.ShowBalloonTip(${duration})
      Start-Sleep -Milliseconds (${duration} + 500)
      $balloon.Dispose()
    `;

    // Fire-and-forget PowerShell execution
    exec(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err: Error | null) => {
      if (err) {
        console.error('Notification failed:', err.message);
      }
    });

    return true;
  }

  /**
   * Show a pet reaction notification.
   */
  showPetReaction(mood: string, message: string): boolean {
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      sick: '🤢',
      hungry: '🍖',
      angry: '😠',
      sleeping: '😴',
      excited: '🎉',
      bored: '😐',
      neutral: '💬',
    };

    const emoji = moodEmojis[mood] ?? '💬';
    return this.show({
      title: `${emoji} Darkness`,
      message,
      durationMs: 4000,
    });
  }
}
