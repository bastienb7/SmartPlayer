import type { MiniHookConfig, MiniHookItem } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

export class MiniHook {
  private container: HTMLElement;
  private activeElement: HTMLElement | null = null;
  private firedPercents = new Set<number>();

  constructor(
    private bus: EventBus,
    private config: MiniHookConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.hooks.length === 0) return;

    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const percent = (currentTime / duration) * 100;

      for (const hook of this.config.hooks) {
        if (
          !this.firedPercents.has(hook.triggerAtPercent) &&
          percent >= hook.triggerAtPercent
        ) {
          this.showHook(hook);
          this.firedPercents.add(hook.triggerAtPercent);
        }
      }
    });
  }

  private showHook(hook: MiniHookItem): void {
    this.dismiss();
    this.bus.emit("analytics:event", "hook_show", {
      type: hook.type,
      percent: hook.triggerAtPercent,
    });

    this.activeElement = createElement("div", {}, {
      position: "absolute",
      top: "16px",
      right: "16px",
      zIndex: "25",
      backgroundColor: "rgba(0,0,0,0.85)",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      fontFamily: "var(--sp-font)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      animation: "sp-slide-down 0.3s ease",
      maxWidth: "280px",
    });
    this.activeElement.textContent = hook.text;

    this.container.appendChild(this.activeElement);

    setTimeout(() => this.dismiss(), hook.durationMs);
  }

  private dismiss(): void {
    if (this.activeElement) {
      removeElement(this.activeElement);
      this.activeElement = null;
    }
  }

  destroy(): void {
    this.dismiss();
  }
}
