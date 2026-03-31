import type { HeadlineConfig, HeadlineVariant } from "../config/types";
import type { EventBus } from "../core/EventBus";
import { createElement, removeElement } from "../utils/dom";

/**
 * Headlines™ — A/B testable headlines above/below/over the player.
 *
 * Supports:
 * - Text, image, or GIF variants
 * - Desktop vs mobile-specific images
 * - Placement: above, below, overlay-top, overlay-bottom
 * - Animations: fade, slide-down, slide-up
 * - "No headline" control variant (for testing if any headline helps)
 * - Click-through URL
 * - Full analytics tracking (impressions, clicks per variant)
 *
 * Unique advantages:
 * - Overlay positions (on top of video, not just outside)
 * - Animation options
 * - Click-through tracking
 * - Rich text styling per variant
 */
export class Headlines {
  private element: HTMLElement | null = null;
  private container: HTMLElement;
  private assignedVariant: HeadlineVariant | null = null;
  private isNoHeadline = false;

  constructor(
    private bus: EventBus,
    private config: HeadlineConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.variants.length === 0) return;

    // Determine which variant to show
    this.assignedVariant = this.resolveVariant();

    // "No headline" control
    if (this.isNoHeadline) {
      this.bus.emit("analytics:event", "headline_impression", {
        variantId: "__none__",
        abTestId: this.config.abTestId,
      });
      return;
    }

    if (!this.assignedVariant) return;

    // Build and render the headline
    this.render(this.assignedVariant);

