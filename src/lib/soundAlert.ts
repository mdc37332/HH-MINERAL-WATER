/**
 * Sound Alert & Desktop Push Notification Utility for Admin Panel
 * 
 * Provides:
 * 1. Web Audio API synthesized order chime (Zero external MP3 dependencies, 100% reliable)
 * 2. HTML5 Desktop / Browser Push Notifications for incoming orders
 * 3. Sound preference persistence in localStorage
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private browserNotificationEnabled: boolean = true;

  constructor() {
    try {
      const savedSound = localStorage.getItem('hh_admin_sound_alert_enabled');
      if (savedSound !== null) {
        this.soundEnabled = savedSound === 'true';
      }
      const savedPush = localStorage.getItem('hh_admin_push_alert_enabled');
      if (savedPush !== null) {
        this.browserNotificationEnabled = savedPush === 'true';
      }
    } catch {
      // LocalStorage fallback
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      return null;
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('hh_admin_sound_alert_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public isBrowserNotificationEnabled(): boolean {
    return this.browserNotificationEnabled;
  }

  public setBrowserNotificationEnabled(enabled: boolean): void {
    this.browserNotificationEnabled = enabled;
    try {
      localStorage.setItem('hh_admin_push_alert_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  /**
   * Synthesize a clean, loud, and pleasant multi-tone order chime using Web Audio API
   */
  public playOrderChime(): void {
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Sequence of melodic, high-visibility chime notes: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
      const notes = [
        { freq: 523.25, time: 0, duration: 0.18, gain: 0.4 },
        { freq: 659.25, time: 0.12, duration: 0.22, gain: 0.45 },
        { freq: 783.99, time: 0.24, duration: 0.26, gain: 0.5 },
        { freq: 1046.5, time: 0.38, duration: 0.5, gain: 0.6 },
      ];

      notes.forEach(note => {
        // Fundamental tone (warm sine)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(note.freq, now + note.time);

        gain1.gain.setValueAtTime(0.001, now + note.time);
        gain1.gain.exponentialRampToValueAtTime(note.gain, now + note.time + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now + note.time);
        osc1.stop(now + note.time + note.duration);

        // Harmonic shimmer (triangle) for clarity on small laptop / mobile speakers
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(note.freq * 2, now + note.time);

        gain2.gain.setValueAtTime(0.001, now + note.time);
        gain2.gain.exponentialRampToValueAtTime(note.gain * 0.25, now + note.time + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration * 0.7);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + note.time);
        osc2.stop(now + note.time + note.duration * 0.7);
      });
    } catch (e) {
      console.warn('Failed to play synthesized order chime:', e);
    }
  }

  /**
   * Play a double chime (e.g. for urgent or test verification)
   */
  public testChime(): void {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const prev = this.soundEnabled;
    this.soundEnabled = true;
    this.playOrderChime();
    setTimeout(() => {
      this.playOrderChime();
      setTimeout(() => {
        this.soundEnabled = prev;
      }, 500);
    }, 400);
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  /**
   * Show a native desktop push notification for incoming orders
   */
  public showDesktopNotification(order: {
    id: string;
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    itemsCount?: number;
  }): void {
    if (!this.browserNotificationEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const title = `🔔 New Order Received: #${order.id}`;
      const body = `${order.customerName || 'Customer'} placed an order for ₹${order.totalAmount}\nPayment: ${order.paymentMethod || 'COD'} (${order.itemsCount || 1} items)`;
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `order-${order.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
}

export const soundAlert = new SoundAlertManager();
