import type { TurboSpeedConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

/**
 * Turbo™ — Control playback speed for conversion optimization.
 *
 * Two modes:
 * - Manual: fixed speed (1.0x to 1.5x) for all viewers
 * - Auto-test: A/B test multiple speeds, track completions
 *
 * Timing sync: emits the current playback rate via the event bus
 * so all timed features (CTA, Pixel, Mini-Hook) can adjust their
 * trigger timestamps accordingly.
 *
 * Advantages:
 * - Up to 1.5x speed
 * - Explicit sync event for timed features
 * - Speed change analytics with variant tracking
 */
export class TurboSpeed {
  private appliedSpeed: number = 1;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: TurboSpeedConfig,
    private assignedSpeed?: number
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    let speed: number;

    if (this.assignedSpeed) {
      // Server-assigned speed (from A/B test)
      speed = this.assignedSpeed;
    } else if (this.config.mode === "manual") {
      speed = this.config.speed;
    } else {
      // Auto-test: random speed in range
      speed = this.randomSpeed(this.config.minSpeed, this.config.maxSpeed);
    }

    // Clamp to valid range
    speed = Math.max(0.5, Math.min(1.5, speed));
    this.appliedSpeed = speed;

    this.bus.once("video:canplay", () => {
      this.engine.setPlaybackRate(speed);

      // Emit speed for timed feature sync
      if (this.config.syncTimedFeatures) {
        this.bus.emit("turbo:speed", speed);
      }

      this.bus.emit("analytics:event", "speed_change", {
        speed,
        mode: this.config.mode,
      });
    });
  }

  getAppliedSpeed(): number {
    return this.appliedSpeed;
  }

  private randomSpeed(min: number, max: number): number {
    const speed = min + Math.random() * (max - min);
    return Math.round(speed * 100) / 100;
  }

  destroy(): void {}
}
