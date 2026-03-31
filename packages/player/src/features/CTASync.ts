import type { CTAConfig, CTATrigger } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

interface ActiveCTA {
  trigger: CTATrigger;
  element: HTMLElement;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * CTA Sync™ — Synchronized call-to-action buttons.
 *
 * Features:
 * - Time-locked appearance (works with pause, resume, speed changes)
 * - 3 placement types: inside (overlay), below (under video), custom (CSS selector)
 * - Scroll to Action: auto-scrolls the page to center the CTA
 * - Custom styling per CTA (color, radius, font size, full-width)
 * - Show/click analytics events
 *
 * Unique advantages:
 * - Full-width button option
 * - Per-CTA border radius and font size
 * - Custom CSS selector placement (inject into any page element)
 */
export class CTASync {
  private activeCTAs = new Map<string, ActiveCTA>();
  private firedIds = new Set<string>();
  private container: HTMLElement;
  private belowContainer: HTMLElement | null = null;
  /** Current playback rate for time sync */
  private playbackRate = 1;

  constructor(
    private bus: EventBus,
    private config: CTAConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.triggers.length === 0) return;

    // Track playback rate for Turbo sync
    this.bus.on("video:ratechange", (rate: number) => {
      this.playbackRate = rate;
    });

    this.bus.on("video:timeupdate", (currentTime: number) => {
      for (const trigger of this.config.triggers) {
        if (
          !this.firedIds.has(trigger.id) &&
          currentTime >= trigger.timestamp &&
          currentTime < trigger.timestamp + 1.5
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
    this.bus.emit("analytics:event", "cta_show", { ctaId: trigger.id, placement: trigger.placement });

    const btn = this.buildButton(trigger);
    const wrapper = createElement("div", { "data-cta-id": trigger.id }, {
      animation: "sp-cta-in 0.4s ease-out",
    });
    wrapper.appendChild(btn);

    // Place based on type
    switch (trigger.placement) {
      case "below":
        this.placeBelow(wrapper);
        break;
      case "custom":
        this.placeCustom(wrapper, trigger.customSelector);
        break;
      case "inside":
      default:
        this.placeInside(wrapper);
        break;
    }

    // Scroll to Action
    if (
      this.config.scrollToAction &&
      (!this.config.scrollToCTAId || this.config.scrollToCTAId === trigger.id)
    ) {
      this.scrollToElement(wrapper);
    }

    // Auto-remove after duration (0 = infinite)
    const timeout = trigger.duration > 0
      ? setTimeout(() => this.dismissCTA(trigger.id), trigger.duration * 1000)
      : setTimeout(() => {}, 0); // no-op for infinite

    this.activeCTAs.set(trigger.id, { trigger, element: wrapper, timeout });
  }

  private buildButton(trigger: CTATrigger): HTMLElement {
    const btn = createElement("a", {
      href: trigger.url,
      ...(trigger.openInNewTab ? { target: "_blank", rel: "noopener" } : {}),
    }, {
      display: trigger.fullWidth ? "block" : "inline-block",
      width: trigger.fullWidth ? "100%" : "auto",
      padding: trigger.padding || "14px 32px",
      backgroundColor: trigger.buttonColor || "var(--sp-primary, #6366f1)",
      color: trigger.buttonTextColor || "#ffffff",
      fontSize: trigger.fontSize || "16px",
      fontWeight: "700",
      fontFamily: "var(--sp-font)",
      borderRadius: `${trigger.borderRadius ?? 8}px`,
      textDecoration: "none",
      textAlign: "center",
      cursor: "pointer",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      whiteSpace: "nowrap",
    });
    btn.textContent = trigger.text;

    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });
    btn.addEventListener("click", (e) => {
      this.bus.emit("analytics:event", "cta_click", {
        ctaId: trigger.id, url: trigger.url, placement: trigger.placement,
      });
      if (!trigger.openInNewTab) {
        e.preventDefault();
        window.location.href = trigger.url;
      }
    });

    return btn;
  }

  private placeInside(wrapper: HTMLElement): void {
    Object.assign(wrapper.style, {
      position: "absolute",
      bottom: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "30",
    });
    this.container.appendChild(wrapper);
  }

  private placeBelow(wrapper: HTMLElement): void {
    if (!this.belowContainer) {
      this.belowContainer = createElement("div", { class: "sp-cta-below" }, {
        padding: "16px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      });
      // Insert after the video wrapper's parent
      const playerContainer = this.container.closest('[id^="smartplayer-"]');
      if (playerContainer) {
        const videoWrapper = playerContainer.querySelector(".sp-video-wrapper");
        if (videoWrapper?.nextSibling) {
          playerContainer.insertBefore(this.belowContainer, videoWrapper.nextSibling);
        } else {
          playerContainer.appendChild(this.belowContainer);
        }
      }
    }
    this.belowContainer.appendChild(wrapper);
  }

  private placeCustom(wrapper: HTMLElement, selector?: string): void {
    if (!selector) {
      this.placeInside(wrapper);
      return;
    }
    const target = document.querySelector(selector);
    if (target) {
      target.appendChild(wrapper);
    } else {
      this.placeInside(wrapper);
    }
  }

  /** Scroll to Action: smooth scroll the page to center the CTA */
  private scrollToElement(el: HTMLElement): void {
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: this.config.scrollBehavior || "smooth",
          block: "center",
        });
      }, 100);
    });
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
    if (this.belowContainer) {
      removeElement(this.belowContainer);
    }
  }
}
