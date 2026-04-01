import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

export interface ExitIntentConfig {
  enabled: boolean;
  /** Message shown in the popup */
  message: string;
  /** Sub-message / description */
  subMessage?: string;
  /** Button text */
  buttonText: string;
  /** Custom image URL for the popup */
  imageUrl?: string;
  /** Styling */
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  /** Triggers */
  triggerOnMouseLeave: boolean;
  triggerOnTabSwitch: boolean;
  triggerOnBackButton: boolean;
  triggerOnIdle: boolean;
  /** Idle timeout in seconds */
  idleTimeoutSeconds: number;
  /** Max times to show per session */
  maxShowsPerSession: number;
  /** Minimum seconds watched before showing */
  minWatchSeconds: number;
  /** Context-aware messages based on video progress */
  contextMessages?: {
    beforePitch?: string;   // shown if < pitchTimestamp
    duringPitch?: string;   // shown if >= pitchTimestamp
    afterPitch?: string;    // shown after video ends
  };
  /** Timestamp (seconds) where the sales pitch begins */
  pitchTimestamp?: number;
}

/**
 * Exit-Intent Popup™
 *
 * Detects when a viewer is about to leave and shows a retention popup.
 * Context-aware: message changes based on how far into the video they are.
 */
export class ExitIntent {
  private popup: HTMLElement | null = null;
  private showCount = 0;
  private container: HTMLElement;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private mouseMoveHandler: (() => void) | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: ExitIntentConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled) return;

    // Mouse leave (desktop) — mouse moves toward browser chrome
    if (this.config.triggerOnMouseLeave) {
      document.addEventListener("mouseout", this.handleMouseOut);
    }

    // Tab switch
    if (this.config.triggerOnTabSwitch) {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }

    // Back button
    if (this.config.triggerOnBackButton) {
      history.pushState(null, "", location.href);
      window.addEventListener("popstate", this.handlePopState);
    }

    // Idle detection
    if (this.config.triggerOnIdle) {
      this.startIdleTimer();
      this.mouseMoveHandler = () => this.resetIdleTimer();
      document.addEventListener("mousemove", this.mouseMoveHandler);
      document.addEventListener("keydown", this.mouseMoveHandler);
    }
  }

  private handleMouseOut = (e: MouseEvent): void => {
    // Only trigger when mouse leaves toward the top (browser chrome)
    if (e.clientY <= 5 && !this.engine.paused) {
      this.tryShow();
    }
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === "hidden" && !this.engine.paused) {
      // Show when they come back
      const onReturn = () => {
        if (document.visibilityState === "visible") {
          this.tryShow();
          document.removeEventListener("visibilitychange", onReturn);
        }
      };
      document.addEventListener("visibilitychange", onReturn);
    }
  };

  private handlePopState = (): void => {
    if (!this.engine.paused) {
      history.pushState(null, "", location.href);
      this.tryShow();
    }
  };

  private startIdleTimer(): void {
    this.idleTimer = setTimeout(() => {
      if (!this.engine.paused) {
        this.tryShow();
      }
    }, this.config.idleTimeoutSeconds * 1000);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.config.triggerOnIdle) this.startIdleTimer();
  }

  private tryShow(): void {
    // Guard: max shows
    if (this.showCount >= this.config.maxShowsPerSession) return;

    // Guard: min watch time
    if (this.engine.currentTime < this.config.minWatchSeconds) return;

    // Guard: already showing
    if (this.popup) return;

    this.showCount++;
    this.showPopup();
  }

  private showPopup(): void {
    const message = this.getContextMessage();

    // Backdrop
    this.popup = createElement("div", { class: "sp-exit-intent" }, {
      position: "fixed",
      top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: "99999",
      animation: "sp-fade-in 0.3s ease",
    });

    // Card
    const card = createElement("div", {}, {
      backgroundColor: this.config.backgroundColor || "#1a1a2e",
      borderRadius: "16px",
      padding: "32px",
      maxWidth: "440px",
      width: "90%",
      textAlign: "center",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      animation: "sp-bounce 0.4s ease",
    });

    // Image
    if (this.config.imageUrl) {
      const img = createElement("img", { src: this.config.imageUrl, alt: "" }, {
        width: "80px", height: "80px",
        borderRadius: "50%",
        objectFit: "cover",
        margin: "0 auto 16px",
        display: "block",
      });
      card.appendChild(img);
    }

    // Message
    const msg = createElement("h3", {}, {
      color: this.config.textColor || "#ffffff",
      fontSize: "22px",
      fontWeight: "700",
      marginBottom: "12px",
      fontFamily: "var(--sp-font)",
      lineHeight: "1.3",
    });
    msg.textContent = message;
    card.appendChild(msg);

    // Sub-message
    if (this.config.subMessage) {
      const sub = createElement("p", {}, {
        color: this.config.textColor || "#ffffff",
        opacity: "0.7",
        fontSize: "15px",
        marginBottom: "24px",
        fontFamily: "var(--sp-font)",
        lineHeight: "1.5",
      });
      sub.textContent = this.config.subMessage;
      card.appendChild(sub);
    }

    // Continue button
    const btn = createElement("button", {}, {
      backgroundColor: this.config.buttonColor || "var(--sp-primary, #6366f1)",
      color: "#ffffff",
      border: "none",
      borderRadius: "10px",
      padding: "14px 32px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      fontFamily: "var(--sp-font)",
      transition: "transform 0.2s ease",
      width: "100%",
    });
    btn.textContent = this.config.buttonText;
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.03)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });
    btn.addEventListener("click", () => this.dismiss());
    card.appendChild(btn);

    this.popup.appendChild(card);

    // Click backdrop to dismiss
    this.popup.addEventListener("click", (e) => {
      if (e.target === this.popup) this.dismiss();
    });

    document.body.appendChild(this.popup);

    this.bus.emit("analytics:event", "exit_intent_show", {
      watchTime: this.engine.currentTime,
      showCount: this.showCount,
    });
  }

  private getContextMessage(): string {
    const ctx = this.config.contextMessages;
    if (!ctx || !this.config.pitchTimestamp) return this.config.message;

    const time = this.engine.currentTime;
    const pitch = this.config.pitchTimestamp;

    if (time >= this.engine.duration - 5 && ctx.afterPitch) return ctx.afterPitch;
    if (time >= pitch && ctx.duringPitch) return ctx.duringPitch;
    if (ctx.beforePitch) return ctx.beforePitch;

    return this.config.message;
  }

  private dismiss(): void {
    if (this.popup) {
      const el = this.popup;
      el.style.opacity = "0";
      el.style.transition = "opacity 0.2s ease";
      this.popup = null;
      setTimeout(() => removeElement(el), 200);

      this.bus.emit("analytics:event", "exit_intent_dismiss", {
        showCount: this.showCount,
      });
    }
  }

  destroy(): void {
    document.removeEventListener("mouseout", this.handleMouseOut);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("popstate", this.handlePopState);
    if (this.mouseMoveHandler) {
      document.removeEventListener("mousemove", this.mouseMoveHandler);
      document.removeEventListener("keydown", this.mouseMoveHandler);
    }
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.dismiss();
  }
}
