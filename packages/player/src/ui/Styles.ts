import type { StyleConfig } from "../config/types";

export function injectStyles(containerId: string, style: StyleConfig): void {
  const css = `
    #${containerId} {
      --sp-primary: ${style.primaryColor};
      --sp-bg: ${style.backgroundColor};
      --sp-controls-bg: ${style.controlsBackground};
      --sp-controls-color: ${style.controlsColor};
      --sp-font: ${style.fontFamily};
      --sp-radius: ${style.borderRadius}px;
      position: relative;
      width: 100%;
      background: var(--sp-bg);
      border-radius: var(--sp-radius);
      overflow: hidden;
      font-family: var(--sp-font);
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }
    #${containerId} * {
      box-sizing: border-box;
    }
    #${containerId} .sp-video-wrapper {
      position: relative;
      width: 100%;
      padding-top: 56.25%; /* 16:9 */
    }
    #${containerId} .sp-video-wrapper > video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    #${containerId} .sp-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--sp-controls-bg);
      padding: 0 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: opacity 0.3s ease;
      z-index: 10;
    }
    #${containerId} .sp-controls.sp-hidden {
      opacity: 0;
      pointer-events: none;
    }
    #${containerId} .sp-controls-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #${containerId} .sp-btn {
      background: none;
      border: none;
      color: var(--sp-controls-color);
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.15s;
    }
    #${containerId} .sp-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    #${containerId} .sp-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    #${containerId} .sp-progress-container {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      margin-top: 8px;
    }
    #${containerId} .sp-progress-buffered {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      pointer-events: none;
    }
    #${containerId} .sp-progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: var(--sp-primary);
      border-radius: 3px;
      pointer-events: none;
      transition: width 0.1s linear;
    }
    #${containerId} .sp-progress-thumb {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      background: var(--sp-primary);
      border: 2px solid white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    }
    #${containerId} .sp-progress-container:hover .sp-progress-thumb {
      opacity: 1;
    }
    #${containerId} .sp-time {
      color: var(--sp-controls-color);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      user-select: none;
      white-space: nowrap;
    }
    #${containerId} .sp-spacer {
      flex: 1;
    }
    @keyframes sp-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sp-slide-down {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes sp-cta-in {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-smartplayer", containerId);
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}
