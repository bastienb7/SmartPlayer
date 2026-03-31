import type { ProgressBarConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { StateManager } from "../core/StateManager";

/**
 * Maps real video progress to a fictitious display progress
 * that makes the video appear shorter (fast start, slow middle).
 *
 * Uses piecewise linear interpolation with easing at transitions.
 */
export class FictitiousProgress {
  constructor(
    private bus: EventBus,
    private state: StateManager,
    private config: ProgressBarConfig
  ) {}

  init(): void {
    if (!this.config.enabled || !this.config.fictitious) return;

    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const real = currentTime / duration;
      const display = this.mapProgress(real);
      this.state.update({ progress: real, displayProgress: display });
    });
  }

  mapProgress(real: number): number {
    const {
      fastPhaseEnd,
      slowPhaseEnd,
      fastPhaseDisplay,
      slowPhaseDisplay,
    } = this.config;

    if (real <= 0) return 0;
    if (real >= 1) return 1;

    // Phase 1: Fast start (0 → fastPhaseEnd real → 0 → fastPhaseDisplay display)
    if (real <= fastPhaseEnd) {
      const t = real / fastPhaseEnd;
      return easeOutQuart(t) * fastPhaseDisplay;
    }

    // Phase 2: Slow middle (fastPhaseEnd → slowPhaseEnd real → fastPhaseDisplay → slowPhaseDisplay display)
    if (real <= slowPhaseEnd) {
      const t = (real - fastPhaseEnd) / (slowPhaseEnd - fastPhaseEnd);
      return fastPhaseDisplay + t * (slowPhaseDisplay - fastPhaseDisplay);
    }

    // Phase 3: Normal end (slowPhaseEnd → 1 real → slowPhaseDisplay → 1 display)
    const t = (real - slowPhaseEnd) / (1 - slowPhaseEnd);
    return slowPhaseDisplay + easeInQuart(t) * (1 - slowPhaseDisplay);
  }

  /** Inverse mapping: convert display progress back to real progress (for seeking) */
  inverseMapProgress(display: number): number {
    const {
      fastPhaseEnd,
      slowPhaseEnd,
      fastPhaseDisplay,
      slowPhaseDisplay,
    } = this.config;

    if (display <= 0) return 0;
    if (display >= 1) return 1;

    if (display <= fastPhaseDisplay) {
      const t = inverseEaseOutQuart(display / fastPhaseDisplay);
      return t * fastPhaseEnd;
    }

    if (display <= slowPhaseDisplay) {
      const t =
        (display - fastPhaseDisplay) / (slowPhaseDisplay - fastPhaseDisplay);
      return fastPhaseEnd + t * (slowPhaseEnd - fastPhaseEnd);
    }

    const normalized = (display - slowPhaseDisplay) / (1 - slowPhaseDisplay);
    const t = inverseEaseInQuart(normalized);
    return slowPhaseEnd + t * (1 - slowPhaseEnd);
  }

  destroy(): void {}
}

// Easing functions
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeInQuart(t: number): number {
  return t * t * t * t;
}

function inverseEaseOutQuart(y: number): number {
  return 1 - Math.pow(1 - y, 0.25);
}

function inverseEaseInQuart(y: number): number {
  return Math.pow(y, 0.25);
}
