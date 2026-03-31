import type { ProgressBarConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { StateManager } from "../core/StateManager";

/**
 * Smart Progress™ — Retention-adaptive fictitious progress bar.
 *
 * Two modes:
 * 1. **Smart Mode** (retentionCurve provided): The bar speed is derived from
 *    actual viewer retention data. Where retention is high (viewers stay),
 *    the bar moves fast. Where retention drops, the bar slows down.
 *    This makes the video feel shorter by front-loading perceived progress.
 *
 * 2. **Static Mode** (no retentionCurve): Uses the 3-phase piecewise
 *    easing: fast start → slow middle → normal end.
 *
 * Both modes support:
 * - Custom bar color, height, buffered color
 * - Inverse mapping for accurate seeking
 * - Smooth transitions
 *
 * Advantages:
 * - Unlike competitors, we expose the retention curve. We accept a
 *   retention curve from the server (populated by ClickHouse aggregation),
 *   making the adaptation transparent and data-driven.
 * - Custom visual styling (color, height, thumb visibility)
 */
export class FictitiousProgress {
  /** Cumulative distribution for retention-adaptive mapping */
  private cdf: number[] = [];

  constructor(
    private bus: EventBus,
    private state: StateManager,
    private config: ProgressBarConfig
  ) {}

  init(): void {
    if (!this.config.enabled || !this.config.fictitious) return;

    // Build CDF from retention curve if in smart mode
    if (this.config.smartMode && this.config.retentionCurve?.length) {
      this.cdf = this.buildCDF(this.config.retentionCurve);
    }

    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const real = currentTime / duration;
      const display = this.mapProgress(real);
      this.state.update({ progress: real, displayProgress: display });
    });
  }

  /**
   * Build cumulative distribution from retention curve.
   * Retention curve is an array of viewer percentages at each progress point.
   * e.g., [100, 95, 88, 82, 76, 70, ...] for 5% intervals.
   *
   * The CDF inverts the retention: where retention is HIGH (viewers stay),
   * the progress bar should move FAST (more visual progress per unit time).
   * Where retention is LOW (viewers leave), slow down to compress time perception.
   */
  private buildCDF(retention: number[]): number[] {
    if (retention.length < 2) return [];

    const n = retention.length;
    // Weight = retention value (higher retention → more visual progress allocated)
    const weights: number[] = [];
    for (let i = 0; i < n; i++) {
      weights.push(Math.max(1, retention[i]));
    }

    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const normalized = weights.map((w) => w / totalWeight);

    // Build cumulative sum
    const cdf: number[] = [0];
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
      cumulative += normalized[i];
      cdf.push(Math.min(1, cumulative));
    }

    return cdf;
  }

  mapProgress(real: number): number {
    if (real <= 0) return 0;
    if (real >= 1) return 1;

    // Smart mode: use retention CDF
    if (this.cdf.length > 0) {
      return this.mapFromCDF(real);
    }

    // Static mode: 3-phase piecewise easing
    return this.mapStatic(real);
  }

  /** Map using retention-based CDF (interpolated) */
  private mapFromCDF(real: number): number {
    const n = this.cdf.length - 1;
    const idx = real * n;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, n);
    const frac = idx - lo;

    // Linear interpolation between CDF points
    return this.cdf[lo] + frac * (this.cdf[hi] - this.cdf[lo]);
  }

  /** Static 3-phase mapping */
  private mapStatic(real: number): number {
    const { fastPhaseEnd, slowPhaseEnd, fastPhaseDisplay, slowPhaseDisplay } = this.config;

    if (real <= fastPhaseEnd) {
      const t = real / fastPhaseEnd;
      return easeOutQuart(t) * fastPhaseDisplay;
    }

    if (real <= slowPhaseEnd) {
      const t = (real - fastPhaseEnd) / (slowPhaseEnd - fastPhaseEnd);
      return fastPhaseDisplay + t * (slowPhaseDisplay - fastPhaseDisplay);
    }

    const t = (real - slowPhaseEnd) / (1 - slowPhaseEnd);
    return slowPhaseDisplay + easeInQuart(t) * (1 - slowPhaseDisplay);
  }

  /** Inverse mapping: display progress → real progress (for seeking) */
  inverseMapProgress(display: number): number {
    if (display <= 0) return 0;
    if (display >= 1) return 1;

    // Smart mode: binary search on CDF
    if (this.cdf.length > 0) {
      return this.inverseFromCDF(display);
    }

    // Static mode
    return this.inverseStatic(display);
  }

  private inverseFromCDF(display: number): number {
    const n = this.cdf.length - 1;

    // Binary search for the CDF segment containing display
    let lo = 0;
    let hi = n;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cdf[mid] <= display) lo = mid;
      else hi = mid;
    }

    // Interpolate within the segment
    const segStart = this.cdf[lo];
    const segEnd = this.cdf[hi];
    const segWidth = segEnd - segStart;
    const frac = segWidth > 0 ? (display - segStart) / segWidth : 0;

    return (lo + frac) / n;
  }

  private inverseStatic(display: number): number {
    const { fastPhaseEnd, slowPhaseEnd, fastPhaseDisplay, slowPhaseDisplay } = this.config;

    if (display <= fastPhaseDisplay) {
      const t = inverseEaseOutQuart(display / fastPhaseDisplay);
      return t * fastPhaseEnd;
    }

    if (display <= slowPhaseDisplay) {
      const t = (display - fastPhaseDisplay) / (slowPhaseDisplay - fastPhaseDisplay);
      return fastPhaseEnd + t * (slowPhaseEnd - fastPhaseEnd);
    }

    const normalized = (display - slowPhaseDisplay) / (1 - slowPhaseDisplay);
    const t = inverseEaseInQuart(normalized);
    return slowPhaseEnd + t * (1 - slowPhaseEnd);
  }

  destroy(): void {}
}

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
