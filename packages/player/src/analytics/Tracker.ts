import type { AnalyticsConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { getViewerFingerprint, generateSessionId } from "../utils/device";

export type AnalyticsEventType =
  | "play"
  | "pause"
  | "seek"
  | "complete"
  | "progress"
  | "heartbeat"
  | "cta_show"
  | "cta_click"
  | "resume_prompt"
  | "resume_accept"
  | "resume_decline"
  | "autoplay_start"
  | "autoplay_click"
  | "recovery_show"
  | "recovery_click"
  | "hook_show"
  | "speed_change"
  | "quality_change"
  | "pixel_fire"
  | "error";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  videoId: string;
  sessionId: string;
  viewerFingerprint: string;
  timestamp: number;
  currentTime: number;
  duration: number;
  progress: number;
  meta?: Record<string, string | number | boolean>;
  variantId?: string;
  headlineVariantId?: string;
  speedVariant?: number;
}

export class Tracker {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private fingerprint: string;
  private videoId: string;
  private variantId?: string;
  private headlineVariantId?: string;
  private speedVariant?: number;

  constructor(
    private bus: EventBus,
    private config: AnalyticsConfig,
    videoId: string,
    variantId?: string,
    headlineVariantId?: string,
    speedVariant?: number
  ) {
    this.videoId = videoId;
    this.sessionId = generateSessionId();
    this.fingerprint = getViewerFingerprint();
    this.variantId = variantId;
    this.headlineVariantId = headlineVariantId;
    this.speedVariant = speedVariant;
  }

  init(): void {
    if (!this.config.enabled) return;

    this.bus.on(
      "analytics:event",
      (type: AnalyticsEventType, meta?: Record<string, any>) => {
        this.track(type, meta);
      }
    );

    this.bus.on("video:play", () => this.track("play"));
    this.bus.on("video:pause", () => this.track("pause"));
    this.bus.on("video:ended", () => this.track("complete"));
    this.bus.on("video:seeking", () => this.track("seek"));

    let lastMilestone = 0;
    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const percent = Math.floor((currentTime / duration) * 100);
      const milestones = [25, 50, 75, 100];
      for (const m of milestones) {
        if (percent >= m && lastMilestone < m) {
          this.track("progress", { milestone: m });
          lastMilestone = m;
        }
      }
    });

    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    window.addEventListener("beforeunload", this.handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flush(true);
    });
  }

  track(type: AnalyticsEventType, meta?: Record<string, any>): void {
    const video = document.querySelector(
      `#smartplayer-${this.videoId} video`
    ) as HTMLVideoElement | null;

    const event: AnalyticsEvent = {
      type,
      videoId: this.videoId,
      sessionId: this.sessionId,
      viewerFingerprint: this.fingerprint,
      timestamp: Date.now(),
      currentTime: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
      progress: video
        ? Math.floor(((video.currentTime || 0) / (video.duration || 1)) * 100)
        : 0,
      meta,
      variantId: this.variantId,
      headlineVariantId: this.headlineVariantId,
      speedVariant: this.speedVariant,
    };

    this.queue.push(event);
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private flush(useBeacon = false): void {
    if (this.queue.length === 0) return;

    const batch = {
      events: this.queue.splice(0),
      sentAt: Date.now(),
    };
    const body = JSON.stringify(batch);

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        this.config.beaconEndpoint,
        new Blob([body], { type: "application/json" })
      );
      return;
    }

    fetch(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  private handleUnload = (): void => {
    this.flush(true);
  };

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush(true);
    window.removeEventListener("beforeunload", this.handleUnload);
  }
}
