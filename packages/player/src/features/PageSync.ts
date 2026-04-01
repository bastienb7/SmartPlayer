import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";

export interface PageSyncRule {
  selector: string;
  action: "show" | "hide" | "addClass" | "removeClass" | "scrollTo" | "setAttribute" | "callback";
  at: number; // seconds
  endAt?: number; // seconds (auto-revert)
  className?: string;
  attribute?: string;
  value?: string;
  callback?: (el: Element, time: number) => void;
}

export interface PageSyncConfig {
  enabled: boolean;
  rules: PageSyncRule[];
}

/**
 * Delay Code / Page Sync™
 *
 * Synchronizes ANY element on the page with the video timeline.
 * Users define rules: "show #prix at 750s", "hide .navbar at 0s", etc.
 *
 * Public API exposed on window.SmartPlayer:
 *   SmartPlayer.showAt(selector, seconds)
 *   SmartPlayer.hideAt(selector, seconds)
 *   SmartPlayer.classAt(selector, className, seconds, endSeconds?)
 *   SmartPlayer.scrollAt(selector, seconds)
 *   SmartPlayer.onTime(seconds, callback)
 */
export class PageSync {
  private firedRules = new Set<string>();
  private revertTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private timeCallbacks: Array<{ time: number; fn: (t: number) => void; fired: boolean }> = [];

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: PageSyncConfig
  ) {}

  init(): void {
    if (!this.config.enabled && this.config.rules.length === 0 && this.timeCallbacks.length === 0) return;

    this.bus.on("video:timeupdate", (currentTime: number) => {
      // Process rules
      for (let i = 0; i < this.config.rules.length; i++) {
        const rule = this.config.rules[i];
        const key = `rule-${i}`;

        if (!this.firedRules.has(key) && currentTime >= rule.at) {
          this.executeRule(rule, key);
          this.firedRules.add(key);
        }
      }

      // Process time callbacks
      for (const cb of this.timeCallbacks) {
        if (!cb.fired && currentTime >= cb.time) {
          cb.fn(currentTime);
          cb.fired = true;
        }
      }
    });

    // Reset on seek backward
    this.bus.on("video:seeked", () => {
      const currentTime = this.engine.currentTime;
      // Re-enable rules that are after current time
      for (let i = 0; i < this.config.rules.length; i++) {
        if (this.config.rules[i].at > currentTime) {
          this.firedRules.delete(`rule-${i}`);
        }
      }
      for (const cb of this.timeCallbacks) {
        if (cb.time > currentTime) cb.fired = false;
      }
    });

    // Expose public API
    this.exposeAPI();
  }

  private executeRule(rule: PageSyncRule, key: string): void {
    const elements = document.querySelectorAll(rule.selector);
    if (elements.length === 0) return;

    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      switch (rule.action) {
        case "show":
          htmlEl.style.display = "";
          htmlEl.style.visibility = "visible";
          htmlEl.style.opacity = "1";
          break;
        case "hide":
          htmlEl.style.display = "none";
          break;
        case "addClass":
          if (rule.className) el.classList.add(rule.className);
          break;
        case "removeClass":
          if (rule.className) el.classList.remove(rule.className);
          break;
        case "scrollTo":
          htmlEl.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        case "setAttribute":
          if (rule.attribute) el.setAttribute(rule.attribute, rule.value || "");
          break;
        case "callback":
          if (rule.callback) rule.callback(el, this.engine.currentTime);
          break;
      }
    });

    // Auto-revert after endAt
    if (rule.endAt && rule.endAt > rule.at) {
      const revertDelay = (rule.endAt - rule.at) * 1000;
      const timer = setTimeout(() => {
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          switch (rule.action) {
            case "show":
              htmlEl.style.display = "none";
              break;
            case "hide":
              htmlEl.style.display = "";
              htmlEl.style.visibility = "visible";
              break;
            case "addClass":
              if (rule.className) el.classList.remove(rule.className);
              break;
            case "removeClass":
              if (rule.className) el.classList.add(rule.className);
              break;
          }
        });
      }, revertDelay);
      this.revertTimers.set(key, timer);
    }

    this.bus.emit("analytics:event", "page_sync", {
      selector: rule.selector,
      action: rule.action,
      at: rule.at,
    });
  }

  /** Expose public API on window.SmartPlayer */
  private exposeAPI(): void {
    const sp = (window as any).SmartPlayer;
    if (!sp) return;

    sp.showAt = (selector: string, seconds: number, endSeconds?: number) => {
      this.config.rules.push({
        selector, action: "show", at: seconds, endAt: endSeconds,
      });
    };

    sp.hideAt = (selector: string, seconds: number, endSeconds?: number) => {
      this.config.rules.push({
        selector, action: "hide", at: seconds, endAt: endSeconds,
      });
    };

    sp.classAt = (selector: string, className: string, seconds: number, endSeconds?: number) => {
      this.config.rules.push({
        selector, action: "addClass", className, at: seconds, endAt: endSeconds,
      });
    };

    sp.scrollAt = (selector: string, seconds: number) => {
      this.config.rules.push({
        selector, action: "scrollTo", at: seconds,
      });
    };

    sp.onTime = (seconds: number, fn: (t: number) => void) => {
      this.timeCallbacks.push({ time: seconds, fn, fired: false });
    };
  }

  destroy(): void {
    for (const timer of this.revertTimers.values()) {
      clearTimeout(timer);
    }
    this.revertTimers.clear();
  }
}
