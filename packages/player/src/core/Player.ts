import type { PlayerConfig } from "../config/types";
import { EventBus } from "./EventBus";
import { StateManager } from "./StateManager";
import { VideoEngine } from "./VideoEngine";
import { SmartAutoplay } from "../features/SmartAutoplay";
import { Headlines } from "../features/Headlines";
import { FictitiousProgress } from "../features/FictitiousProgress";
import { CTASync } from "../features/CTASync";
import { RecoveryThumbnail } from "../features/RecoveryThumbnail";
import { ResumePlay } from "../features/ResumePlay";
import { MiniHook } from "../features/MiniHook";
import { TurboSpeed } from "../features/TurboSpeed";
import { PixelTracking } from "../features/PixelTracking";
import { PageSync } from "../features/PageSync";
import { VideoFunnel } from "../features/VideoFunnel";
import { PictureInPicture } from "../features/PictureInPicture";
import { ExitIntent } from "../features/ExitIntent";
import { CountdownTimer } from "../features/CountdownTimer";
import { SocialProof } from "../features/SocialProof";
import { SmartChapters } from "../features/SmartChapters";
import { InteractivePoll } from "../features/InteractivePoll";
import { Tracker } from "../analytics/Tracker";
import { Heartbeat } from "../analytics/Heartbeat";
import { Controls } from "../ui/Controls";
import { injectStyles } from "../ui/Styles";
import { createElement } from "../utils/dom";

