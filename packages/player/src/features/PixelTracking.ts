import type { PixelConfig, PixelEvent } from "../config/types";
import type { EventBus } from "../core/EventBus";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: { track: (...args: any[]) => void };
  }
}

export class PixelTracking {
  private firedEvents = new Set<string>();
  private loadedPlatforms = new Set<string>();

  constructor(
    private bus: EventBus,
    private config: PixelConfig
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    // Lazy-load platform SDKs
    if (this.config.facebook?.pixelId) this.initFacebook(this.config.facebook.pixelId);
    if (this.config.google?.measurementId) this.initGoogle(this.config.google.measurementId);
    if (this.config.tiktok?.pixelId) this.initTikTok(this.config.tiktok.pixelId);

    if (this.config.customEvents.length === 0) return;

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

    // Reset on seek
    this.bus.on("video:seeked", () => {
      this.firedEvents.clear();
    });
  }

  private fireEvent(event: PixelEvent): void {
    this.bus.emit("analytics:event", "pixel_fire", {
      platform: event.platform,
      eventName: event.eventName,
    });

    switch (event.platform) {
      case "facebook":
        window.fbq?.("track", event.eventName);
        break;
      case "google":
        window.gtag?.("event", event.eventName);
        break;
      case "tiktok":
        window.ttq?.track(event.eventName);
        break;
    }
  }

  private initFacebook(pixelId: string): void {
    if (this.loadedPlatforms.has("facebook") || window.fbq) return;
    this.loadedPlatforms.add("facebook");
    // Facebook pixel should be loaded by the page — we just fire events
    // If not loaded, silently skip
  }

  private initGoogle(measurementId: string): void {
    if (this.loadedPlatforms.has("google") || window.gtag) return;
    this.loadedPlatforms.add("google");
    // Google tag should be loaded by the page
  }

  private initTikTok(pixelId: string): void {
    if (this.loadedPlatforms.has("tiktok") || window.ttq) return;
    this.loadedPlatforms.add("tiktok");
    // TikTok pixel should be loaded by the page
  }

  destroy(): void {}
}
