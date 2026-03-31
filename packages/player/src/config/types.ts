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

export interface AutoplayVariant {
  id: string;
  overlayType: "default" | "image" | "minimal";
  mutedMessage?: string;
  clickMessage?: string;
  overlayImageUrl?: string;
  overlayImagePosition?: string;
  overlayOpacity?: number;
  weight?: number;
}

export interface AutoplayConfig {
  enabled: boolean;

  /** Overlay type: "default" = icon+text, "image" = custom image/GIF, "minimal" = small pill */
  overlayType: "default" | "image" | "minimal";

  // Text overlay
  mutedMessage: string;
  clickMessage: string;
  messageColor: string;
  messageSize: string;

  // Custom image/GIF overlay
  overlayImageUrl?: string;
  overlayImagePosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom";
  overlayImageWidth?: string;
  overlayOffsetX?: string;
  overlayOffsetY?: string;

  // Background
  overlayOpacity: number;
  overlayColor: string;
  overlayGradient: boolean;

  // Muted segment — which part of the video plays while muted
  mutedSegmentStart: number;
  mutedSegmentEnd?: number;

  // Trigger
  trigger: "click" | "any-click" | "scroll" | "tap";

  // A/B testing
  abTestEnabled: boolean;
  abTestId?: string;
  variants?: AutoplayVariant[];
  assignedVariantId?: string;

  // Behavior
  restartOnUnmute: boolean;
  showPlayButtonOnBlock: boolean;
  playButtonColor?: string;
  playButtonSize?: number;

  // Animation
  overlayAnimation: "none" | "fade" | "pulse" | "bounce";
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
  type: "text" | "image" | "gif";
  /** Text content (for type "text") */
  text?: string;
  /** Image/GIF URL for desktop (for type "image" | "gif") */
  imageUrl?: string;
  /** Separate image/GIF URL for mobile (optional) */
  mobileImageUrl?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Text styling (for type "text") */
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    padding?: string;
    maxWidth?: string;
  };
  /** Tracking — populated by server for analytics */
  weight?: number;
}

export interface HeadlineConfig {
  enabled: boolean;
  variants: HeadlineVariant[];
  /** CSS selector of the container to inject headline into. If not set, headline is placed above the player. */
  targetSelector?: string;
  /** Enable A/B testing across variants */
  abTestEnabled: boolean;
  /** ID of the A/B test (for analytics attribution) */
  abTestId?: string;
  /** "no headline" control variant — tests whether any headline helps */
  includeNoHeadlineVariant: boolean;
  /** Assigned variant ID (from server — sticky per viewer) */
  assignedVariantId?: string;
  /** Responsive breakpoint for mobile (px) */
  mobileBreakpoint: number;
  /** Where to place the headline relative to the player */
  position: "above" | "below" | "overlay-top" | "overlay-bottom";
  /** Animation on appearance */
  animation: "none" | "fade" | "slide-down" | "slide-up";
  /** Click action — optional link */
  clickUrl?: string;
  clickOpenNewTab?: boolean;
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
  overlayType: "default",
  mutedMessage: "Your video has already started",
  clickMessage: "Click to listen",
  messageColor: "#ffffff",
  messageSize: "18px",
  overlayImagePosition: "center",
  overlayOpacity: 0.85,
  overlayColor: "#000000",
  overlayGradient: false,
  mutedSegmentStart: 0,
  trigger: "click",
  abTestEnabled: false,
  restartOnUnmute: true,
  showPlayButtonOnBlock: true,
  overlayAnimation: "fade",
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
      abTestEnabled: false,
      includeNoHeadlineVariant: false,
      mobileBreakpoint: 768,
      position: "above",
      animation: "fade",
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
