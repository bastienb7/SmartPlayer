import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

export interface SmartABRConfig {
  enabled: boolean;
  /** Prefer stability over quality (useful for unstable connections) */
  preferStability: boolean;
  /** Allow viewer to lock quality manually */
  allowQualityLock: boolean;
  /** Minimum buffer seconds before upgrading quality */
  upgradeBufferThreshold: number;
  /** Maximum consecutive downgrades before locking to low quality */
  maxConsecutiveDowngrades: number;
}

/**
 * Smart ABR™ — Intelligent Adaptive Bitrate.
 *
 * Improves upon hls.js default ABR by:
 * - Tracking bandwidth stability (not just instantaneous speed)
 * - Preventing quality oscillation on unstable connections
 * - Auto-locking to stable quality after repeated downgrades
 * - Pre-buffering aggressively when connection is good
 * - Quality lock API for viewer manual control
 *
 * Instead of: 720p→360p→720p→360p (oscillating)
 * We do:      720p→480p (stable, locked after 3 downgrades)
 */
export class SmartABR {
  private consecutiveDowngrades = 0;
  private lastQualityLevel = -1;
  private lockedLevel: number | null = null;
  private bandwidthSamples: number[] = [];

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: SmartABRConfig
  ) {}

  init(): void {
    if (!this.config.enabled) return;

    // Monitor quality changes from hls.js
    this.bus.on("engine:qualities", () => {
      this.setupMonitoring();
    });

    // Expose quality lock API
    if (this.config.allowQualityLock) {
      const sp = (window as any).SmartPlayer;
      if (sp) {
        sp.lockQuality = (levelIndex: number) => {
          this.lockedLevel = levelIndex;
          this.engine.setQuality(levelIndex);
          this.bus.emit("analytics:event", "quality_lock", { level: levelIndex });
        };
        sp.unlockQuality = () => {
          this.lockedLevel = null;
          this.engine.setQuality(-1); // auto
          this.bus.emit("analytics:event", "quality_unlock");
        };
      }
    }
  }

  private setupMonitoring(): void {
    // Track bandwidth via video buffering behavior
    const video = this.engine.video;

    // Check buffer health periodically
    const checkInterval = setInterval(() => {
      if (video.paused || !video.buffered.length) return;

      const bufferedAhead = video.buffered.end(video.buffered.length - 1) - video.currentTime;

      // Track bandwidth stability
      this.bandwidthSamples.push(bufferedAhead);
      if (this.bandwidthSamples.length > 10) this.bandwidthSamples.shift();

      // If locked, don't adjust
      if (this.lockedLevel !== null) return;

      // Calculate stability
      const stability = this.calculateStability();

      if (this.config.preferStability && stability < 0.5 && bufferedAhead < 3) {
        // Unstable connection with low buffer — force downgrade and lock
        const qualities = this.engine.getQualities();
        if (qualities.length > 1) {
          const stableLevel = Math.max(0, Math.floor(qualities.length / 2));
          this.engine.setQuality(stableLevel);
          this.lockedLevel = stableLevel;

          this.bus.emit("analytics:event", "abr_stability_lock", {
            level: stableLevel,
            stability,
            bufferedAhead,
          });
        }
      }
    }, 3000);

    // Track quality level changes
    video.addEventListener("playing", () => {
      const qualities = this.engine.getQualities();
      if (qualities.length === 0) return;

      // hls.js emits level changes — we can detect via video dimensions
      const currentHeight = video.videoHeight;
      const currentLevel = qualities.findIndex((q) => q.height === currentHeight);

      if (currentLevel >= 0 && this.lastQualityLevel >= 0) {
        if (currentLevel < this.lastQualityLevel) {
          // Downgrade detected
          this.consecutiveDowngrades++;

          if (this.consecutiveDowngrades >= this.config.maxConsecutiveDowngrades) {
            // Lock to current lower quality
            this.lockedLevel = currentLevel;
            this.engine.setQuality(currentLevel);

            this.bus.emit("analytics:event", "abr_downgrade_lock", {
              level: currentLevel,
              downgrades: this.consecutiveDowngrades,
            });
          }
        } else if (currentLevel > this.lastQualityLevel) {
          // Upgrade — reset downgrade counter
          this.consecutiveDowngrades = 0;
        }
      }

      this.lastQualityLevel = currentLevel;
    });

    // Cleanup
    this.bus.on("video:ended", () => clearInterval(checkInterval));
  }

  /** Calculate bandwidth stability (0 = very unstable, 1 = very stable) */
  private calculateStability(): number {
    if (this.bandwidthSamples.length < 3) return 1;

    const avg = this.bandwidthSamples.reduce((a, b) => a + b, 0) / this.bandwidthSamples.length;
    const variance = this.bandwidthSamples.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / this.bandwidthSamples.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (lower = more stable)
    const cv = avg > 0 ? stdDev / avg : 1;
    return Math.max(0, Math.min(1, 1 - cv));
  }

  destroy(): void {}
}
