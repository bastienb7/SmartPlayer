import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

export interface FunnelStepVariant {
  id: string;
  hlsUrl: string;
  duration: number;
  weight?: number;
}

export interface FunnelStep {
  id: string;
  category: "hook" | "body" | "cta" | "bonus" | "custom";
  /** Assigned variant (from server, sticky per viewer) */
  assignedVariant: FunnelStepVariant;
  /** All variants for this step (for analytics attribution) */
  variants: FunnelStepVariant[];
  /** A/B test ID for this step */
  abTestId?: string;
}

export interface VideoFunnelConfig {
  enabled: boolean;
  funnelId: string;
  steps: FunnelStep[];
  /** Show combined progress bar across all steps */
  combinedProgress: boolean;
  /** Pre-load next step N seconds before current ends */
  preloadSeconds: number;
}

interface StepState {
  step: FunnelStep;
  startTimeInFunnel: number; // cumulative start time
  duration: number;
}

/**
 * Video Funnel™ — Seamless multi-video sequences.
 *
 * Plays multiple videos back-to-back with zero gap.
 * The viewer sees one continuous video. Progress bar shows
 * total combined duration.
 *
 * Each step can be A/B tested independently with auto-winner.
 * Categories: hook, body, cta, bonus, custom.
 *
 * Technical approach:
 * - Pre-loads next video HLS manifest N seconds before transition
 * - Uses hls.js loadSource() for seamless switch (same <video> element)
 * - Combined progress maps currentStep time → total funnel time
 * - Analytics tracks per-step: entries, completions, drop-offs
 */
export class VideoFunnel {
  private currentStepIndex = 0;
  private stepStates: StepState[] = [];
  private totalDuration = 0;
  private preloading = false;
  private preloadedUrl: string | null = null;
  private transitionPending = false;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: VideoFunnelConfig
  ) {}

  init(): void {
    if (!this.config.enabled || this.config.steps.length === 0) return;

    // Build step states with cumulative start times
    let cumulative = 0;
    for (const step of this.config.steps) {
      const duration = step.assignedVariant.duration;
      this.stepStates.push({
        step,
        startTimeInFunnel: cumulative,
        duration,
      });
      cumulative += duration;
    }
    this.totalDuration = cumulative;

    // Override the duration reported to the UI
    this.bus.emit("funnel:totalDuration", this.totalDuration);

    // Listen for timeupdate to manage transitions and combined progress
    this.bus.on("video:timeupdate", (currentTime: number, _duration: number) => {
      this.handleTimeUpdate(currentTime);
    });

    // Listen for video ended to transition
    this.bus.on("video:ended", () => {
      this.transitionToNext();
    });

    // Track step entry
    this.emitStepEvent("funnel_step_enter", 0);
  }

  private handleTimeUpdate(currentTime: number): void {
    const state = this.stepStates[this.currentStepIndex];
    if (!state) return;

    // Pre-load next step
    if (
      !this.preloading &&
      this.currentStepIndex < this.stepStates.length - 1 &&
      currentTime >= state.duration - this.config.preloadSeconds
    ) {
      this.preloadNext();
    }

    // Emit combined progress for the UI
    if (this.config.combinedProgress && this.totalDuration > 0) {
      const funnelTime = state.startTimeInFunnel + currentTime;
      const combinedProgress = funnelTime / this.totalDuration;

      this.bus.emit("funnel:progress", {
        funnelTime,
        totalDuration: this.totalDuration,
        combinedProgress,
        currentStep: this.currentStepIndex,
        totalSteps: this.stepStates.length,
        stepCategory: state.step.category,
      });
    }
  }

  /**
   * Pre-load the next video's HLS manifest.
   * This ensures the first segments are buffered before the transition,
   * making the switch imperceptible.
   */
  private preloadNext(): void {
    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.stepStates.length) return;

    this.preloading = true;
    const nextUrl = this.stepStates[nextIndex].step.assignedVariant.hlsUrl;
    this.preloadedUrl = nextUrl;

    // Create a hidden preload request for the manifest
    // hls.js will cache the manifest and initial segments
    try {
      fetch(nextUrl).catch(() => {});
    } catch {
      // Silent — preload is best-effort
    }

    this.bus.emit("analytics:event", "funnel_preload", {
      funnelId: this.config.funnelId,
      nextStep: nextIndex,
      category: this.stepStates[nextIndex].step.category,
    });
  }

  /**
   * Seamless transition to the next video.
   * The <video> element stays the same — only the HLS source changes.
   */
  private transitionToNext(): void {
    if (this.transitionPending) return;

    const prevIndex = this.currentStepIndex;
    const nextIndex = prevIndex + 1;

    // Track step completion
    this.emitStepEvent("funnel_step_complete", prevIndex);

    // Check if funnel is done
    if (nextIndex >= this.stepStates.length) {
      this.bus.emit("analytics:event", "funnel_complete", {
        funnelId: this.config.funnelId,
        totalSteps: this.stepStates.length,
      });
      return;
    }

    this.transitionPending = true;
    this.currentStepIndex = nextIndex;
    this.preloading = false;

    const nextState = this.stepStates[nextIndex];
    const nextUrl = nextState.step.assignedVariant.hlsUrl;

    // Switch HLS source — the key to seamless transition
    // The video element stays alive, only the source changes
    this.engine.load(nextUrl);

    // Wait for the new source to be ready, then play immediately
    this.bus.once("engine:ready", () => {
      this.transitionPending = false;
      this.engine.play().catch(() => {});

      // Track step entry
      this.emitStepEvent("funnel_step_enter", nextIndex);
    });

    this.bus.emit("analytics:event", "funnel_transition", {
      funnelId: this.config.funnelId,
      fromStep: prevIndex,
      toStep: nextIndex,
      fromCategory: this.stepStates[prevIndex].step.category,
      toCategory: nextState.step.category,
    });
  }

  private emitStepEvent(type: string, stepIndex: number): void {
    const state = this.stepStates[stepIndex];
    if (!state) return;

    this.bus.emit("analytics:event", type, {
      funnelId: this.config.funnelId,
      stepIndex,
      stepId: state.step.id,
      category: state.step.category,
      variantId: state.step.assignedVariant.id,
      abTestId: state.step.abTestId,
    });
  }

  /** Get the combined funnel time for a given real video currentTime */
  getCombinedTime(currentTime: number): number {
    const state = this.stepStates[this.currentStepIndex];
    return state ? state.startTimeInFunnel + currentTime : currentTime;
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  getCurrentStep(): FunnelStep | null {
    return this.stepStates[this.currentStepIndex]?.step || null;
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /** Seek to a position in the combined funnel timeline */
  seekToFunnelTime(funnelTime: number): void {
    // Find which step this time falls in
    for (let i = 0; i < this.stepStates.length; i++) {
      const state = this.stepStates[i];
      const stepEnd = state.startTimeInFunnel + state.duration;

      if (funnelTime < stepEnd || i === this.stepStates.length - 1) {
        const localTime = funnelTime - state.startTimeInFunnel;

        if (i !== this.currentStepIndex) {
          // Need to switch to a different step
          this.currentStepIndex = i;
          this.engine.load(state.step.assignedVariant.hlsUrl);
          this.bus.once("engine:ready", () => {
            this.engine.seek(Math.max(0, localTime));
            this.engine.play().catch(() => {});
          });
        } else {
          this.engine.seek(Math.max(0, localTime));
        }
        break;
      }
    }
  }

  destroy(): void {}
}
