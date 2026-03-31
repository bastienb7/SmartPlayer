import type { RecoveryThumbnailConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

export class RecoveryThumbnail {
  private overlay: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private container: HTMLElement;

  constructor(
    private bus: EventBus,
    private config: RecoveryThumbnailConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || !this.config.imageUrl) return;

    this.bus.on("video:pause", () => {
      this.clearTimer();
      this.timer = setTimeout(() => this.show(), this.config.delayMs);
    });

    this.bus.on("video:play", () => {
      this.clearTimer();
      this.dismiss();
    });
  }

  private show(): void {
    if (this.overlay) return;
    this.bus.emit("analytics:event", "recovery_show");

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
      backgroundColor: "rgba(0,0,0,0.8)",
      cursor: "pointer",
      zIndex: "25",
      animation: "sp-fade-in 0.3s ease",
    });

    const img = createElement("img", {
      src: this.config.imageUrl,
      alt: "Continue watching",
    }, {
      maxWidth: "80%",
      maxHeight: "60%",
      borderRadius: "8px",
      objectFit: "contain",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    });

    this.overlay.appendChild(img);

    if (this.config.message) {
      const msg = createElement("div", {}, {
        color: "white",
        fontSize: "16px",
        fontWeight: "600",
        marginTop: "16px",
        textAlign: "center",
        fontFamily: "var(--sp-font)",
      });
      msg.textContent = this.config.message;
      this.overlay.appendChild(msg);
    }

    this.overlay.addEventListener("click", this.handleClick);
    this.container.appendChild(this.overlay);
  }

  private handleClick = (): void => {
    this.bus.emit("analytics:event", "recovery_click");
    this.dismiss();
    this.bus.emit("request:play");
  };

  private dismiss(): void {
    if (this.overlay) {
      this.overlay.removeEventListener("click", this.handleClick);
      removeElement(this.overlay);
      this.overlay = null;
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.clearTimer();
    this.dismiss();
  }
}
