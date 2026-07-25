import type { SaveState } from "../core/types";

export class FeedbackSystem {
  private settings: SaveState["settings"] = { sound: true, haptics: true };

  public configure(settings: SaveState["settings"]): void {
    this.settings = settings;
  }

  public tap(): void {
    this.tone(220, 0.025, 0.025);
  }

  public choice(): void {
    this.vibrate(18);
    this.tone(440, 0.045, 0.04);
  }

  public message(): void {
    this.vibrate([18, 35, 18]);
    this.tone(660, 0.06, 0.045);
  }

  public success(): void {
    this.vibrate([25, 30, 45]);
    this.tone(520, 0.08, 0.04);
    window.setTimeout(() => this.tone(780, 0.12, 0.045), 90);
  }

  private vibrate(pattern: number | number[]): void {
    if (this.settings.haptics && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  private tone(frequency: number, duration: number, volume: number): void {
    if (!this.settings.sound || !("AudioContext" in window)) {
      return;
    }
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {
      // Feedback is progressive enhancement and never blocks gameplay.
    }
  }
}
