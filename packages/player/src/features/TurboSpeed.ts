import type { TurboSpeedConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

/**
 * Adjusts playback speed for A/B testing conversion rates.
 * Server assigns a speed variant; this feature applies it.
 */
export class TurboSpeed {
  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: TurboSpeedConfig,
    private assignedSpeed?: number
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    const speed =
      this.assignedSpeed ??
      this.randomSpeed(this.config.minSpeed, this.config.maxSpeed);

    this.bus.once("video:canplay", () => {
      this.engine.setPlaybackRate(speed);
      this.bus.emit("analytics:event", "speed_change", { speed });
    });
  }

  private randomSpeed(min: number, max: number): number {
    // Round to 2 decimal places
    const speed = min + Math.random() * (max - min);
    return Math.round(speed * 100) / 100;
  }

  destroy(): void {}
}
