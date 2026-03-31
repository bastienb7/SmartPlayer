import type { AnalyticsConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

export class Heartbeat {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: AnalyticsConfig
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    this.bus.on("video:play", () => this.start());
    this.bus.on("video:pause", () => this.stop());
    this.bus.on("video:ended", () => this.stop());
  }

  private start(): void {
    this.stop();
    this.timer = setInterval(() => {
      if (!this.engine.paused) {
        this.bus.emit("analytics:event", "heartbeat", {
          currentTime: this.engine.currentTime,
          duration: this.engine.duration,
        });
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.stop();
  }
}
