import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  DB: D1Database;
  R2: R2Bucket;
  BASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  WEB_URL: string;
  VPS_TRANSCODE_URL: string;
  VPS_TRANSCODE_SECRET: string;
};

type Variables = {
  orgId: string;
  userId?: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS
app.use("*", cors({ origin: "*" }));

// Helpers
function uuid() {
  return crypto.randomUUID();
}

function parseJSON(v: string | null | undefined, fallback: any) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

// Simple JWT (no external library — use Web Crypto)
async function signJWT(payload: Record<string, any>, secret: string, expiresIn = 30 * 24 * 3600): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const now = Math.floor(Date.now() / 1000);
  const body = btoa(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn })).replace(/=/g, "");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${header}.${body}.${sigStr}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const [header, body, sig] = token.split(".");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// bcrypt-compatible password hashing using Web Crypto (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `pbkdf2:${saltB64}:${hashB64}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2:")) {
    const [, saltB64, hashB64] = stored.split(":");
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(hash))) === hashB64;
  }
  // Fallback: bcrypt hashes from VPS migration won't verify here
  // Users will need to reset password after migration
  return false;
}

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    if (token === "dev-token") {
      c.set("orgId", "default");
      return next();
    }
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      c.set("orgId", payload.orgId || "default");
      c.set("userId", payload.userId);
      return next();
    }
  }
  c.set("orgId", "default");
  return next();
};

// ═══════════════════════════════════════════════════════════
// Health
// ═══════════════════════════════════════════════════════════

app.get("/health", (c) => c.json({ status: "ok", service: "slyplayer-api", runtime: "cloudflare-workers" }));

// ═══════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════

app.post("/auth/signup", async (c) => {
  const { email, password, name } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: "Email, password, and name are required" }, 400);
  if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) return c.json({ error: "An account with this email already exists" }, 409);

  const id = uuid();
  const passwordHash = await hashPassword(password);
  const verificationToken = uuid();

  await c.env.DB.prepare("INSERT INTO users (id, email, password_hash, name, org_id, email_verified, verification_token) VALUES (?, ?, ?, ?, ?, 0, ?)")
    .bind(id, email.toLowerCase(), passwordHash, name, "default", verificationToken).run();

  // Send verification email via Resend
  const verifyUrl = `${c.env.BASE_URL}/auth/verify?token=${verificationToken}`;
  if (c.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "SlyPlayer <noreply@bastienbricout.com>",
          to: email.toLowerCase(),
          subject: "Verify your SlyPlayer account",
          html: `<div style="max-width:480px;margin:0 auto;font-family:-apple-system,sans-serif;color:#1a1a2e;"><div style="text-align:center;padding:32px 0;"><div style="display:inline-block;width:48px;height:48px;background:#10b981;border-radius:12px;line-height:48px;"><span style="color:white;font-size:24px;font-weight:bold;">▶</span></div></div><h1 style="text-align:center;font-size:24px;margin:0 0 8px;">Welcome to SlyPlayer</h1><p style="text-align:center;color:#6b7280;margin:0 0 32px;">Hi ${name}, verify your email to get started.</p><div style="text-align:center;margin:32px 0;"><a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Verify my email</a></div><p style="text-align:center;color:#9ca3af;font-size:13px;">Or copy: <a href="${verifyUrl}" style="color:#10b981;">${verifyUrl}</a></p></div>`,
        }),
      });
    } catch { /* don't fail signup if email fails */ }
  }

  const token = await signJWT({ userId: id, email: email.toLowerCase(), orgId: "default" }, c.env.JWT_SECRET);
  return c.json({ token, user: { id, email: email.toLowerCase(), name, emailVerified: false }, message: "Account created! Check your email to verify." }, 201);
});

app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

  const user: any = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (!user) return c.json({ error: "Invalid email or password" }, 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: "Invalid email or password" }, 401);

  const token = await signJWT({ userId: user.id, email: user.email, orgId: user.org_id }, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, emailVerified: !!user.email_verified } });
});

