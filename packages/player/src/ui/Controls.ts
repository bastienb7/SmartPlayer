import type { EventBus } from "../core/EventBus";
import type { StateManager } from "../core/StateManager";
import type { VideoEngine } from "../core/VideoEngine";
import type { StyleConfig } from "../config/types";
import { createElement, formatTime, clamp } from "../utils/dom";
import type { FictitiousProgress } from "../features/FictitiousProgress";

const PLAY_SVG = `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
const VOLUME_SVG = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const MUTED_SVG = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/></svg>`;
const FULLSCREEN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

export class Controls {
  private el: HTMLElement;
  private progressBar: HTMLElement;
  private progressFill: HTMLElement;
  private bufferedFill: HTMLElement;
  private progressThumb: HTMLElement;
  private timeDisplay: HTMLElement;
  private playBtn: HTMLElement;
  private muteBtn: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private state: StateManager,
    private style: StyleConfig,
    private fictitiousProgress: FictitiousProgress | null,
    container: HTMLElement
  ) {
    // Build controls DOM
    this.el = createElement("div", { class: "sp-controls" });

    // Progress bar
    const progressContainer = createElement("div", { class: "sp-progress-container" });
    this.bufferedFill = createElement("div", { class: "sp-progress-buffered" });
    this.progressFill = createElement("div", { class: "sp-progress-bar" });
    this.progressThumb = createElement("div", { class: "sp-progress-thumb" });
    progressContainer.appendChild(this.bufferedFill);
    progressContainer.appendChild(this.progressFill);
    progressContainer.appendChild(this.progressThumb);
    this.progressBar = progressContainer;

    // Controls row
    const row = createElement("div", { class: "sp-controls-row" });
    this.playBtn = createElement("button", { class: "sp-btn", "aria-label": "Play" });
    this.playBtn.innerHTML = PLAY_SVG;

    this.muteBtn = createElement("button", { class: "sp-btn", "aria-label": "Mute" });
    this.muteBtn.innerHTML = VOLUME_SVG;

    this.timeDisplay = createElement("span", { class: "sp-time" });
    this.timeDisplay.textContent = "0:00 / 0:00";

    const spacer = createElement("div", { class: "sp-spacer" });

    const fullscreenBtn = createElement("button", { class: "sp-btn", "aria-label": "Fullscreen" });
    fullscreenBtn.innerHTML = FULLSCREEN_SVG;

    row.appendChild(this.playBtn);
    row.appendChild(this.muteBtn);
    row.appendChild(this.timeDisplay);
    row.appendChild(spacer);
    row.appendChild(fullscreenBtn);

    this.el.appendChild(progressContainer);
    this.el.appendChild(row);
    container.querySelector(".sp-video-wrapper")!.appendChild(this.el);

    // Bind events
    this.playBtn.addEventListener("click", () => {
      if (this.engine.paused) {
        this.engine.play();
      } else {
        this.engine.pause();
      }
    });

    this.muteBtn.addEventListener("click", () => {
      this.engine.setMuted(!this.engine.video.muted);
    });

    fullscreenBtn.addEventListener("click", () => {
      const wrapper = container.querySelector(".sp-video-wrapper") as HTMLElement;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        wrapper?.requestFullscreen();
      }
    });

    // Progress bar click to seek
    progressContainer.addEventListener("click", (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const realRatio = this.fictitiousProgress
        ? this.fictitiousProgress.inverseMapProgress(ratio)
        : ratio;
      this.engine.seek(realRatio * this.engine.duration);
    });

    this.bindStateUpdates();
    this.setupAutoHide(container);
  }

  private bindStateUpdates(): void {
    this.bus.on("video:play", () => {
      this.playBtn.innerHTML = PAUSE_SVG;
      this.playBtn.setAttribute("aria-label", "Pause");
    });

    this.bus.on("video:pause", () => {
      this.playBtn.innerHTML = PLAY_SVG;
      this.playBtn.setAttribute("aria-label", "Play");
    });

    this.bus.on("video:ended", () => {
      this.playBtn.innerHTML = PLAY_SVG;
    });

    this.bus.on("video:volumechange", (_vol: number, muted: boolean) => {
      this.muteBtn.innerHTML = muted ? MUTED_SVG : VOLUME_SVG;
    });

    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (duration <= 0) return;

      const displayProgress = this.fictitiousProgress
        ? this.state.get().displayProgress
        : currentTime / duration;

      const pct = (displayProgress * 100).toFixed(2) + "%";
      this.progressFill.style.width = pct;
      this.progressThumb.style.left = pct;
      this.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    });

    this.bus.on("video:buffered", (buffered: number) => {
      this.bufferedFill.style.width = (buffered * 100).toFixed(2) + "%";
    });
  }

  private setupAutoHide(container: HTMLElement): void {
    if (!this.style.controlsAutoHide) return;

    const wrapper = container.querySelector(".sp-video-wrapper") as HTMLElement;
    if (!wrapper) return;

    const show = () => {
      this.el.classList.remove("sp-hidden");
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        if (!this.engine.paused) {
          this.el.classList.add("sp-hidden");
        }
      }, this.style.controlsAutoHideMs);
    };

    wrapper.addEventListener("mousemove", show);
    wrapper.addEventListener("touchstart", show);
    wrapper.addEventListener("mouseleave", () => {
      if (!this.engine.paused) {
        this.el.classList.add("sp-hidden");
      }
    });

    // Click on video to play/pause
    this.engine.video.addEventListener("click", () => {
      if (this.engine.paused) {
        this.engine.play();
      } else {
        this.engine.pause();
      }
    });
  }

  destroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.el.remove();
  }
}
