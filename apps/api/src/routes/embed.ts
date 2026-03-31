import { Hono } from "hono";
import { env } from "../config/env";

const app = new Hono();

/**
 * GET /embed/:videoId
 * Returns the HTML embed snippet for a video.
 */
app.get("/:videoId", async (c) => {
  const videoId = c.req.param("videoId")!;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; }
  </style>
</head>
<body>
  <div id="smartplayer-${videoId}" data-api="${env.API_URL}"></div>
  <script src="${env.CDN_URL}/sp.min.js" defer></script>
</body>
</html>`;

  return c.html(html);
});

/**
 * GET /embed/:videoId/code
 * Returns the embed code snippet (for copy/paste in dashboard).
 */
app.get("/:videoId/code", async (c) => {
  const videoId = c.req.param("videoId")!;

  const snippet = {
    iframe: `<iframe src="${env.API_URL}/embed/${videoId}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`,
    div: `<div id="smartplayer-${videoId}" data-api="${env.API_URL}"></div>\n<script src="${env.CDN_URL}/sp.min.js" defer></script>`,
  };

  return c.json(snippet);
});

export { app as embedRoutes };
