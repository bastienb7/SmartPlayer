import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

export interface PiPConfig {
  enabled: boolean;
  /** Position of mini player */
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Width of mini player in px */
  width: number;
  /** Offset from edge in px */
  offsetX: number;
  offsetY: number;
  /** Show close button on mini player */
  showClose: boolean;
  /** Flash/grow the mini player when CTA appears */
  flashOnCTA: boolean;
}

/**
 * Picture-in-Picture™
 *
 * When the viewer scrolls past the video, it shrinks into a floating
 * mini-player in a corner. The video keeps playing while the viewer
 * reads the rest of the page. Clicking the mini-player scrolls back up.
 */
export class PictureInPicture {
  private miniPlayer: HTMLElement | null = null;
  private isInPiP = false;
  private observer: IntersectionObserver | null = null;
  private container: HTMLElement;
  private videoWrapper: HTMLElement | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: PiPConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled) return;

    this.videoWrapper = this.container.querySelector(".sp-video-wrapper");
    if (!this.videoWrapper) return;

    // Watch for the video going out of viewport
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting && !this.engine.paused) {
          this.enterPiP();
        } else if (entry.isIntersecting && this.isInPiP) {
          this.exitPiP();
        }
      },
      { threshold: 0.3 }
    );

    this.observer.observe(this.videoWrapper);

    // Exit PiP when video is paused
    this.bus.on("video:pause", () => {
      if (this.isInPiP) this.exitPiP();
    });

    // Flash on CTA
    if (this.config.flashOnCTA) {
      this.bus.on("analytics:event", (type: string) => {
        if (type === "cta_show" && this.isInPiP && this.miniPlayer) {
          this.flashMiniPlayer();
        }
      });
    }
  }

  private enterPiP(): void {
    if (this.isInPiP || !this.videoWrapper) return;
    this.isInPiP = true;

    // Create mini player container
    this.miniPlayer = createElement("div", { class: "sp-pip" }, {
      position: "fixed",
      zIndex: "9999",
      width: `${this.config.width}px`,
      aspectRatio: "16/9",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      transition: "transform 0.3s ease, opacity 0.3s ease",
      cursor: "pointer",
      border: "2px solid rgba(255,255,255,0.1)",
      ...this.getPositionStyles(),
    });

    // Move video element into mini player
    const video = this.engine.video;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";

    // Clone video into mini player (keep original in place for layout)
    // Actually, reparent: remove from wrapper, put in mini
    this.miniPlayer.appendChild(video);
    document.body.appendChild(this.miniPlayer);

    // Placeholder in original position
    const placeholder = createElement("div", { class: "sp-pip-placeholder" }, {
      width: "100%",
      paddingTop: "56.25%",
      backgroundColor: "#000",
      borderRadius: "var(--sp-radius, 8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    placeholder.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#666;font-size:14px;font-family:var(--sp-font)">Playing in mini-player ↓</div>`;
    this.videoWrapper.insertBefore(placeholder, this.videoWrapper.firstChild);

    // Close button
    if (this.config.showClose) {
      const close = createElement("div", {}, {
        position: "absolute",
        top: "8px",
        right: "8px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "rgba(0,0,0,0.6)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        cursor: "pointer",
        zIndex: "1",
      });
      close.innerHTML = "✕";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        this.exitPiP();
        this.engine.pause();
      });
      this.miniPlayer.appendChild(close);
    }

    // Click to scroll back
    this.miniPlayer.addEventListener("click", this.handleMiniClick);

    // Animate in
    this.miniPlayer.style.transform = "scale(0.8)";
    this.miniPlayer.style.opacity = "0";
    requestAnimationFrame(() => {
      if (this.miniPlayer) {
        this.miniPlayer.style.transform = "scale(1)";
        this.miniPlayer.style.opacity = "1";
      }
    });

    this.bus.emit("analytics:event", "pip_enter");
  }

  private exitPiP(): void {
    if (!this.isInPiP || !this.miniPlayer || !this.videoWrapper) return;
    this.isInPiP = false;

    // Move video back
    const video = this.engine.video;
    const placeholder = this.videoWrapper.querySelector(".sp-pip-placeholder");

    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";

    if (placeholder) {
      this.videoWrapper.replaceChild(video, placeholder);
    } else {
      this.videoWrapper.insertBefore(video, this.videoWrapper.firstChild);
    }

    // Remove mini player
    this.miniPlayer.removeEventListener("click", this.handleMiniClick);
    removeElement(this.miniPlayer);
    this.miniPlayer = null;

    this.bus.emit("analytics:event", "pip_exit");
  }

  private handleMiniClick = (): void => {
    this.container.scrollIntoView({ behavior: "smooth", block: "center" });
    // exitPiP will be triggered by IntersectionObserver when container comes into view
  };

  private flashMiniPlayer(): void {
    if (!this.miniPlayer) return;
    this.miniPlayer.style.transform = "scale(1.05)";
    this.miniPlayer.style.boxShadow = "0 8px 32px rgba(99,102,241,0.6)";
    setTimeout(() => {
      if (this.miniPlayer) {
        this.miniPlayer.style.transform = "scale(1)";
        this.miniPlayer.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
      }
    }, 600);
  }

  private getPositionStyles(): Partial<CSSStyleDeclaration> {
    const x = `${this.config.offsetX}px`;
    const y = `${this.config.offsetY}px`;
    switch (this.config.position) {
      case "bottom-left": return { bottom: y, left: x };
      case "top-right": return { top: y, right: x };
      case "top-left": return { top: y, left: x };
      case "bottom-right":
      default: return { bottom: y, right: x };
    }
  }

  destroy(): void {
    if (this.isInPiP) this.exitPiP();
    this.observer?.disconnect();
  }
}