export class Player {
  private bus: EventBus;
  private state: StateManager;
  private engine: VideoEngine;
  private features: Array<{ destroy(): void }> = [];
  private controls: Controls | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement, private config: PlayerConfig) {
    this.container = container;
    this.bus = new EventBus();
    this.state = new StateManager();
    this.engine = new VideoEngine(this.bus);

    this.setup();
  }

  private setup(): void {
    const containerId = this.container.id;
    injectStyles(containerId, this.config.style);

    // Build DOM structure
    const wrapper = createElement("div", { class: "sp-video-wrapper" });
    wrapper.appendChild(this.engine.video);
    this.container.appendChild(wrapper);

    // Headlines (text/image/GIF with A/B testing)
    const headlines = new Headlines(this.bus, this.config.headline, this.container);
    headlines.init();
    this.features.push(headlines);

    // Initialize features
    const fictitiousProgress = new FictitiousProgress(
      this.bus,
      this.state,
      this.config.progressBar
    );
    fictitiousProgress.init();
    this.features.push(fictitiousProgress);

    // Controls
    if (this.config.style.showControls) {
      this.controls = new Controls(
        this.engine,
        this.bus,
        this.state,
        this.config.style,
        this.config.progressBar.fictitious ? fictitiousProgress : null,
        this.container
      );
    }

    // CTA
    const cta = new CTASync(this.bus, this.config.cta, wrapper);
    cta.init();
    this.features.push(cta);

    // Recovery Thumbnail
    const recovery = new RecoveryThumbnail(
      this.bus,
      this.config.recoveryThumbnail,
      wrapper
    );
    recovery.init();
    this.features.push(recovery);

    // Resume Play
    const resume = new ResumePlay(
      this.engine,
      this.bus,
      this.config.resumePlay,
      wrapper,
      this.config.videoId
    );
    resume.init();
    this.features.push(resume);

    // Mini-Hook
    const miniHook = new MiniHook(this.bus, this.config.miniHook, wrapper);
    miniHook.init();
    this.features.push(miniHook);

    // Turbo Speed
    const turbo = new TurboSpeed(
      this.engine,
      this.bus,
      this.config.turboSpeed,
      this.config.assignedSpeedVariant
    );
    turbo.init();
    this.features.push(turbo);

    // Pixel Tracking
    const pixels = new PixelTracking(this.bus, this.config.pixels);
    pixels.init();
    this.features.push(pixels);

    // Page Sync / Delay Code
    if (this.config.pageSync) {
      const pageSync = new PageSync(this.engine, this.bus, this.config.pageSync);
      pageSync.init();
      this.features.push(pageSync);
    }

    // Picture-in-Picture
    if (this.config.pip) {
      const pip = new PictureInPicture(this.engine, this.bus, this.config.pip, this.container);
      pip.init();
      this.features.push(pip);
    }

    // Exit-Intent Popup
    if (this.config.exitIntent) {
      const exitIntent = new ExitIntent(this.engine, this.bus, this.config.exitIntent, wrapper);
      exitIntent.init();
      this.features.push(exitIntent);
    }

    // Countdown Timer
    if (this.config.countdown) {
      const countdown = new CountdownTimer(this.bus, this.config.countdown, this.container);
      countdown.init();
      this.features.push(countdown);
    }

    // Social Proof
    if (this.config.socialProof) {
      const socialProof = new SocialProof(this.bus, this.config.socialProof, this.container);
      socialProof.init();
      this.features.push(socialProof);
    }

    // Smart Chapters
    if (this.config.chapters) {
      const chapters = new SmartChapters(this.engine, this.bus, this.config.chapters, this.container);
      chapters.init();
      this.features.push(chapters);
    }

    // Interactive Polls
    if (this.config.polls) {
      const polls = new InteractivePoll(this.engine, this.bus, this.config.polls, this.container);
      polls.init();
      this.features.push(polls);
    }

    // Analytics
    const tracker = new Tracker(
      this.bus,
      this.config.analytics,
      this.config.videoId,
      this.config.abTest.variantId,
      this.config.assignedHeadlineVariant,
      this.config.assignedSpeedVariant
    );
    tracker.init();
    this.features.push(tracker);

    const heartbeat = new Heartbeat(
      this.engine,
      this.bus,
      this.config.analytics
    );
    heartbeat.init();
    this.features.push(heartbeat);

    // Handle play requests from features (e.g., recovery thumbnail click)
    this.bus.on("request:play", () => this.engine.play());

    // State sync
    this.bus.on("video:timeupdate", (currentTime: number, duration: number) => {
      if (!this.config.progressBar.fictitious) {
        this.state.update({
          currentTime,
          duration,
          progress: duration > 0 ? currentTime / duration : 0,
          displayProgress: duration > 0 ? currentTime / duration : 0,
        });
      } else {
        this.state.update({ currentTime, duration });
      }
    });

    this.bus.on("video:play", () => this.state.update({ playing: true }));
    this.bus.on("video:pause", () => this.state.update({ playing: false }));
    this.bus.on("video:volumechange", (vol: number, muted: boolean) =>
      this.state.update({ volume: vol, muted })
    );
    this.bus.on("video:ratechange", (rate: number) =>
      this.state.update({ playbackRate: rate })
    );
    this.bus.on("video:buffered", (buffered: number) =>
      this.state.update({ buffered })
    );
    this.bus.on("engine:error", (err: string) =>
      this.state.update({ error: err })
    );

    // Video Funnel OR single video load
    if (this.config.funnel?.enabled && this.config.funnel.steps.length > 0) {
      // Funnel mode: funnel controls video loading + transitions
      const funnel = new VideoFunnel(this.engine, this.bus, this.config.funnel);
      funnel.init();
      this.features.push(funnel);

      // Load the first step's video
      const firstStep = this.config.funnel.steps[0];
      this.engine.load(firstStep.assignedVariant.hlsUrl, this.config.posterUrl);
    } else {
      // Single video mode
      this.engine.load(this.config.hlsUrl, this.config.posterUrl);
    }

    // Smart Autoplay (must be last — it triggers play)
    this.bus.once("engine:ready", () => {
      this.state.update({ ready: true });
      const autoplay = new SmartAutoplay(
        this.engine,
        this.bus,
        this.config.autoplay,
        wrapper
      );
      autoplay.init();
      this.features.push(autoplay);
    });
  }

  play(): void {
    this.engine.play();
  }

  pause(): void {
    this.engine.pause();
  }

  seek(time: number): void {
    this.engine.seek(time);
  }

  getState(): ReturnType<StateManager["get"]> {
    return this.state.get();
  }

  destroy(): void {
    this.features.forEach((f) => f.destroy());
    this.controls?.destroy();
    this.engine.destroy();
    this.bus.removeAll();
    this.container.innerHTML = "";
  }
}
