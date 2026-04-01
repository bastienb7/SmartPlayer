import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

export interface SocialProofMessage {
  text: string;
  /** Optional avatar URL */
  avatar?: string;
  /** When to show (video seconds). If not set, shown at random intervals */
  showAt?: number;
}

export interface SocialProofConfig {
  enabled: boolean;
  messages: SocialProofMessage[];
  /** Position of notifications */
  position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Minimum interval between popups (seconds) */
  intervalSeconds: number;
  /** How long each popup stays visible (ms) */
  displayDurationMs: number;
  /** Maximum popups per session */
  maxPerSession: number;
  /** Only show during/after pitch */
  showAfterTimestamp?: number;
}

/**
 * Social Proof Popups™
 *
 * Shows "X just purchased" notifications during the video to create
 * social proof and urgency. Can be timed or random.
 */
export class SocialProof {
  private currentPopup: HTMLElement | null = null;
  private showCount = 0;
  private messageIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private firedTimestamps = new Set<number>();
  private container: HTMLElement;

  constructor(
    private bus: EventBus,
    private config: SocialProofConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.messages.length === 0) return;

    // Timed messages
    const timedMessages = this.config.messages.filter((m) => m.showAt !== undefined);
    if (timedMessages.length > 0) {
      this.bus.on("video:timeupdate", (currentTime: number) => {
        for (const msg of timedMessages) {
          if (
            msg.showAt !== undefined &&
            !this.firedTimestamps.has(msg.showAt) &&
            currentTime >= msg.showAt &&
            currentTime < msg.showAt + 1.5
          ) {
            this.firedTimestamps.add(msg.showAt);
            this.showPopup(msg);
          }
        }
      });
    }

    // Random interval messages
    const untimed = this.config.messages.filter((m) => m.showAt === undefined);
    if (untimed.length > 0) {
      this.bus.on("video:play", () => {
        if (!this.timer) {
          this.timer = setInterval(() => {
            if (this.engine_playing() && this.canShow()) {
              const msg = untimed[this.messageIndex % untimed.length];
              this.messageIndex++;
              this.showPopup(msg);
            }
          }, this.config.intervalSeconds * 1000);
        }
      });

      this.bus.on("video:pause", () => {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      });
    }
  }

  private canShow(): boolean {
    if (this.showCount >= this.config.maxPerSession) return false;
    if (this.currentPopup) return false;
    return true;
  }

  private engine_playing(): boolean {
    const video = this.container.querySelector("video");
    return video ? !video.paused : false;
  }

  private showPopup(msg: SocialProofMessage): void {
    if (!this.canShow()) return;
    this.showCount++;
    this.dismissCurrent();

    const popup = createElement("div", { class: "sp-social-proof" }, {
      position: "fixed",
      zIndex: "9998",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      backgroundColor: "rgba(255,255,255,0.95)",
      color: "#1a1a1a",
      padding: "12px 20px",
      borderRadius: "12px",
      fontSize: "14px",
      fontFamily: "var(--sp-font)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      maxWidth: "320px",
      transition: "transform 0.4s ease, opacity 0.4s ease",
      transform: "translateY(20px)",
      opacity: "0",
      ...this.getPositionStyles(),
    });

    if (msg.avatar) {
      const avatar = createElement("img", { src: msg.avatar, alt: "" }, {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: "0",
      });
      popup.appendChild(avatar);
    } else {
      const emoji = createElement("span", {}, { fontSize: "20px" });
      emoji.textContent = "🎉";
      popup.appendChild(emoji);
    }

    const text = createElement("span", {}, { lineHeight: "1.4" });
    text.textContent = msg.text;
    popup.appendChild(text);

    document.body.appendChild(popup);
    this.currentPopup = popup;

    // Animate in
    requestAnimationFrame(() => {
      popup.style.transform = "translateY(0)";
      popup.style.opacity = "1";
    });

    // Auto dismiss
    setTimeout(() => {
      if (this.currentPopup === popup) {
        this.dismissCurrent();
      }
    }, this.config.displayDurationMs);

    this.bus.emit("analytics:event", "social_proof_show", { text: msg.text });
  }

  private dismissCurrent(): void {
    if (this.currentPopup) {
      const el = this.currentPopup;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      this.currentPopup = null;
      setTimeout(() => removeElement(el), 400);
    }
  }

  private getPositionStyles(): Partial<CSSStyleDeclaration> {
    switch (this.config.position) {
      case "bottom-right": return { bottom: "24px", right: "24px" };
      case "top-left": return { top: "24px", left: "24px" };
      case "top-right": return { top: "24px", right: "24px" };
      case "bottom-left":
      default: return { bottom: "24px", left: "24px" };
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.dismissCurrent();
  }
}
