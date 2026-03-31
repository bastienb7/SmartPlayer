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
  /** 0–100 percentage */
  progress: number;
  /** Metadata varies by event type */
  meta?: Record<string, string | number | boolean>;
  /** A/B test variant IDs */
  variantId?: string;
  headlineVariantId?: string;
  speedVariant?: number;
}

export interface AnalyticsBatch {
  events: AnalyticsEvent[];
  sentAt: number;
}
