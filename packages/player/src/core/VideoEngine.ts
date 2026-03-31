import Hls from "hls.js";
import { EventBus } from "./EventBus";
import { isSafari, supportsHLS } from "../utils/device";

export class VideoEngine {
  readonly video: HTMLVideoElement;
  private hls: Hls | null = null;
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("preload", "metadata");
    this.video.style.width = "100%";
    this.video.style.height = "100%";
    this.video.style.objectFit = "contain";
    this.video.style.display = "block";
    this.video.style.backgroundColor = "#000";
    this.bindEvents();
  }

  load(hlsUrl: string, posterUrl?: string): void {
    if (posterUrl) {
      this.video.poster = posterUrl;
    }

    // Safari supports HLS natively
    if (supportsHLS() || isSafari()) {
      this.video.src = hlsUrl;
      this.video.addEventListener("loadedmetadata", () => {
        this.bus.emit("engine:ready");
      }, { once: true });
      return;
    }

    // Use hls.js for other browsers
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.bus.emit("engine:ready");
        this.bus.emit("engine:qualities", this.getQualities());
      });

      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          this.bus.emit("engine:error", data.type);
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            this.hls?.recoverMediaError();
          }
        }
      });
      return;
    }

    // Fallback: try direct source
    this.video.src = hlsUrl;
    this.bus.emit("engine:ready");
  }

  private bindEvents(): void {
    const v = this.video;

    v.addEventListener("play", () => this.bus.emit("video:play"));
    v.addEventListener("pause", () => this.bus.emit("video:pause"));
    v.addEventListener("ended", () => this.bus.emit("video:ended"));
    v.addEventListener("seeking", () => this.bus.emit("video:seeking"));
    v.addEventListener("seeked", () => this.bus.emit("video:seeked"));
    v.addEventListener("waiting", () => this.bus.emit("video:waiting"));
    v.addEventListener("canplay", () => this.bus.emit("video:canplay"));
    v.addEventListener("volumechange", () =>
      this.bus.emit("video:volumechange", v.volume, v.muted)
    );
    v.addEventListener("ratechange", () =>
      this.bus.emit("video:ratechange", v.playbackRate)
    );

    v.addEventListener("timeupdate", () => {
      this.bus.emit("video:timeupdate", v.currentTime, v.duration);
    });

    v.addEventListener("progress", () => {
      if (v.buffered.length > 0) {
        const buffered = v.buffered.end(v.buffered.length - 1) / (v.duration || 1);
        this.bus.emit("video:buffered", buffered);
      }
    });

    v.addEventListener("loadedmetadata", () => {
      this.bus.emit("video:metadata", {
        duration: v.duration,
        width: v.videoWidth,
        height: v.videoHeight,
      });
    });

    v.addEventListener("error", () => {
      const error = v.error;
      this.bus.emit("engine:error", error?.message ?? "Unknown error");
    });
  }

  play(): Promise<void> {
    return this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  seek(time: number): void {
    this.video.currentTime = time;
  }

  setVolume(vol: number): void {
    this.video.volume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted;
  }

  setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  setQuality(levelIndex: number): void {
    if (this.hls) {
      this.hls.currentLevel = levelIndex;
    }
  }

  getQualities(): Array<{ index: number; height: number; bitrate: number }> {
    if (!this.hls) return [];
    return this.hls.levels.map((level, index) => ({
      index,
      height: level.height,
      bitrate: level.bitrate,
    }));
  }

  get currentTime(): number {
    return this.video.currentTime;
  }

  get duration(): number {
    return this.video.duration || 0;
  }

  get paused(): boolean {
    return this.video.paused;
  }

  destroy(): void {
    this.hls?.destroy();
    this.hls = null;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
  }
}
