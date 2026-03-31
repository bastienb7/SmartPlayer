// Player types — self-contained for zero external dependencies in the bundle

export interface PlayerConfig {
  videoId: string;
  hlsUrl: string;
  posterUrl?: string;
  autoplay: AutoplayConfig;
  progressBar: ProgressBarConfig;
  cta: CTAConfig;
  recoveryThumbnail: RecoveryThumbnailConfig;
  resumePlay: ResumePlayConfig;
  headline: HeadlineConfig;
  miniHook: MiniHookConfig;
  turboSpeed: TurboSpeedConfig;
  abTest: ABTestConfig;
  analytics: AnalyticsConfig;
  pixels: PixelConfig;
  style: StyleConfig;
  assignedHeadlineVariant?: string;
  assignedVideoVariant?: string;
  assignedSpeedVariant?: number;
}

export interface AutoplayConfig {
  enabled: boolean;
  mutedMessage: string;
  clickMessage: string;
  overlayOpacity: number;
}

export interface ProgressBarConfig {
  enabled: boolean;
  fictitious: boolean;
  fastPhaseEnd: number;
  slowPhaseEnd: number;
  fastPhaseDisplay: number;
  slowPhaseDisplay: number;
}

export interface CTATrigger {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
  url: string;
  buttonColor?: string;
  buttonTextColor?: string;
  openInNewTab: boolean;
}

export interface CTAConfig {
  enabled: boolean;
  triggers: CTATrigger[];
}

export interface RecoveryThumbnailConfig {
  enabled: boolean;
  imageUrl: string;
  delayMs: number;
  message?: string;
}

export interface ResumePlayConfig {
  enabled: boolean;
  maxAgeDays: number;
  promptMessage: string;
}

export interface HeadlineVariant {
  id: string;
  text: string;
}

export interface HeadlineConfig {
  enabled: boolean;
  variants: HeadlineVariant[];
  targetSelector?: string;
}

export interface MiniHookItem {
  type: "countdown" | "milestone" | "custom";
  triggerAtPercent: number;
  text: string;
  durationMs: number;
}

export interface MiniHookConfig {
  enabled: boolean;
  hooks: MiniHookItem[];
}

export interface TurboSpeedConfig {
  enabled: boolean;
  minSpeed: number;
  maxSpeed: number;
}

export interface ABTestConfig {
  enabled: boolean;
  testId?: string;
  variantId?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint: string;
  beaconEndpoint: string;
  batchSize: number;
  flushIntervalMs: number;
  heartbeatIntervalMs: number;
}

export interface PixelEvent {
  platform: "facebook" | "google" | "tiktok";
  eventName: string;
  triggerTimestamp: number;
}

export interface PixelConfig {
  enabled: boolean;
  facebook?: { pixelId: string };
  google?: { measurementId: string };
  tiktok?: { pixelId: string };
  customEvents: PixelEvent[];
}

export interface StyleConfig {
  primaryColor: string;
  backgroundColor: string;
  controlsBackground: string;
  controlsColor: string;
  fontFamily: string;
  borderRadius: number;
  showControls: boolean;
  controlsAutoHide: boolean;
  controlsAutoHideMs: number;
}

// Defaults

export const DEFAULT_STYLE: StyleConfig = {
  primaryColor: "#6366f1",
  backgroundColor: "#000000",
  controlsBackground: "rgba(0,0,0,0.7)",
  controlsColor: "#ffffff",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  borderRadius: 8,
  showControls: true,
  controlsAutoHide: true,
  controlsAutoHideMs: 3000,
};

export const DEFAULT_AUTOPLAY: AutoplayConfig = {
  enabled: true,
  mutedMessage: "Your video has already started",
  clickMessage: "Click to listen",
  overlayOpacity: 0.85,
};

export const DEFAULT_PROGRESS: ProgressBarConfig = {
  enabled: true,
  fictitious: true,
  fastPhaseEnd: 0.2,
  slowPhaseEnd: 0.8,
  fastPhaseDisplay: 0.5,
  slowPhaseDisplay: 0.85,
};

export const DEFAULT_ANALYTICS: AnalyticsConfig = {
  enabled: true,
  endpoint: "/analytics/events",
  beaconEndpoint: "/analytics/beacon",
  batchSize: 10,
  flushIntervalMs: 5000,
  heartbeatIntervalMs: 5000,
};

export function mergeConfig(partial: Partial<PlayerConfig>): PlayerConfig {
  return {
    videoId: partial.videoId ?? "",
    hlsUrl: partial.hlsUrl ?? "",
    posterUrl: partial.posterUrl,
    autoplay: { ...DEFAULT_AUTOPLAY, ...partial.autoplay },
    progressBar: { ...DEFAULT_PROGRESS, ...partial.progressBar },
    cta: { enabled: false, triggers: [], ...partial.cta },
    recoveryThumbnail: {
      enabled: false,
      imageUrl: "",
      delayMs: 2000,
      ...partial.recoveryThumbnail,
    },
    resumePlay: {
      enabled: true,
      maxAgeDays: 7,
      promptMessage: "Continue where you left off?",
      ...partial.resumePlay,
    },
    headline: {
      enabled: false,
      variants: [],
      ...partial.headline,
    },
    miniHook: { enabled: false, hooks: [], ...partial.miniHook },
    turboSpeed: {
      enabled: false,
      minSpeed: 0.95,
      maxSpeed: 1.15,
      ...partial.turboSpeed,
    },
    abTest: { enabled: false, ...partial.abTest },
    analytics: { ...DEFAULT_ANALYTICS, ...partial.analytics },
    pixels: {
      enabled: false,
      customEvents: [],
      ...partial.pixels,
    },
    style: { ...DEFAULT_STYLE, ...partial.style },
    assignedHeadlineVariant: partial.assignedHeadlineVariant,
    assignedVideoVariant: partial.assignedVideoVariant,
    assignedSpeedVariant: partial.assignedSpeedVariant,
  };
}
