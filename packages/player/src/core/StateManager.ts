export interface PlayerState {
  playing: boolean;
  muted: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  playbackRate: number;
  quality: string;
  fullscreen: boolean;
  ready: boolean;
  error: string | null;
  /** Real progress 0-1 */
  progress: number;
  /** Display progress 0-1 (fictitious) */
  displayProgress: number;
}

export type StateListener = (state: PlayerState, prev: PlayerState) => void;

export class StateManager {
  private state: PlayerState = {
    playing: false,
    muted: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    playbackRate: 1,
    quality: "auto",
    fullscreen: false,
    ready: false,
    error: null,
    progress: 0,
    displayProgress: 0,
  };

  private listeners = new Set<StateListener>();

  get(): PlayerState {
    return { ...this.state };
  }

  update(partial: Partial<PlayerState>): void {
    const prev = { ...this.state };
    Object.assign(this.state, partial);
    this.listeners.forEach((fn) => {
      try {
        fn(this.state, prev);
      } catch (e) {
        console.error("[SmartPlayer] State listener error:", e);
      }
    });
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
