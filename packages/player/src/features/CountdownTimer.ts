import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

export interface CountdownConfig {
  enabled: boolean;
  /** When to show the countdown (video seconds) */
  showAtTimestamp: number;
  /** Timer mode */
  mode: "realtime" | "session" | "evergreen";
  /** For realtime: ISO date string deadline */
  deadline?: string;
  /** For session/evergreen: seconds to count down from */
  durationSeconds?: number;
  /** Message template. Use {timer} as placeholder */
  message: string;
  /** Styling */
  backgroundColor?: string;
  textColor?: string;
  timerColor?: string;
  position: "top" | "bottom" | "overlay-bottom";
}

/**
 * Countdown Timer Overlay™
 *
 * Shows a countdown timer on the video to create urgency.
 * Modes: realtime (deadline), session (per viewer), evergreen (resets per viewer).
 */
export class CountdownTimer {
  private element: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private shown = false;
  private container: HTMLElement;
  private endTime: number = 0;

  constructor(
    private bus: EventBus,
    private config: CountdownConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled) return;

    // Calculate end time
    switch (this.config.mode) {
      case "realtime":
        this.endTime = this.config.deadline
          ? new Date(this.config.deadline).getTime()
          : Date.now() + 3600_000;
        break;
      case "session": {
        const stored = sessionStorage.getItem("sp_countdown_end");
        if (stored) {
          this.endTime = parseInt(stored);
        } else {
          this.endTime = Date.now() + (this.config.durationSeconds || 900) * 1000;
          sessionStorage.setItem("sp_countdown_end", this.endTime.toString());
        }
        break;
      }
      case "evergreen":
        this.endTime = Date.now() + (this.config.durationSeconds || 900) * 1000;
        break;
    }

    this.bus.on("video:timeupdate", (currentTime: number) => {
      if (!this.shown && currentTime >= this.config.showAtTimestamp) {
        this.show();
        this.shown = true;
      }
    });
  }

  private show(): void {
    this.element = createElement("div", { class: "sp-countdown" }, {
      position: this.config.position === "overlay-bottom" ? "absolute" : "relative",
      bottom: this.config.position === "overlay-bottom" ? "50px" : "auto",
      left: "0", right: "0",
      backgroundColor: this.config.backgroundColor || "rgba(0,0,0,0.9)",
      color: this.config.textColor || "#ffffff",
      padding: "10px 20px",
      textAlign: "center",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "var(--sp-font)",
      zIndex: "25",
      animation: "sp-fade-in 0.3s ease",
    });

    this.timerEl = createElement("span", {}, {
      color: this.config.timerColor || "#ef4444",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "800",
      fontSize: "16px",
    });

    this.updateTimer();
    this.element.textContent = "";
    const parts = this.config.message.split("{timer}");
    if (parts.length > 1) {
      this.element.appendChild(document.createTextNode(parts[0]));
      this.element.appendChild(this.timerEl);
      this.element.appendChild(document.createTextNode(parts[1]));
    } else {
      this.element.appendChild(document.createTextNode(this.config.message + " "));
      this.element.appendChild(this.timerEl);
    }

    const wrapper = this.container.querySelector(".sp-video-wrapper");
    if (this.config.position === "overlay-bottom" && wrapper) {
      (wrapper as HTMLElement).appendChild(this.element);
    } else {
      this.container.appendChild(this.element);
    }

    this.interval = setInterval(() => this.updateTimer(), 1000);

    this.bus.emit("analytics:event", "countdown_show");
  }

  private updateTimer(): void {
    if (!this.timerEl) return;
    const remaining = Math.max(0, this.endTime - Date.now());
    const h = Math.floor(remaining / 3600_000);
    const m = Math.floor((remaining % 3600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    this.timerEl.textContent = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

    if (remaining <= 0 && this.interval) {
      clearInterval(this.interval);
      this.timerEl.textContent = "00:00";
      this.bus.emit("analytics:event", "countdown_expired");
    }
  }

  destroy(): void {
    if (this.interval) clearInterval(this.interval);
    if (this.element) removeElement(this.element);
  }
}
