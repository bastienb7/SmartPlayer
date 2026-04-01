import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

export interface Chapter {
  id: string;
  title: string;
  timestamp: number;
  /** Hidden chapters show "???" to create mystery */
  hidden: boolean;
}

export interface SmartChaptersConfig {
  enabled: boolean;
  chapters: Chapter[];
  /** Allow clicking chapters to seek (disable for VSL) */
  allowSeek: boolean;
  /** Show chapter name tooltip on progress bar hover */
  showTooltip: boolean;
  /** Marker color */
  markerColor?: string;
}

/**
 * Smart Chapters™ — Timeline markers on the progress bar.
 *
 * Shows chapter markers as dots on the progress bar.
 * Hidden chapters display "???" to create curiosity.
 * Optional seek-by-click (can be disabled for VSL).
 */
export class SmartChapters {
  private markers: HTMLElement[] = [];
  private tooltip: HTMLElement | null = null;
  private container: HTMLElement;
  private currentChapter: Chapter | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: SmartChaptersConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.chapters.length === 0) return;

    // Wait for duration to be known
    this.bus.on("video:metadata", (meta: { duration: number }) => {
      this.renderMarkers(meta.duration);
    });

    // Track current chapter
    this.bus.on("video:timeupdate", (currentTime: number) => {
      this.updateCurrentChapter(currentTime);
    });
  }

  private renderMarkers(duration: number): void {
    if (duration <= 0) return;

    const progressContainer = this.container.querySelector(".sp-progress-container");
    if (!progressContainer) return;

    // Create tooltip
    this.tooltip = createElement("div", { class: "sp-chapter-tooltip" }, {
      position: "absolute",
      bottom: "20px",
      left: "0",
      backgroundColor: "rgba(0,0,0,0.9)",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "var(--sp-font)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.15s ease",
      zIndex: "5",
    });
    progressContainer.appendChild(this.tooltip);

    // Render chapter markers
    for (const chapter of this.config.chapters) {
      const position = (chapter.timestamp / duration) * 100;

      const marker = createElement("div", {
        "data-chapter-id": chapter.id,
      }, {
        position: "absolute",
        left: `${position}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: this.config.markerColor || "var(--sp-primary, #6366f1)",
        border: "2px solid rgba(255,255,255,0.8)",
        zIndex: "3",
        cursor: this.config.allowSeek ? "pointer" : "default",
        transition: "transform 0.15s ease",
      });

      // Hover: show tooltip
      marker.addEventListener("mouseenter", () => {
        if (this.tooltip) {
          this.tooltip.textContent = chapter.hidden ? "???" : chapter.title;
          this.tooltip.style.left = `${position}%`;
          this.tooltip.style.transform = "translateX(-50%)";
          this.tooltip.style.opacity = "1";
        }
        marker.style.transform = "translate(-50%, -50%) scale(1.5)";
      });

      marker.addEventListener("mouseleave", () => {
        if (this.tooltip) this.tooltip.style.opacity = "0";
        marker.style.transform = "translate(-50%, -50%)";
      });

      // Click to seek
      if (this.config.allowSeek) {
        marker.addEventListener("click", (e) => {
          e.stopPropagation();
          this.engine.seek(chapter.timestamp);
          this.bus.emit("analytics:event", "chapter_seek", {
            chapterId: chapter.id,
            title: chapter.hidden ? "???" : chapter.title,
          });
        });
      }

      (progressContainer as HTMLElement).appendChild(marker);
      this.markers.push(marker);
    }
  }

  private updateCurrentChapter(currentTime: number): void {
    // Find the current chapter (last chapter whose timestamp <= currentTime)
    let current: Chapter | null = null;
    for (const ch of this.config.chapters) {
      if (ch.timestamp <= currentTime) {
        current = ch;
      } else {
        break;
      }
    }

    if (current && current !== this.currentChapter) {
      this.currentChapter = current;
      this.bus.emit("analytics:event", "chapter_enter", {
        chapterId: current.id,
        title: current.hidden ? "???" : current.title,
      });
    }
  }

  getCurrentChapter(): Chapter | null {
    return this.currentChapter;
  }

  destroy(): void {
    this.markers.forEach((m) => removeElement(m));
    if (this.tooltip) removeElement(this.tooltip);
  }
}
