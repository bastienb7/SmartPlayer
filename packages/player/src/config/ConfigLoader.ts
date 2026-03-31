import type { PlayerConfig } from "./types";
import { mergeConfig } from "./types";

export class ConfigLoader {
  static async fetch(
    videoId: string,
    baseUrl?: string
  ): Promise<PlayerConfig> {
    const url = baseUrl
      ? `${baseUrl}/player/${videoId}/config`
      : `/player/${videoId}/config`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load player config: ${res.status}`);
    }
    const data = await res.json();
    return mergeConfig({ ...data, videoId });
  }

  static fromJSON(json: Partial<PlayerConfig>): PlayerConfig {
    return mergeConfig(json);
  }
}