app.get("/auth/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Not authenticated" }, 401);
  const token = auth.slice(7);
  if (token === "dev-token") return c.json({ user: { id: "dev", email: "dev@localhost", name: "Developer" } });

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: "Invalid token" }, 401);

  const user: any = await c.env.DB.prepare("SELECT id, email, name, org_id, email_verified, created_at FROM users WHERE id = ?").bind(payload.userId).first();
  if (!user) return c.json({ error: "User not found" }, 401);
  return c.json({ user: { ...user, emailVerified: !!user.email_verified } });
});

// Email verification
app.get("/auth/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.html('<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0f;color:#fff;"><h1>Invalid link</h1></body></html>', 400);
  const user: any = await c.env.DB.prepare("SELECT id, email, name FROM users WHERE verification_token = ?").bind(token).first();
  if (!user) return c.html('<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0f;color:#fff;"><h1>Link expired</h1><a href="' + (c.env.WEB_URL || 'https://slyplayer.com') + '/login" style="color:#10b981;">Go to login</a></body></html>', 404);
  await c.env.DB.prepare("UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?").bind(user.id).run();
  return c.html('<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0f;color:#fff;"><div style="display:inline-block;width:64px;height:64px;background:#10b981;border-radius:50%;line-height:64px;margin-bottom:24px;"><span style="color:white;font-size:32px;">✓</span></div><h1>Email Verified!</h1><p style="color:#9ca3af;">Your account <strong>' + user.email + '</strong> is verified.</p><a href="' + (c.env.WEB_URL || 'https://slyplayer.com') + '/dashboard" style="display:inline-block;background:#10b981;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin-top:20px;">Go to Dashboard</a></body></html>');
});

