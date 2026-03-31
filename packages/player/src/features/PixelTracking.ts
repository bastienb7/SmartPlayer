import type { PixelConfig, PixelEvent } from "../config/types";
import type { EventBus } from "../core/EventBus";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: { track: (...args: any[]) => void };
    pintrk?: (...args: any[]) => void;
    _tfa?: { push: (...args: any[]) => void };
  }
}

/**
 * Pixel Tracking™ — Fire ad platform events at video milestones.
 *
 * Features:
 * - Auto-fire events every N% (default 5%) — 20 automatic events
 * - Custom events at specific timestamps
 * - Facebook, Google, TikTok, Pinterest, Taboola support
 * - Configurable event prefix (e.g. "View5", "View10", ...)
 * - Reset on seek (prevents duplicate fires)
 *
 * Advantages:
 * - Configurable interval (not fixed at 5%)
 * - Pinterest + Taboola support
 * - Custom prefix naming
 */
export class PixelTracking {
  private firedEvents = new Set<string>();
  private firedAutoPercents = new Set<number>();

  constructor(
    private bus: EventBus,
    private config: PixelConfig
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    // Auto-fire at intervals
    if (this.config.autoFireInterval > 0) {
      this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
        if (duration <= 0) return;
        const percent = (currentTime / duration) * 100;

        // Fire at each interval threshold
        const interval = this.config.autoFireInterval;
        for (let threshold = interval; threshold <= 100; threshold += interval) {
          if (percent >= threshold && !this.firedAutoPercents.has(threshold)) {
            this.firedAutoPercents.add(threshold);
            const eventName = `${this.config.autoFirePrefix}${threshold}`;
            this.fireToAllPlatforms(eventName);

            this.bus.emit("analytics:event", "pixel_fire", {
              type: "auto",
              eventName,
              percent: threshold,
            });
          }
        }
      });
    }

    // Custom events at specific timestamps
    if (this.config.customEvents.length > 0) {
      this.bus.on("video:timeupdate", (currentTime: number) => {
        for (const event of this.config.customEvents) {
          const key = `${event.platform}:${event.eventName}:${event.triggerTimestamp}`;
          if (
            !this.firedEvents.has(key) &&
            currentTime >= event.triggerTimestamp &&
            currentTime < event.triggerTimestamp + 1.5
          ) {
            this.fireEvent(event);
            this.firedEvents.add(key);
          }
        }
      });
    }

    // Reset on seek
    this.bus.on("video:seeked", () => {
      this.firedEvents.clear();
      this.firedAutoPercents.clear();
    });
  }

  /** Fire a single custom event to its designated platform */
  private fireEvent(event: PixelEvent): void {
    this.bus.emit("analytics:event", "pixel_fire", {
      type: "custom",
      platform: event.platform,
      eventName: event.eventName,
    });
    this.fireToPlatform(event.platform, event.eventName);
  }

  /** Fire an event to ALL configured platforms (for auto-fire) */
  private fireToAllPlatforms(eventName: string): void {
    if (this.config.facebook) this.fireToPlatform("facebook", eventName);
    if (this.config.google) this.fireToPlatform("google", eventName);
    if (this.config.tiktok) this.fireToPlatform("tiktok", eventName);
    if (this.config.pinterest) this.fireToPlatform("pinterest", eventName);
    if (this.config.taboola) this.fireToPlatform("taboola", eventName);
  }

  private fireToPlatform(platform: string, eventName: string): void {
    try {
      switch (platform) {
        case "facebook":
          window.fbq?.("trackCustom", eventName);
          break;
        case "google":
          window.gtag?.("event", eventName);
          break;
        case "tiktok":
          window.ttq?.track(eventName);
          break;
        case "pinterest":
          window.pintrk?.("track", eventName);
          break;
        case "taboola":
          window._tfa?.push({ notify: "event", name: eventName });
          break;
      }
    } catch {
      // Pixel errors should never break the player
    }
  }

  destroy(): void {}
}
