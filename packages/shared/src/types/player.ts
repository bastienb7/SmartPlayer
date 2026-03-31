export interface PlayerConfig {
  videoId: string;
  hlsUrl: string;
  posterUrl?: string;

  // Feature configs
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

  // Assigned variants (from server)
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
  overlayType: "default" | "image" | "minimal";
  mutedMessage: string;
  clickMessage: string;
  messageColor: string;
  messageSize: string;
  overlayImageUrl?: string;
  overlayImagePosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom";
  overlayImageWidth?: string;
  overlayOffsetX?: string;
  overlayOffsetY?: string;
  overlayOpacity: number;
  overlayColor: string;
  overlayGradient: boolean;
  mutedSegmentStart: number;
  mutedSegmentEnd?: number;
  trigger: "click" | "any-click" | "scroll" | "tap";
  abTestEnabled: boolean;
  abTestId?: string;
  variants?: AutoplayVariant[];
  assignedVariantId?: string;
  restartOnUnmute: boolean;
  showPlayButtonOnBlock: boolean;
  playButtonColor?: string;
  playButtonSize?: number;
  overlayAnimation: "none" | "fade" | "pulse" | "bounce";
}

export interface ProgressBarConfig {
  enabled: boolean;
  fictitious: boolean;
  /** Percentage of real progress where "fast" phase ends (0-1) */
  fastPhaseEnd: number;
  /** Percentage of real progress where "slow" phase ends (0-1) */
  slowPhaseEnd: number;
  /** Display percentage at end of fast phase (0-1) */
  fastPhaseDisplay: number;
  /** Display percentage at end of slow phase (0-1) */
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
  text?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  altText?: string;
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    padding?: string;
    maxWidth?: string;
  };
  weight?: number;
}

export interface HeadlineConfig {
  enabled: boolean;
  variants: HeadlineVariant[];
  targetSelector?: string;
  abTestEnabled: boolean;
  abTestId?: string;
  includeNoHeadlineVariant: boolean;
  assignedVariantId?: string;
  mobileBreakpoint: number;
  position: "above" | "below" | "overlay-top" | "overlay-bottom";
  animation: "none" | "fade" | "slide-down" | "slide-up";
  clickUrl?: string;
  clickOpenNewTab?: boolean;
}

export interface MiniHookConfig {
  enabled: boolean;
  hooks: MiniHookItem[];
}

export interface MiniHookItem {
  type: "countdown" | "milestone" | "custom";
  triggerAtPercent: number;
  text: string;
  durationMs: number;
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

export interface PixelConfig {
  enabled: boolean;
  facebook?: FacebookPixelConfig;
  google?: GooglePixelConfig;
  tiktok?: TikTokPixelConfig;
  customEvents: PixelEvent[];
}

export interface FacebookPixelConfig {
  pixelId: string;
}

export interface GooglePixelConfig {
  measurementId: string;
}

export interface TikTokPixelConfig {
  pixelId: string;
}

export interface PixelEvent {
  platform: "facebook" | "google" | "tiktok";
  eventName: string;
  triggerTimestamp: number;
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