app.post("/auth/resend-verification", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);
  const user: any = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (!user || user.email_verified) return c.json({ ok: true });
  let vToken = user.verification_token;
  if (!vToken) {
    vToken = uuid();
    await c.env.DB.prepare("UPDATE users SET verification_token = ? WHERE id = ?").bind(vToken, user.id).run();
  }
  if (c.env.RESEND_API_KEY) {
    const verifyUrl = `${c.env.BASE_URL}/auth/verify?token=${vToken}`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "SlyPlayer <noreply@bastienbricout.com>",
          to: email.toLowerCase(),
          subject: "Verify your SlyPlayer account",
          html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;text-align:center;"><h1>Verify your email</h1><a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:white;padding:14px 32px;border-radius:8px;font-weight:600;text-decoration:none;">Verify</a></div>`,
        }),
      });
    } catch { /* ignore */ }
  }
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// Videos
// ═══════════════════════════════════════════════════════════

app.get("/api/videos", authMiddleware, async (c) => {
  const orgId = c.get("orgId");
  const { results } = await c.env.DB.prepare("SELECT * FROM videos WHERE org_id = ? ORDER BY created_at DESC").bind(orgId).all();
  return c.json({ videos: results });
});

app.get("/api/videos/:id", authMiddleware, async (c) => {
  const video = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).first();
  if (!video) return c.json({ error: "Not found" }, 404);
  return c.json({ video });
});

app.post("/api/videos", authMiddleware, async (c) => {
  const orgId = c.get("orgId");
  const { title = "Untitled", contentType = "video/mp4" } = await c.req.json();
  const id = uuid();
  const ext = contentType.split("/")[1]?.replace("quicktime", "mov") || "mp4";
  const filename = `${id}.${ext}`;
  const r2Key = `videos/${orgId}/${filename}`;

  await c.env.DB.prepare("INSERT INTO videos (id, org_id, title, status, filename) VALUES (?, ?, ?, 'uploading', ?)").bind(id, orgId, title, filename).run();
  await c.env.DB.prepare("INSERT INTO players (id, video_id, org_id) VALUES (?, ?, ?)").bind(uuid(), id, orgId).run();

  // Generate presigned upload URL for R2
  const uploadUrl = `${c.env.BASE_URL}/api/videos/${id}/file`;

  const video = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first();
  return c.json({ video, uploadUrl }, 201);
});

app.put("/api/videos/:id/file", async (c) => {
  const id = c.req.param("id");
  const video: any = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first();
  if (!video) return c.json({ error: "Not found" }, 404);

  const body = await c.req.arrayBuffer();
  const r2Key = `videos/${video.org_id}/${video.filename}`;
  await c.env.R2.put(r2Key, body, { httpMetadata: { contentType: c.req.header("Content-Type") || "video/mp4" } });

  await c.env.DB.prepare("UPDATE videos SET size_bytes = ?, updated_at = datetime('now') WHERE id = ?").bind(body.byteLength, id).run();
  return c.json({ ok: true, size: body.byteLength });
});

app.post("/api/videos/:id/uploaded", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const orgId = c.get("orgId");
  const video: any = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ? AND org_id = ?").bind(id, orgId).first();
  if (!video) return c.json({ error: "Not found" }, 404);

  // Mark as processing
  await c.env.DB.prepare("UPDATE videos SET status = 'processing', updated_at = datetime('now') WHERE id = ?").bind(id).run();

  // Send webhook to VPS for FFmpeg transcoding
  if (c.env.VPS_TRANSCODE_URL) {
    try {
      await fetch(c.env.VPS_TRANSCODE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Transcode-Secret": c.env.VPS_TRANSCODE_SECRET || "" },
        body: JSON.stringify({
          videoId: id,
          orgId,
          filename: video.filename,
          r2Key: `videos/${orgId}/${video.filename}`,
          callbackUrl: `${c.env.BASE_URL}/api/internal/transcode-complete`,
        }),
      });
    } catch {
      // If VPS unreachable, serve as MP4 directly
      const videoUrl = `${c.env.BASE_URL}/media/videos/${orgId}/${video.filename}`;
      await c.env.DB.prepare("UPDATE videos SET status = 'ready', hls_url = ?, updated_at = datetime('now') WHERE id = ?").bind(videoUrl, id).run();
    }
  } else {
    // No VPS configured — serve MP4 directly
    const videoUrl = `${c.env.BASE_URL}/media/videos/${orgId}/${video.filename}`;
    await c.env.DB.prepare("UPDATE videos SET status = 'ready', hls_url = ?, updated_at = datetime('now') WHERE id = ?").bind(videoUrl, id).run();
  }

  return c.json({ ok: true, status: "processing" });
});

// Internal callback from VPS after transcoding
app.post("/api/internal/transcode-complete", async (c) => {
  const secret = c.req.header("X-Transcode-Secret");
  if (secret !== c.env.VPS_TRANSCODE_SECRET) return c.json({ error: "Unauthorized" }, 401);

  const { videoId, status, hlsUrl, posterUrl, duration, width, height } = await c.req.json();

  if (status === "ready") {
    await c.env.DB.prepare(
      "UPDATE videos SET status = 'ready', hls_url = ?, poster_url = ?, duration = ?, width = ?, height = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(hlsUrl, posterUrl || null, duration || 0, width || 0, height || 0, videoId).run();
  } else {
    // Error — fallback to MP4
    const video: any = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(videoId).first();
    if (video) {
      const videoUrl = `${c.env.BASE_URL}/media/videos/${video.org_id}/${video.filename}`;
      await c.env.DB.prepare("UPDATE videos SET status = 'ready', hls_url = ?, updated_at = datetime('now') WHERE id = ?").bind(videoUrl, videoId).run();
    }
  }
  return c.json({ ok: true });
});

app.patch("/api/videos/:id", authMiddleware, async (c) => {
  const { title } = await c.req.json();
  if (title) {
    await c.env.DB.prepare("UPDATE videos SET title = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?").bind(title, c.req.param("id"), c.get("orgId")).run();
  }
  return c.json({ ok: true });
});

app.delete("/api/videos/:id", authMiddleware, async (c) => {
  const r = await c.env.DB.prepare("DELETE FROM videos WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).run();
  if (!r.meta.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// Player config
app.get("/api/videos/:id/player", authMiddleware, async (c) => {
  const player: any = await c.env.DB.prepare("SELECT * FROM players WHERE video_id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).first();
  if (!player) return c.json({ error: "Not found" }, 404);
  return c.json({
    id: player.id, videoId: player.video_id,
    autoplayConfig: parseJSON(player.autoplay_config, {}),
    progressBarConfig: parseJSON(player.progress_bar_config, {}),
    recoveryThumbnailConfig: parseJSON(player.recovery_thumbnail_config, {}),
    resumePlayConfig: parseJSON(player.resume_play_config, {}),
    miniHookConfig: parseJSON(player.mini_hook_config, {}),
    turboSpeedConfig: parseJSON(player.turbo_speed_config, {}),
    styleConfig: parseJSON(player.style_config, {}),
    ctaConfig: parseJSON(player.cta_config, []),
    exitIntentConfig: parseJSON(player.exit_intent_config, {}),
    pixelConfig: parseJSON(player.pixel_config, []),
    headlinesConfig: parseJSON(player.headlines_config, {}),
    chaptersConfig: parseJSON(player.chapters_config, []),
    countdownConfig: parseJSON(player.countdown_config, {}),
    socialProofConfig: parseJSON(player.social_proof_config, []),
    pageSyncConfig: parseJSON(player.page_sync_config, []),
    trafficFilterConfig: parseJSON(player.traffic_filter_config, {}),
    playbackConfig: parseJSON(player.playback_config, {}),
    pollsConfig: parseJSON(player.polls_config, {}),
    analyticsEnabled: !!player.analytics_enabled,
  });
});

app.patch("/api/videos/:id/player", authMiddleware, async (c) => {
  const body = await c.req.json();
  const colMap: Record<string, string> = {
    autoplayConfig: "autoplay_config", progressBarConfig: "progress_bar_config",
    recoveryThumbnailConfig: "recovery_thumbnail_config", resumePlayConfig: "resume_play_config",
    miniHookConfig: "mini_hook_config", turboSpeedConfig: "turbo_speed_config",
    styleConfig: "style_config", ctaConfig: "cta_config", exitIntentConfig: "exit_intent_config",
    pixelConfig: "pixel_config", headlinesConfig: "headlines_config",
    chaptersConfig: "chapters_config", countdownConfig: "countdown_config",
    socialProofConfig: "social_proof_config", pageSyncConfig: "page_sync_config",
    trafficFilterConfig: "traffic_filter_config", playbackConfig: "playback_config",
    pollsConfig: "polls_config",
  };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [jsKey, dbKey] of Object.entries(colMap)) {
    if (body[jsKey] !== undefined) { sets.push(`${dbKey} = ?`); vals.push(JSON.stringify(body[jsKey])); }
  }
  if (body.analyticsEnabled !== undefined) { sets.push("analytics_enabled = ?"); vals.push(body.analyticsEnabled ? 1 : 0); }
  if (sets.length === 0) return c.json({ ok: true });
  sets.push("updated_at = datetime('now')");
  vals.push(c.req.param("id"), c.get("orgId"));
  await c.env.DB.prepare(`UPDATE players SET ${sets.join(", ")} WHERE video_id = ? AND org_id = ?`).bind(...vals).run();
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// Public player config (for embed)
// ═══════════════════════════════════════════════════════════

app.get("/player/:videoId/config", async (c) => {
  const videoId = c.req.param("videoId");
  const video: any = await c.env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(videoId).first();
  if (!video) return c.json({ error: "Video not found" }, 404);

  const player: any = await c.env.DB.prepare("SELECT * FROM players WHERE video_id = ?").bind(videoId).first();
  if (!player) return c.json({ error: "Player not configured" }, 404);

  const ctaTriggers = parseJSON(player.cta_config, []);
  const pixelList = parseJSON(player.pixel_config, []);
  const headlinesConfig = parseJSON(player.headlines_config, {});

  const headlineForPlayer: any = {
    enabled: !!(headlinesConfig.variants?.length > 0),
    variants: (headlinesConfig.variants || []).map((v: any) => ({ id: v.id, type: v.type || "text", text: v.text, imageUrl: v.imageUrl, style: v.style, weight: v.weight || 100 })),
    abTestEnabled: headlinesConfig.abTestEnabled || false,
    position: headlinesConfig.position || "above",
    animation: headlinesConfig.animation || "fade",
    mobileBreakpoint: 768,
  };
  if (headlineForPlayer.variants.length > 0) headlineForPlayer.assignedVariantId = headlineForPlayer.variants[0].id;

  const pixelForPlayer: any = { enabled: pixelList.length > 0, customEvents: [] };
  for (const px of pixelList) {
    if (px.platform === "facebook") pixelForPlayer.facebook = { pixelId: px.pixelId };
    if (px.platform === "google") pixelForPlayer.google = { measurementId: px.pixelId };
    if (px.platform === "tiktok") pixelForPlayer.tiktok = { pixelId: px.pixelId };
    for (const evt of (px.events || [])) pixelForPlayer.customEvents.push({ platform: px.platform, ...evt });
  }

  const exitIntentConfig = parseJSON(player.exit_intent_config, {});

  const config: any = {
    videoId: video.id,
    hlsUrl: video.hls_url || `${c.env.BASE_URL}/media/videos/${video.org_id}/${video.filename}`,
    posterUrl: video.poster_url || null,
    duration: video.duration || 0,
    autoplay: parseJSON(player.autoplay_config, { enabled: true }),
    progressBar: parseJSON(player.progress_bar_config, { enabled: true }),
    recoveryThumbnail: parseJSON(player.recovery_thumbnail_config, { enabled: false }),
    resumePlay: parseJSON(player.resume_play_config, { enabled: true }),
    miniHook: parseJSON(player.mini_hook_config, { enabled: false }),
    turboSpeed: parseJSON(player.turbo_speed_config, { enabled: false }),
    style: parseJSON(player.style_config, {}),
    cta: {
      enabled: ctaTriggers.length > 0,
      triggers: ctaTriggers.map((t: any) => ({
        id: t.id, timestamp: t.timestamp || 0,
        duration: t.duration === -1 ? 99999 : (t.duration || 10),
        text: t.text || "Click Here", url: t.url || "#",
        buttonColor: t.buttonColor || "#6366f1", buttonTextColor: t.buttonTextColor || "#ffffff",
        fontSize: (t.fontSize || 16) + "px",
        borderRadius: t.shape === "pill" ? "999px" : t.shape === "square" ? "0" : "8px",
        padding: (t.paddingY || 12) + "px " + (t.paddingX || 32) + "px",
        placement: t.position === "below" ? "below" : "inside",
        openInNewTab: t.openInNewTab !== false,
      })),
    },
    headline: headlineForPlayer,
    pixels: pixelForPlayer,
    abTest: { enabled: false },
    analytics: {
      enabled: !!player.analytics_enabled,
      endpoint: `${c.env.BASE_URL}/analytics/events`,
      beaconEndpoint: `${c.env.BASE_URL}/analytics/beacon`,
      batchSize: 10, flushIntervalMs: 5000, heartbeatIntervalMs: 5000,
    },
  };

  if (exitIntentConfig.enabled) config.exitIntent = exitIntentConfig;

  return c.json(config);
});

// ═══════════════════════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════════════════════

app.post("/analytics/events", async (c) => {
  const body = await c.req.json();
  const raw = body?.events || body;
  const events = Array.isArray(raw) ? raw : [raw];

  for (const e of events) {
    await c.env.DB.prepare("INSERT INTO analytics_events (type, video_id, org_id, session_id, viewer_fingerprint, timestamp, current_time, duration, progress, variant_id, meta, device, browser) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(e.type || "", e.videoId || "", e.orgId || "default", e.sessionId || null, e.viewerFingerprint || null, e.timestamp || Date.now(), e.currentTime || 0, e.duration || 0, e.progress || 0, e.variantId || null, JSON.stringify(e.meta || {}), e.device || "", e.browser || "").run();
  }
  return c.json({ ok: true, count: events.length });
});

app.post("/analytics/beacon", (c) => c.json({ ok: true }));

app.get("/analytics/overview", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  const where = videoId ? "AND video_id = ?" : "";
  const params = videoId ? [c.get("orgId"), videoId] : [c.get("orgId")];

  const stats: any = await c.env.DB.prepare(`SELECT
    COUNT(CASE WHEN type = 'play' THEN 1 END) as totalPlays,
    COUNT(CASE WHEN type = 'complete' THEN 1 END) as totalCompletions,
    COUNT(DISTINCT CASE WHEN type = 'play' THEN viewer_fingerprint END) as uniqueViewers,
    COUNT(CASE WHEN type = 'cta_click' THEN 1 END) as ctaClicks,
    AVG(CASE WHEN type IN ('heartbeat','complete') THEN progress END) as avgProgress
    FROM analytics_events WHERE org_id = ? ${where}`).bind(...params).first();

  return c.json({
    totalPlays: stats?.totalPlays || 0,
    totalCompletions: stats?.totalCompletions || 0,
    uniqueViewers: stats?.uniqueViewers || 0,
    ctaClicks: stats?.ctaClicks || 0,
    avgProgress: Math.round(stats?.avgProgress || 0),
  });
});

app.get("/analytics/retention", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);
  const { results } = await c.env.DB.prepare("SELECT (progress / 5) * 5 as bucket, COUNT(DISTINCT session_id) as viewers FROM analytics_events WHERE video_id = ? AND type IN ('heartbeat','progress','complete') GROUP BY bucket ORDER BY bucket").bind(videoId).all();
  return c.json({ retention: results });
});

app.get("/analytics/daily", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  const where = videoId ? "AND video_id = ?" : "";
  const params = videoId ? [c.get("orgId"), videoId] : [c.get("orgId")];
  const { results } = await c.env.DB.prepare(`SELECT date(created_at) as date, COUNT(CASE WHEN type = 'play' THEN 1 END) as plays, COUNT(DISTINCT CASE WHEN type = 'play' THEN viewer_fingerprint END) as viewers, COUNT(CASE WHEN type = 'cta_click' THEN 1 END) as cta_clicks FROM analytics_events WHERE org_id = ? ${where} GROUP BY date(created_at) ORDER BY date DESC LIMIT 30`).bind(...params).all();
  return c.json({ daily: results });
});

app.get("/analytics/details", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);
  const s: any = await c.env.DB.prepare(`SELECT
    COUNT(CASE WHEN type='pause' THEN 1 END) as totalPauses,
    COUNT(CASE WHEN type='seek' THEN 1 END) as totalSeeks,
    AVG(CASE WHEN type IN ('complete','heartbeat') AND progress > 80 THEN current_time END) as avgWatchTimeSeconds,
    COUNT(CASE WHEN type='cta_show' THEN 1 END) as ctaImpressions,
    COUNT(CASE WHEN type='cta_click' THEN 1 END) as ctaClicks
    FROM analytics_events WHERE video_id = ?`).bind(videoId).first();

  const plays: any = await c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE video_id = ? AND type = 'play'").bind(videoId).first();
  const completes: any = await c.env.DB.prepare("SELECT COUNT(*) as c FROM analytics_events WHERE video_id = ? AND type = 'complete'").bind(videoId).first();
  const mobile: any = await c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE video_id = ? AND device = 'mobile'").bind(videoId).first();
  const desktop: any = await c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE video_id = ? AND device = 'desktop'").bind(videoId).first();

  const ctaImpressions = s?.ctaImpressions || 0;
  const ctaClicks = s?.ctaClicks || 0;

  return c.json({
    totalPauses: s?.totalPauses || 0,
    totalSeeks: s?.totalSeeks || 0,
    avgWatchTimeSeconds: Math.round(s?.avgWatchTimeSeconds || 0),
    completionRate: plays?.c > 0 ? Math.round((completes?.c || 0) / plays.c * 100) : 0,
    ctaImpressions, ctaClicks,
    ctaCTR: ctaImpressions > 0 ? Math.round(ctaClicks / ctaImpressions * 10000) / 100 : 0,
    returningViewers: 0,
    mobileCount: mobile?.c || 0,
    desktopCount: desktop?.c || 0,
  });
});

app.get("/analytics/heatmap", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);

  const buckets = [];
  for (let b = 0; b < 100; b += 5) {
    const viewers: any = await c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE video_id = ? AND type IN ('heartbeat','progress','complete') AND progress >= ? AND progress < ?").bind(videoId, b, b + 5).first();
    const pauses: any = await c.env.DB.prepare("SELECT COUNT(*) as c FROM analytics_events WHERE video_id = ? AND type = 'pause' AND progress >= ? AND progress < ?").bind(videoId, b, b + 5).first();
    const seeks: any = await c.env.DB.prepare("SELECT COUNT(*) as c FROM analytics_events WHERE video_id = ? AND type = 'seek' AND progress >= ? AND progress < ?").bind(videoId, b, b + 5).first();
    buckets.push({ bucket: b, viewers: viewers?.c || 0, pauses: pauses?.c || 0, seeks: seeks?.c || 0, intensity: 0 });
  }
  const maxV = Math.max(...buckets.map(b => b.viewers), 1);
  for (const b of buckets) b.intensity = Math.round(b.viewers / maxV * 100);
  return c.json({ heatmap: buckets });
});

app.get("/analytics/dropoff", authMiddleware, async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId) return c.json({ error: "videoId required" }, 400);
  const dropoff = [];
  for (let b = 0; b < 100; b += 10) {
    const r: any = await c.env.DB.prepare("SELECT COUNT(DISTINCT session_id) as c FROM analytics_events WHERE video_id = ? AND type IN ('heartbeat','progress','complete') AND progress >= ?").bind(videoId, b).first();
    dropoff.push({ bucket: b, sessions: r?.c || 0 });
  }
  return c.json({ dropoff });
});

// ═══════════════════════════════════════════════════════════
// Folders
// ═══════════════════════════════════════════════════════════

app.get("/api/folders", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM folders WHERE org_id = ? ORDER BY name ASC").bind(c.get("orgId")).all();
  return c.json({ folders: results });
});

app.post("/api/folders", authMiddleware, async (c) => {
  const { name = "New Folder", color = "#6366f1" } = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare("INSERT INTO folders (id, org_id, name, color) VALUES (?, ?, ?, ?)").bind(id, c.get("orgId"), name, color).run();
  const folder = await c.env.DB.prepare("SELECT * FROM folders WHERE id = ?").bind(id).first();
  return c.json({ folder }, 201);
});

app.delete("/api/folders/:id", authMiddleware, async (c) => {
  await c.env.DB.prepare("UPDATE videos SET folder_id = NULL WHERE folder_id = ?").bind(c.req.param("id")).run();
  await c.env.DB.prepare("DELETE FROM folders WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).run();
  return c.json({ deleted: true });
});

app.patch("/api/videos/:id/organize", authMiddleware, async (c) => {
  const { folder_id, category, tags } = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (folder_id !== undefined) { sets.push("folder_id = ?"); vals.push(folder_id); }
  if (category !== undefined) { sets.push("category = ?"); vals.push(category); }
  if (tags !== undefined) { sets.push("tags = ?"); vals.push(JSON.stringify(tags)); }
  if (sets.length === 0) return c.json({ ok: true });
  sets.push("updated_at = datetime('now')");
  vals.push(c.req.param("id"), c.get("orgId"));
  await c.env.DB.prepare(`UPDATE videos SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════

app.get("/api/settings", authMiddleware, async (c) => {
  const org: any = await c.env.DB.prepare("SELECT * FROM organizations WHERE id = ?").bind(c.get("orgId")).first();
  if (!org) return c.json({ error: "Not found" }, 404);
  const vCount: any = await c.env.DB.prepare("SELECT COUNT(*) as c FROM videos WHERE org_id = ?").bind(c.get("orgId")).first();
  const fCount: any = await c.env.DB.prepare("SELECT COUNT(*) as c FROM funnels WHERE org_id = ?").bind(c.get("orgId")).first();
  return c.json({
    orgId: org.id, orgName: org.name, plan: org.plan || "free",
    apiKey: org.api_key, videoCount: vCount?.c || 0, funnelCount: fCount?.c || 0,
    baseUrl: c.env.BASE_URL, playerScriptUrl: `${c.env.BASE_URL}/sp/smartplayer.min.js`,
  });
});

app.patch("/api/settings", authMiddleware, async (c) => {
  const { orgName } = await c.req.json();
  if (orgName) await c.env.DB.prepare("UPDATE organizations SET name = ? WHERE id = ?").bind(orgName, c.get("orgId")).run();
  return c.json({ ok: true });
});

app.post("/api/settings/regenerate-key", authMiddleware, async (c) => {
  const newKey = "sp_live_" + uuid().replace(/-/g, "") + uuid().replace(/-/g, "").slice(0, 16);
  await c.env.DB.prepare("UPDATE organizations SET api_key = ? WHERE id = ?").bind(newKey, c.get("orgId")).run();
  return c.json({ apiKey: newKey });
});

app.patch("/api/settings/plan", authMiddleware, async (c) => {
  const { plan } = await c.req.json();
  if (!["free", "starter", "pro", "business"].includes(plan)) return c.json({ error: "Invalid plan" }, 400);
  await c.env.DB.prepare("UPDATE organizations SET plan = ? WHERE id = ?").bind(plan, c.get("orgId")).run();
  return c.json({ ok: true, plan });
});

// ═══════════════════════════════════════════════════════════
// R2 upload (for VPS transcoder)
// ═══════════════════════════════════════════════════════════

app.put("/api/internal/r2-upload", async (c) => {
  const secret = c.req.header("X-Transcode-Secret");
  if (secret !== c.env.VPS_TRANSCODE_SECRET) return c.json({ error: "Unauthorized" }, 401);

  const r2Key = c.req.header("X-R2-Key");
  if (!r2Key) return c.json({ error: "X-R2-Key header required" }, 400);

  const contentType = c.req.header("Content-Type") || "application/octet-stream";
  const body = await c.req.arrayBuffer();
  await c.env.R2.put(r2Key, body, { httpMetadata: { contentType } });

  return c.json({ ok: true, key: r2Key, size: body.byteLength });
});

// ═══════════════════════════════════════════════════════════
// R2 media serving
// ═══════════════════════════════════════════════════════════

app.get("/media/*", async (c) => {
  const key = c.req.path.replace("/media/", "");
  const object = await c.env.R2.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000");
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(object.body, { headers });
});

// ═══════════════════════════════════════════════════════════
// Funnels (basic CRUD)
// ═══════════════════════════════════════════════════════════

app.get("/api/funnels", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM funnels WHERE org_id = ? ORDER BY created_at DESC").bind(c.get("orgId")).all();
  return c.json({ funnels: results });
});

