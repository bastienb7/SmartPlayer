import { Player } from "./core/Player";
import { ConfigLoader } from "./config/ConfigLoader";
import type { PlayerConfig } from "./config/types";

export { Player, ConfigLoader };
export type { PlayerConfig };

/**
 * SmartPlayer IIFE entry point.
 * Automatically initializes players for all containers with id="smartplayer-{videoId}".
 */
(function () {
  const instances = new Map<string, Player>();

  function init() {
    const containers = document.querySelectorAll<HTMLElement>(
      'div[id^="smartplayer-"]'
    );

    containers.forEach(async (container) => {
      const videoId = container.id.replace("smartplayer-", "");
      if (!videoId || instances.has(videoId)) return;

      try {
        // Check for inline config via data attribute
        const inlineConfig = container.getAttribute("data-config");
        let config: PlayerConfig;

        if (inlineConfig) {
          config = ConfigLoader.fromJSON(JSON.parse(inlineConfig));
        } else {
          const baseUrl = container.getAttribute("data-api") || "";
          config = await ConfigLoader.fetch(videoId, baseUrl || undefined);
        }

        const player = new Player(container, config);
        instances.set(videoId, player);
      } catch (err) {
        console.error(`[SmartPlayer] Failed to init player "${videoId}":`, err);
      }
    });
  }

  // Expose API on window
  (window as any).SmartPlayer = {
    init,
    instances,
    Player,
    ConfigLoader,
    create(container: HTMLElement, config: Partial<PlayerConfig>): Player {
      const fullConfig = ConfigLoader.fromJSON(config);
      const player = new Player(container, fullConfig);
      instances.set(fullConfig.videoId, player);
      return player;
    },
    destroy(videoId: string): void {
      const player = instances.get(videoId);
      if (player) {
        player.destroy();
        instances.delete(videoId);
      }
    },
  };

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
