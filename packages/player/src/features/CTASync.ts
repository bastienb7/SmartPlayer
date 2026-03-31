import type { CTAConfig, CTATrigger } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

interface ActiveCTA {
  trigger: CTATrigger;
  element: HTMLElement;
  timeout: ReturnType<typeof setTimeout>;
}

export class CTASync {
  private activeCTAs = new Map<string, ActiveCTA>();
  private firedIds = new Set<string>();
  private container: HTMLElement;

  constructor(
    private bus: EventBus,
    private config: CTAConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.triggers.length === 0) return;

    this.bus.on("video:timeupdate", (currentTime: number) => {
      for (const trigger of this.config.triggers) {
        if (
          !this.firedIds.has(trigger.id) &&
          currentTime >= trigger.timestamp &&
          currentTime < trigger.timestamp + 1
        ) {
          this.showCTA(trigger);
          this.firedIds.add(trigger.id);
        }
      }
    });

    // Reset on seek backward
    this.bus.on("video:seeked", () => {
      this.firedIds.clear();
    });
  }

  private showCTA(trigger: CTATrigger): void {
    this.bus.emit("analytics:event", "cta_show", { ctaId: trigger.id });

    const el = createElement("div", {}, {
      position: "absolute",
      bottom: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "30",
      animation: "sp-cta-in 0.4s ease-out",
    });

    const btn = createElement("a", {
      href: trigger.url,
      ...(trigger.openInNewTab ? { target: "_blank", rel: "noopener" } : {}),
    }, {
      display: "inline-block",
      padding: "14px 32px",
      backgroundColor: trigger.buttonColor || "var(--sp-primary, #6366f1)",
      color: trigger.buttonTextColor || "#ffffff",
      fontSize: "16px",
      fontWeight: "700",
      fontFamily: "var(--sp-font)",
      borderRadius: "8px",
      textDecoration: "none",
      cursor: "pointer",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      whiteSpace: "nowrap",
    });
    btn.textContent = trigger.text;

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.05)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
    });
    btn.addEventListener("click", (e) => {
      this.bus.emit("analytics:event", "cta_click", {
        ctaId: trigger.id,
        url: trigger.url,
      });
      if (!trigger.openInNewTab) {
        e.preventDefault();
        window.location.href = trigger.url;
      }
    });

    el.appendChild(btn);
    this.container.appendChild(el);

    const timeout = setTimeout(() => {
      this.dismissCTA(trigger.id);
    }, trigger.duration * 1000);

    this.activeCTAs.set(trigger.id, { trigger, element: el, timeout });
  }

  private dismissCTA(id: string): void {
    const active = this.activeCTAs.get(id);
    if (!active) return;

    active.element.style.opacity = "0";
    active.element.style.transition = "opacity 0.3s ease";
    setTimeout(() => removeElement(active.element), 300);
    clearTimeout(active.timeout);
    this.activeCTAs.delete(id);
  }

  destroy(): void {
    for (const [id] of this.activeCTAs) {
      this.dismissCTA(id);
    }
  }
}
