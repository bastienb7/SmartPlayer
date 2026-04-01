import type { EventBus } from "../core/EventBus";
import type { VideoEngine } from "../core/VideoEngine";
import { createElement, removeElement } from "../utils/dom";

export interface PollOption {
  id: string;
  text: string;
  color?: string;
}

export interface PollQuestion {
  id: string;
  /** When to show (video seconds) */
  timestamp: number;
  question: string;
  options: PollOption[];
  /** Pause video while poll is shown */
  pauseVideo: boolean;
  /** Auto-dismiss after N seconds (0 = wait for answer) */
  autoDismissSeconds: number;
  /** Allow multiple selections */
  multiSelect: boolean;
}

export interface InteractivePollConfig {
  enabled: boolean;
  polls: PollQuestion[];
  /** Webhook URL to send responses to */
  webhookUrl?: string;
  /** Style */
  backgroundColor?: string;
  textColor?: string;
  optionColor?: string;
}

/**
 * Interactive Polls / Quiz™
 *
 * Shows interactive questions at specific video timestamps.
 * Pauses the video, collects responses, sends to webhook/analytics.
 * Responses can be used for audience segmentation.
 */
export class InteractivePoll {
  private overlay: HTMLElement | null = null;
  private firedPolls = new Set<string>();
  private container: HTMLElement;

  constructor(
    private engine: VideoEngine,
    private bus: EventBus,
    private config: InteractivePollConfig,
    container: HTMLElement
  ) {
    this.container = container;
  }

  init(): void {
    if (!this.config.enabled || this.config.polls.length === 0) return;

    this.bus.on("video:timeupdate", (currentTime: number) => {
      for (const poll of this.config.polls) {
        if (
          !this.firedPolls.has(poll.id) &&
          currentTime >= poll.timestamp &&
          currentTime < poll.timestamp + 1.5
        ) {
          this.firedPolls.add(poll.id);
          this.showPoll(poll);
        }
      }
    });

    // Reset on seek
    this.bus.on("video:seeked", () => {
      const ct = this.engine.currentTime;
      for (const poll of this.config.polls) {
        if (poll.timestamp > ct) this.firedPolls.delete(poll.id);
      }
    });
  }

  private showPoll(poll: PollQuestion): void {
    if (this.overlay) this.dismiss();

    // Pause video if configured
    if (poll.pauseVideo) {
      this.engine.pause();
    }

    // Overlay
    this.overlay = createElement("div", { class: "sp-poll-overlay" }, {
      position: "absolute",
      top: "0", left: "0", width: "100%", height: "100%",
      backgroundColor: this.config.backgroundColor || "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: "35",
      padding: "24px",
      animation: "sp-fade-in 0.3s ease",
    });

    // Question
    const q = createElement("h3", {}, {
      color: this.config.textColor || "#ffffff",
      fontSize: "20px",
      fontWeight: "700",
      textAlign: "center",
      marginBottom: "24px",
      fontFamily: "var(--sp-font)",
      lineHeight: "1.4",
      maxWidth: "500px",
    });
    q.textContent = poll.question;
    this.overlay.appendChild(q);

    // Options
    const optionsContainer = createElement("div", {}, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      width: "100%",
      maxWidth: "400px",
    });

    const selectedIds = new Set<string>();

    for (const option of poll.options) {
      const btn = createElement("button", { "data-option-id": option.id }, {
        display: "block",
        width: "100%",
        padding: "14px 20px",
        backgroundColor: option.color || this.config.optionColor || "rgba(255,255,255,0.1)",
        color: this.config.textColor || "#ffffff",
        border: "2px solid rgba(255,255,255,0.2)",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        fontFamily: "var(--sp-font)",
        textAlign: "left",
        transition: "all 0.2s ease",
      });
      btn.textContent = option.text;

      btn.addEventListener("mouseenter", () => {
        if (!selectedIds.has(option.id)) {
          btn.style.borderColor = "var(--sp-primary, #6366f1)";
          btn.style.backgroundColor = "rgba(99,102,241,0.2)";
        }
      });
      btn.addEventListener("mouseleave", () => {
        if (!selectedIds.has(option.id)) {
          btn.style.borderColor = "rgba(255,255,255,0.2)";
          btn.style.backgroundColor = option.color || this.config.optionColor || "rgba(255,255,255,0.1)";
        }
      });

      btn.addEventListener("click", () => {
        if (poll.multiSelect) {
          if (selectedIds.has(option.id)) {
            selectedIds.delete(option.id);
            btn.style.borderColor = "rgba(255,255,255,0.2)";
            btn.style.backgroundColor = option.color || "rgba(255,255,255,0.1)";
          } else {
            selectedIds.add(option.id);
            btn.style.borderColor = "var(--sp-primary, #6366f1)";
            btn.style.backgroundColor = "rgba(99,102,241,0.3)";
          }
        } else {
          this.submitResponse(poll, [option.id]);
        }
      });

      optionsContainer.appendChild(btn);
    }

    this.overlay.appendChild(optionsContainer);

    // Submit button for multi-select
    if (poll.multiSelect) {
      const submit = createElement("button", {}, {
        marginTop: "16px",
        padding: "12px 32px",
        backgroundColor: "var(--sp-primary, #6366f1)",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
        fontFamily: "var(--sp-font)",
      });
      submit.textContent = "Submit";
      submit.addEventListener("click", () => {
        this.submitResponse(poll, Array.from(selectedIds));
      });
      this.overlay.appendChild(submit);
    }

    const wrapper = this.container.querySelector(".sp-video-wrapper");
    if (wrapper) {
      (wrapper as HTMLElement).appendChild(this.overlay);
    }

    // Auto dismiss
    if (poll.autoDismissSeconds > 0) {
      setTimeout(() => this.dismiss(), poll.autoDismissSeconds * 1000);
    }

    this.bus.emit("analytics:event", "poll_show", { pollId: poll.id, question: poll.question });
  }

  private submitResponse(poll: PollQuestion, optionIds: string[]): void {
    // Analytics
    this.bus.emit("analytics:event", "poll_response", {
      pollId: poll.id,
      optionIds,
      question: poll.question,
      answers: optionIds.map((id) =>
        poll.options.find((o) => o.id === id)?.text || id
      ),
    });

    // Webhook
    if (this.config.webhookUrl) {
      fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: poll.id,
          question: poll.question,
          optionIds,
          answers: optionIds.map((id) =>
            poll.options.find((o) => o.id === id)?.text || id
          ),
          timestamp: Date.now(),
        }),
        keepalive: true,
      }).catch(() => {});
    }

    // Dismiss and resume
    this.dismiss();
    if (poll.pauseVideo) {
      this.engine.play();
    }
  }

  private dismiss(): void {
    if (this.overlay) {
      const el = this.overlay;
      el.style.opacity = "0";
      el.style.transition = "opacity 0.2s ease";
      this.overlay = null;
      setTimeout(() => removeElement(el), 200);
    }
  }

  destroy(): void {
    this.dismiss();
  }
}
