import type { ResumePlayConfig } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { getItem, setItem, removeItem } from "../utils/storage";
import { createElement, removeElement, debounce } from "../utils/dom";

interface SavedProgress {
  time: number;
  savedAt: number;
}

export class ResumePlay {
  private container: HTMLElement;
  private prompt: HTMLElement | null = null;
  private storageKey: string;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: ResumePlayConfig,
    container: HTMLElement,
    videoId: string
  ) {
    this.container = container;
    this.storageKey = `resume_${videoId}`;
  }

  init(): void {
    if (!this.config.enabled) return;

    // Save progress periodically
    const save = debounce(() => {
      const time = this.engine.currentTime;
      if (time > 5) {
        setItem(this.storageKey, {
          time,
          savedAt: Date.now(),
        } satisfies SavedProgress);
      }
    }, 2000);

    this.bus.on("video:timeupdate", save);

    // Clear on complete
    this.bus.on("video:ended", () => {
      removeItem(this.storageKey);
    });

    // Check for saved progress
    this.checkSavedProgress();
  }

  private checkSavedProgress(): void {
    const saved = getItem<SavedProgress>(this.storageKey);
    if (!saved) return;

    const maxAge = this.config.maxAgeDays * 24 * 60 * 60 * 1000;
    if (Date.now() - saved.savedAt > maxAge) {
      removeItem(this.storageKey);
      return;
    }

    if (saved.time < 10) return;

    this.bus.emit("analytics:event", "resume_prompt");
    this.showPrompt(saved.time);
  }

  private showPrompt(savedTime: number): void {
    this.prompt = createElement("div", {}, {
      position: "absolute",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "30",
      backgroundColor: "rgba(0,0,0,0.9)",
      borderRadius: "12px",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      animation: "sp-slide-down 0.3s ease",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    });

    const text = createElement("span", {}, {
      color: "white",
      fontSize: "14px",
      fontFamily: "var(--sp-font)",
      whiteSpace: "nowrap",
    });
    text.textContent = this.config.promptMessage;

    const btnYes = this.createButton("Yes", () => {
      this.engine.seek(savedTime);
      this.engine.play();
      this.dismiss();
      this.bus.emit("analytics:event", "resume_accept");
    });

    const btnNo = this.createButton("No", () => {
      removeItem(this.storageKey);
      this.dismiss();
      this.bus.emit("analytics:event", "resume_decline");
    });
    btnNo.style.backgroundColor = "transparent";
    btnNo.style.border = "1px solid rgba(255,255,255,0.3)";

    this.prompt.appendChild(text);
    this.prompt.appendChild(btnYes);
    this.prompt.appendChild(btnNo);
    this.container.appendChild(this.prompt);

    // Auto-dismiss after 10 seconds
    setTimeout(() => this.dismiss(), 10000);
  }

  private createButton(
    label: string,
    onClick: () => void
  ): HTMLElement {
    const btn = createElement("button", {}, {
      padding: "8px 16px",
      backgroundColor: "var(--sp-primary, #6366f1)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "var(--sp-font)",
      whiteSpace: "nowrap",
    });
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  private dismiss(): void {
    if (this.prompt) {
      removeElement(this.prompt);
      this.prompt = null;
    }
  }

  destroy(): void {
    this.dismiss();
  }
}