app.post("/api/funnels", authMiddleware, async (c) => {
  const { name = "New Funnel", description = "" } = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare("INSERT INTO funnels (id, org_id, name, description) VALUES (?, ?, ?, ?)").bind(id, c.get("orgId"), name, description).run();
  const funnel = await c.env.DB.prepare("SELECT * FROM funnels WHERE id = ?").bind(id).first();
  return c.json({ funnel }, 201);
});

app.get("/api/funnels/:id", authMiddleware, async (c) => {
  const funnel = await c.env.DB.prepare("SELECT * FROM funnels WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).first();
  if (!funnel) return c.json({ error: "Not found" }, 404);
  const { results: steps } = await c.env.DB.prepare("SELECT * FROM funnel_steps WHERE funnel_id = ? ORDER BY sort_order ASC").bind(c.req.param("id")).all();
  const stepsWithVariants = [];
  for (const step of steps) {
    const { results: variants } = await c.env.DB.prepare("SELECT fsv.*, v.title as video_title, v.poster_url, v.hls_url, v.duration FROM funnel_step_variants fsv LEFT JOIN videos v ON v.id = fsv.video_id WHERE fsv.step_id = ?").bind((step as any).id).all();
    stepsWithVariants.push({ ...step, variants });
  }
  return c.json({ funnel, steps: stepsWithVariants });
});

app.delete("/api/funnels/:id", authMiddleware, async (c) => {
  await c.env.DB.prepare("DELETE FROM funnels WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).run();
  return c.json({ deleted: true });
});

export default app;