    // Track impression
    this.bus.emit("analytics:event", "headline_impression", {
      variantId: this.assignedVariant.id,
      type: this.assignedVariant.type,
      abTestId: this.config.abTestId,
    });
  }

  private resolveVariant(): HeadlineVariant | null {
    // If server assigned a specific variant
    if (this.config.assignedVariantId) {
      if (this.config.assignedVariantId === "__none__") {
        this.isNoHeadline = true;
        return null;
      }
      const found = this.config.variants.find(
        (v) => v.id === this.config.assignedVariantId
      );
      if (found) return found;
    }

    // Client-side fallback: weighted random selection
    if (this.config.abTestEnabled && this.config.includeNoHeadlineVariant) {
      // Add "no headline" as a virtual variant
      const totalVariants = this.config.variants.length + 1;
      const roll = Math.random() * totalVariants;
      if (roll < 1) {
        this.isNoHeadline = true;
        return null;
      }
    }

    if (this.config.variants.length === 1) {
      return this.config.variants[0];
    }

    // Weighted random
    const totalWeight = this.config.variants.reduce(
      (sum, v) => sum + (v.weight ?? 1),
      0
    );
    let roll = Math.random() * totalWeight;
    for (const variant of this.config.variants) {
      roll -= variant.weight ?? 1;
      if (roll <= 0) return variant;
    }
    return this.config.variants[0];
  }

  private render(variant: HeadlineVariant): void {
    const isMobile = window.innerWidth <= this.config.mobileBreakpoint;

    // Create wrapper
    this.element = createElement("div", {
      class: "sp-headline",
      "data-variant": variant.id,
    }, {
      width: "100%",
      opacity: "0",
      transition: this.getTransition(),
    });

    // Content based on type
    switch (variant.type) {
      case "text":
        this.renderText(variant);
        break;
      case "image":
      case "gif":
        this.renderImage(variant, isMobile);
        break;
    }

    // Click handler
    if (this.config.clickUrl) {
      this.element.style.cursor = "pointer";
      this.element.addEventListener("click", this.handleClick);
    }

    // Place in DOM
    this.placeElement();

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.element) {
          this.element.style.opacity = "1";
          this.element.style.transform = "translateY(0)";
        }
      });
    });

    // Listen for resize to swap desktop/mobile images
    if (variant.type !== "text" && variant.mobileImageUrl) {
      this.bindResponsive(variant);
    }
  }

  private renderText(variant: HeadlineVariant): void {
    if (!this.element || !variant.text) return;

    const textEl = createElement("div", {}, {
      fontSize: variant.style?.fontSize || "24px",
      fontWeight: variant.style?.fontWeight || "700",
      color: variant.style?.color || "#ffffff",
      backgroundColor: variant.style?.backgroundColor || "transparent",
      textAlign: (variant.style?.textAlign as any) || "center",
      padding: variant.style?.padding || "16px 24px",
      maxWidth: variant.style?.maxWidth || "100%",
      margin: "0 auto",
      fontFamily: "var(--sp-font)",
      lineHeight: "1.3",
      wordWrap: "break-word",
    });
    textEl.textContent = variant.text;
    this.element.appendChild(textEl);
  }

  private renderImage(variant: HeadlineVariant, isMobile: boolean): void {
    if (!this.element) return;

    const src =
      isMobile && variant.mobileImageUrl
        ? variant.mobileImageUrl
        : variant.imageUrl;

    if (!src) return;

    const img = createElement("img", {
      src,
      alt: variant.altText || "",
      loading: "eager",
    }, {
      width: "100%",
      height: "auto",
      display: "block",
      borderRadius: "var(--sp-radius, 8px)",
      objectFit: "contain",
    });

    // Error fallback: if image fails to load, try text or hide
    img.addEventListener("error", () => {
      if (variant.text) {
        removeElement(img);
        this.renderText(variant);
      } else {
        this.dismiss();
      }
    });

    this.element.appendChild(img);
  }

  private placeElement(): void {
    if (!this.element) return;

    const wrapper = this.container.querySelector(".sp-video-wrapper");

    switch (this.config.position) {
      case "above":
        // Insert before the video wrapper
        if (wrapper) {
          this.container.insertBefore(this.element, wrapper);
        } else {
          this.container.prepend(this.element);
        }
        break;

      case "below":
        // Insert after the video wrapper
        if (wrapper?.nextSibling) {
          this.container.insertBefore(this.element, wrapper.nextSibling);
        } else {
          this.container.appendChild(this.element);
        }
        break;

      case "overlay-top":
        Object.assign(this.element.style, {
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          zIndex: "15",
          pointerEvents: this.config.clickUrl ? "auto" : "none",
        });
        if (wrapper) {
          (wrapper as HTMLElement).appendChild(this.element);
        }
        break;

      case "overlay-bottom":
        Object.assign(this.element.style, {
          position: "absolute",
          bottom: "50px", // Above controls
          left: "0",
          right: "0",
          zIndex: "15",
          pointerEvents: this.config.clickUrl ? "auto" : "none",
        });
        if (wrapper) {
          (wrapper as HTMLElement).appendChild(this.element);
        }
        break;
    }

    // If external target selector, place there instead
    if (this.config.targetSelector) {
      const target = document.querySelector(this.config.targetSelector);
      if (target) {
        target.innerHTML = "";
        target.appendChild(this.element);
      }
    }
  }

  private getTransition(): string {
    switch (this.config.animation) {
      case "fade":
        return "opacity 0.4s ease";
      case "slide-down":
        this.element!.style.transform = "translateY(-20px)";
        return "opacity 0.4s ease, transform 0.4s ease";
      case "slide-up":
        this.element!.style.transform = "translateY(20px)";
        return "opacity 0.4s ease, transform 0.4s ease";
      default:
        return "none";
    }
  }

  private bindResponsive(variant: HeadlineVariant): void {
    let lastIsMobile = window.innerWidth <= this.config.mobileBreakpoint;

    const onResize = () => {
      const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
      if (isMobile !== lastIsMobile) {
        lastIsMobile = isMobile;
        const img = this.element?.querySelector("img");
        if (img) {
          const newSrc =
            isMobile && variant.mobileImageUrl
              ? variant.mobileImageUrl
              : variant.imageUrl;
          if (newSrc) img.src = newSrc;
        }
      }
    };

    window.addEventListener("resize", onResize);
    // Store cleanup reference
    (this as any)._resizeHandler = onResize;
  }

  private handleClick = (): void => {
    if (!this.config.clickUrl) return;

    this.bus.emit("analytics:event", "headline_click", {
      variantId: this.assignedVariant?.id,
      url: this.config.clickUrl,
      abTestId: this.config.abTestId,
    });

    if (this.config.clickOpenNewTab) {
      window.open(this.config.clickUrl, "_blank", "noopener");
    } else {
      window.location.href = this.config.clickUrl;
    }
  };

  private dismiss(): void {
    if (this.element) {
      removeElement(this.element);
      this.element = null;
    }
  }

  /** Get the currently displayed variant ID (for analytics) */
  getActiveVariantId(): string | null {
    if (this.isNoHeadline) return "__none__";
    return this.assignedVariant?.id ?? null;
  }

  destroy(): void {
    if (this.element) {
      this.element.removeEventListener("click", this.handleClick);
      removeElement(this.element);
      this.element = null;
    }
    if ((this as any)._resizeHandler) {
      window.removeEventListener("resize", (this as any)._resizeHandler);
    }
  }
}
