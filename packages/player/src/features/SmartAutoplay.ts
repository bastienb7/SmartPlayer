import type { AutoplayConfig, AutoplayVariant } from "../config/types";
import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

const MUTED_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const PLAY_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

/**
 * Smart Autoplay™ — Videos start muted with a persuasive overlay.
 *
 * Supports:
 * - Default overlay (icon + text messages)
 * - Custom image/GIF overlay with flexible positioning
 * - Minimal pill overlay (less intrusive)
 * - Muted segment selection (choose which part plays while muted)
 * - Multiple triggers: click, any page click, scroll, tap
 * - A/B testing between overlay variants
 * - Configurable restart-on-unmute behavior
 * - Overlay animations: fade, pulse, bounce
 * - Play button fallback when autoplay is blocked
 * - Gradient backgrounds
 *
 * Unique advantages:
 * - Minimal pill mode (less intrusive)
 * - Scroll trigger (unmute when user scrolls)
 * - Overlay animations (pulse, bounce)
 * - Configurable play button (color, size)
 * - Gradient overlay backgrounds
 */
export class SmartAutoplay {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement;
  private cfg: AutoplayConfig;
  private scrollHandler: (() => void) | null = null;
  private anyClickHandler: (() => void) | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: AutoplayConfig,
    container: HTMLElement
  ) {
    this.container = container;
    this.cfg = this.resolveVariant();
  }

  async init(): Promise<void> {
    if (!this.cfg.enabled) return;

    // Seek to muted segment start if configured
    if (this.cfg.mutedSegmentStart > 0) {
      this.engine.seek(this.cfg.mutedSegmentStart);
    }

    // Attempt muted autoplay
    this.engine.setMuted(true);
    try {
      await this.engine.play();

      // Loop within muted segment if end is set
      if (this.cfg.mutedSegmentEnd) {
        this.setupMutedLoop();
      }

      this.showOverlay();
      this.bus.emit("analytics:event", "autoplay_start", {
        overlayType: this.cfg.overlayType,
        variantId: this.cfg.assignedVariantId,
      });
    } catch {
      if (this.cfg.showPlayButtonOnBlock) {
        this.showPlayButton();
      }
    }
  }

  private resolveVariant(): AutoplayConfig {
    if (!this.config.abTestEnabled || !this.config.variants?.length) {
      return this.config;
    }

    // Server-assigned variant
    if (this.config.assignedVariantId) {
      const v = this.config.variants.find((v) => v.id === this.config.assignedVariantId);
      if (v) return this.mergeVariant(v);
    }

    // Client-side weighted random
    const total = this.config.variants.reduce((s, v) => s + (v.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const v of this.config.variants) {
      roll -= v.weight ?? 1;
      if (roll <= 0) return this.mergeVariant(v);
    }
    return this.config;
  }

  private mergeVariant(v: AutoplayVariant): AutoplayConfig {
    return {
      ...this.config,
      overlayType: v.overlayType ?? this.config.overlayType,
      mutedMessage: v.mutedMessage ?? this.config.mutedMessage,
      clickMessage: v.clickMessage ?? this.config.clickMessage,
      overlayImageUrl: v.overlayImageUrl ?? this.config.overlayImageUrl,
      overlayImagePosition: (v.overlayImagePosition as any) ?? this.config.overlayImagePosition,
      overlayOpacity: v.overlayOpacity ?? this.config.overlayOpacity,
      assignedVariantId: v.id,
    };
  }

  // ── Overlay builders ──────────────────────────────────────

  private showOverlay(): void {
    switch (this.cfg.overlayType) {
      case "image":
        this.buildImageOverlay();
        break;
      case "minimal":
        this.buildMinimalOverlay();
        break;
      default:
        this.buildDefaultOverlay();
        break;
    }

    if (!this.overlay) return;
    this.applyAnimation(this.overlay);
    this.bindTrigger();
    this.container.appendChild(this.overlay);
  }

  /** Default: muted icon + two text lines */
  private buildDefaultOverlay(): void {
    const c = this.cfg;
    const bg = c.overlayGradient
      ? `linear-gradient(180deg, transparent 0%, ${c.overlayColor}${alphaHex(c.overlayOpacity)} 50%)`
      : `${c.overlayColor}${alphaHex(c.overlayOpacity)}`;

    this.overlay = createElement("div", { class: "sp-autoplay-overlay" }, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, cursor: "pointer", zIndex: "20",
      transition: "opacity 0.3s ease",
    });

    const iconColor = c.messageColor || "white";
    const icon = createElement("div", {}, {
      width: "60px", height: "60px", borderRadius: "50%",
      border: `3px solid ${iconColor}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: "16px",
    });
    icon.innerHTML = MUTED_ICON.replace(/white/g, iconColor);

    const msg = createElement("div", {}, {
      color: iconColor, fontSize: c.messageSize || "18px",
      fontWeight: "600", textAlign: "center",
      marginBottom: "8px", fontFamily: "var(--sp-font)", maxWidth: "80%",
    });
    msg.textContent = c.mutedMessage;

    const sub = createElement("div", {}, {
      color: iconColor, opacity: "0.75",
      fontSize: "14px", textAlign: "center", fontFamily: "var(--sp-font)",
    });
    sub.textContent = c.clickMessage;

    this.overlay.append(icon, msg, sub);
  }

  /** Image/GIF overlay */
  private buildImageOverlay(): void {
    const c = this.cfg;

    this.overlay = createElement("div", { class: "sp-autoplay-overlay" }, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", zIndex: "20", transition: "opacity 0.3s ease",
    });

    // Semi-transparent background
    const bg = createElement("div", {}, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: `${c.overlayColor || "#000"}${alphaHex(c.overlayOpacity * 0.5)}`,
      zIndex: "0",
    });
    this.overlay.appendChild(bg);

    if (c.overlayImageUrl) {
      const img = createElement("img", {
        src: c.overlayImageUrl,
        alt: c.clickMessage || "Click to play",
      }, {
        maxWidth: c.overlayImageWidth || "80%",
        maxHeight: "80%",
        objectFit: "contain",
        borderRadius: "8px",
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
        zIndex: "1",
        ...this.getPositionStyles(c.overlayImagePosition, c.overlayOffsetX, c.overlayOffsetY),
      });

      img.addEventListener("error", () => {
        removeElement(img);
        this.overlay!.innerHTML = "";
        this.buildDefaultOverlayInto(this.overlay!);
      });

      this.overlay.appendChild(img);
    }
  }

  /** Minimal pill: small floating label at bottom */
  private buildMinimalOverlay(): void {
    const c = this.cfg;

    this.overlay = createElement("div", { class: "sp-autoplay-overlay" }, {
      position: "absolute", bottom: "60px", left: "50%",
      transform: "translateX(-50%)",
      cursor: "pointer", zIndex: "20",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    });

    const pill = createElement("div", {}, {
      display: "flex", alignItems: "center", gap: "8px",
      backgroundColor: "rgba(0,0,0,0.85)",
      color: c.messageColor || "white",
      padding: "10px 20px", borderRadius: "100px",
      fontSize: "14px", fontWeight: "600",
      fontFamily: "var(--sp-font)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    });

    const iconSmall = createElement("span", {});
    iconSmall.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c.messageColor || "white"}" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

    const text = createElement("span", {});
    text.textContent = c.clickMessage || "Click to listen";

    pill.append(iconSmall, text);
    this.overlay.appendChild(pill);
  }

  /** Helper to inject default content into an existing container (fallback) */
  private buildDefaultOverlayInto(container: HTMLElement): void {
    const c = this.cfg;
    const msg = createElement("div", {}, {
      color: "white", fontSize: "18px", fontWeight: "600",
      textAlign: "center", fontFamily: "var(--sp-font)",
    });
    msg.textContent = c.clickMessage || "Click to play";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.appendChild(msg);
  }

  private showPlayButton(): void {
    const c = this.cfg;
    const size = c.playButtonSize || 72;

    this.overlay = createElement("div", { class: "sp-autoplay-overlay" }, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
      cursor: "pointer", zIndex: "20",
    });

    const btn = createElement("div", {}, {
      width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      backgroundColor: c.playButtonColor || "var(--sp-primary, #6366f1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      transition: "transform 0.2s ease",
    });
    btn.innerHTML = PLAY_ICON;
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.1)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });

    this.overlay.appendChild(btn);
    this.bindTrigger();
    this.container.appendChild(this.overlay);
  }

  // ── Triggers ──────────────────────────────────────────────

  private bindTrigger(): void {
    switch (this.cfg.trigger) {
      case "any-click":
        this.anyClickHandler = () => this.handleUnmute();
        document.addEventListener("click", this.anyClickHandler, { once: true });
        this.overlay?.addEventListener("click", this.handleUnmute);
        break;

      case "scroll":
        this.scrollHandler = () => {
          const rect = this.container.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.5) {
            this.handleUnmute();
          }
        };
        window.addEventListener("scroll", this.scrollHandler, { passive: true });
        this.overlay?.addEventListener("click", this.handleUnmute);
        break;

      case "tap":
      case "click":
      default:
        this.overlay?.addEventListener("click", this.handleUnmute);
        break;
    }
  }

  private handleUnmute = (): void => {
    this.cleanupTriggers();
    this.dismiss();

    if (this.cfg.restartOnUnmute) {
      this.engine.seek(0);
    }
    this.engine.setMuted(false);
    this.engine.play();

    this.bus.emit("analytics:event", "autoplay_click", {
      overlayType: this.cfg.overlayType,
      variantId: this.cfg.assignedVariantId,
      trigger: this.cfg.trigger,
    });
  };

  // ── Helpers ───────────────────────────────────────────────

  private setupMutedLoop(): void {
    const end = this.cfg.mutedSegmentEnd!;
    const start = this.cfg.mutedSegmentStart;
    this.bus.on("video:timeupdate", () => {
      if (this.engine.video.muted && this.engine.currentTime >= end) {
        this.engine.seek(start);
      }
    });
  }

  private getPositionStyles(
    pos: string, offX?: string, offY?: string
  ): Partial<CSSStyleDeclaration> {
    const base: Partial<CSSStyleDeclaration> = { position: "absolute" };
    switch (pos) {
      case "top-left": return { ...base, top: offY || "16px", left: offX || "16px" };
      case "top-right": return { ...base, top: offY || "16px", right: offX || "16px" };
      case "bottom-left": return { ...base, bottom: offY || "60px", left: offX || "16px" };
      case "bottom-right": return { ...base, bottom: offY || "60px", right: offX || "16px" };
      case "custom": return { ...base, top: offY || "50%", left: offX || "50%", transform: "translate(-50%, -50%)" };
      default: return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  }

  private applyAnimation(el: HTMLElement): void {
    switch (this.cfg.overlayAnimation) {
      case "pulse":
        el.style.animation = "sp-pulse 2s ease-in-out infinite";
        break;
      case "bounce":
        el.style.animation = "sp-bounce 1s ease-in-out";
        break;
    }
  }

  private dismiss(): void {
    if (this.overlay) {
      const el = this.overlay;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      this.overlay = null;
      setTimeout(() => removeElement(el), 300);
    }
  }

  private cleanupTriggers(): void {
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.anyClickHandler) {
      document.removeEventListener("click", this.anyClickHandler);
      this.anyClickHandler = null;
    }
  }

  destroy(): void {
    this.cleanupTriggers();
    if (this.overlay) {
      this.overlay.removeEventListener("click", this.handleUnmute);
      removeElement(this.overlay);
      this.overlay = null;
    }
  }
}

function alphaHex(opacity: number): string {
  return Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
}
