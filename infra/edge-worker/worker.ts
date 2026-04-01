/**
 * SmartPlayer Edge Config Worker
 *
 * Deploys to Cloudflare Workers. Serves the /player/:videoId/config
 * endpoint from the edge with KV caching for <20ms response times.
 *
 * Setup:
 * 1. Create a KV namespace: wrangler kv:namespace create "PLAYER_CONFIG"
 * 2. Update wrangler.toml with the namespace ID
 * 3. Deploy: wrangler deploy
 *
 * Cache strategy:
 * - Check KV first (TTL 60s)
 * - On miss, fetch from origin API, cache in KV
 * - Dashboard invalidates KV on config change via API
 */

interface Env {
  PLAYER_CONFIG: KVNamespace;
  ORIGIN_API_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Route: GET /player/:videoId/config
    const match = path.match(/^\/player\/([a-zA-Z0-9-]+)\/config$/);
    if (!match || request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const videoId = match[1];
    const cacheKey = `player:config:${videoId}`;

    // 1. Try KV cache
    const cached = await env.PLAYER_CONFIG.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
          "X-Cache": "HIT",
          ...corsHeaders(),
        },
      });
    }

    // 2. Fetch from origin
    try {
      const originUrl = `${env.ORIGIN_API_URL}/player/${videoId}/config`;
      const originRes = await fetch(originUrl, {
        headers: { "User-Agent": "SmartPlayer-Edge/1.0" },
      });

      if (!originRes.ok) {
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: originRes.status,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const body = await originRes.text();

      // 3. Cache in KV (60 second TTL)
      await env.PLAYER_CONFIG.put(cacheKey, body, { expirationTtl: 60 });

      return new Response(body, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
          "X-Cache": "MISS",
          ...corsHeaders(),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Origin unreachable" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
  },
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
