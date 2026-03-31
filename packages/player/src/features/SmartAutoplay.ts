import type { AutoplayConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

export class SmartAutoplay {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: AutoplayConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  async init(): Promise<void> {
    if (!this.config.enabled) return;

    // Attempt muted autoplay
    this.engine.setMuted(true);
    try {
      await this.engine.play();
      this.showOverlay();
      this.bus.emit("analytics:event", "autoplay_start");
    } catch {
      // Autoplay blocked — show poster with play button
      this.showPlayButton();
    }
  }

  private showOverlay(): void {
    this.overlay = createElement("div", {}, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `rgba(0,0,0,${this.config.overlayOpacity})`,
      cursor: "pointer",
      zIndex: "20",
      transition: "opacity 0.3s ease",
    });

    const icon = createElement("div", {}, {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      border: "3px solid white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "16px",
    });
    // Muted speaker SVG
    icon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

    const msg = createElement("div", {}, {
      color: "white",
      fontSize: "18px",
      fontWeight: "600",
      textAlign: "center",
      marginBottom: "8px",
      fontFamily: "var(--sp-font)",
    });
    msg.textContent = this.config.mutedMessage;

    const sub = createElement("div", {}, {
      color: "rgba(255,255,255,0.8)",
      fontSize: "14px",
      textAlign: "center",
      fontFamily: "var(--sp-font)",
    });
    sub.textContent = this.config.clickMessage;

    this.overlay.appendChild(icon);
    this.overlay.appendChild(msg);
    this.overlay.appendChild(sub);

    this.overlay.addEventListener("click", this.handleClick);
    this.container.appendChild(this.overlay);
  }

  private showPlayButton(): void {
    this.overlay = createElement("div", {}, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
      cursor: "pointer",
      zIndex: "20",
    });

    const btn = createElement("div", {}, {
      width: "72px",
      height: "72px",
      borderRadius: "50%",
      backgroundColor: "var(--sp-primary, #6366f1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      transition: "transform 0.2s ease",
    });
    btn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

    this.overlay.appendChild(btn);
    this.overlay.addEventListener("click", this.handleClick);
    this.container.appendChild(this.overlay);
  }

  private handleClick = (): void => {
    this.dismiss();
    // Restart from beginning with sound
    this.engine.seek(0);
    this.engine.setMuted(false);
    this.engine.play();
    this.bus.emit("analytics:event", "autoplay_click");
  };

  private dismiss(): void {
    if (this.overlay) {
      const el = this.overlay;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      this.overlay = null;
      setTimeout(() => removeElement(el), 300);
    }
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.removeEventListener("click", this.handleClick);
      removeElement(this.overlay);
      this.overlay = null;
    }
  }
}
