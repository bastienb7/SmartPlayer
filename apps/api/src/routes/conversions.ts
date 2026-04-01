import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, conversionWebhooks, conversions } from "@smartplayer/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware, getOrgId } from "../middleware/auth";

const app = new Hono();

// ── Authenticated: Webhook config CRUD ──────────────────

app.use("/webhooks/*", authMiddleware);

app.get("/webhooks", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.query.conversionWebhooks.findMany({
    where: eq(conversionWebhooks.orgId, orgId),
  });
  return c.json({ webhooks: result });
});

const webhookSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(["stripe", "hotmart", "clickbank", "kiwify", "digistore", "custom"]),
  secret: z.string().optional(),
});

app.post("/webhooks", authMiddleware, zValidator("json", webhookSchema), async (c) => {
  const orgId = getOrgId(c);
  const data = c.req.valid("json");
  const endpointPath = `/conversions/hook/${crypto.randomUUID().slice(0, 12)}`;

  const [webhook] = await db.insert(conversionWebhooks)
    .values({ ...data, orgId, endpointPath })
    .returning();

  return c.json(webhook, 201);
});

app.delete("/webhooks/:id", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(conversionWebhooks)
    .where(and(eq(conversionWebhooks.id, c.req.param("id")!), eq(conversionWebhooks.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});

// ── Authenticated: Conversion analytics ─────────────────

app.get("/stats", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const videoId = c.req.query("videoId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let query = db.select({
    totalConversions: sql<number>`count(*)`,
    totalRevenue: sql<number>`coalesce(sum(${conversions.amount}), 0)`,
    avgOrderValue: sql<number>`coalesce(avg(${conversions.amount}), 0)`,
  }).from(conversions).where(eq(conversions.orgId, orgId));

  const result = await query;
  return c.json(result[0] || { totalConversions: 0, totalRevenue: 0, avgOrderValue: 0 });
});

app.get("/list", authMiddleware, async (c) => {
  const orgId = getOrgId(c);
  const result = await db.query.conversions.findMany({
    where: eq(conversions.orgId, orgId),
    orderBy: [desc(conversions.createdAt)],
    limit: 100,
  });
  return c.json({ conversions: result });
});

// ── Public: Incoming webhook endpoints ──────────────────

app.post("/hook/:path", async (c) => {
  const path = `/conversions/hook/${c.req.param("path")!}`;

  // Find webhook config
  const webhook = await db.query.conversionWebhooks.findFirst({
    where: eq(conversionWebhooks.endpointPath, path),
  });

  if (!webhook || webhook.active !== "true") {
    return c.json({ error: "Webhook not found" }, 404);
  }

  const body = await c.req.json();

  // Parse conversion data based on platform
  const conversion = parsePlatformWebhook(webhook.platform, body, webhook.orgId, webhook.id);

  if (conversion) {
    await db.insert(conversions).values(conversion);
  }

  return c.json({ ok: true });
});

function parsePlatformWebhook(
  platform: string,
  body: any,
  orgId: string,
  webhookId: string
): any | null {
  const base = {
    orgId,
    webhookId,
    platform,
    rawPayload: body,
  };

  switch (platform) {
    case "stripe": {
      // Stripe checkout.session.completed
      const session = body.data?.object;
      if (!session || body.type !== "checkout.session.completed") return null;
      return {
        ...base,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "USD",
        transactionId: session.id,
        viewerFingerprint: session.client_reference_id || null,
        utmSource: session.metadata?.utm_source || null,
        utmMedium: session.metadata?.utm_medium || null,
        utmCampaign: session.metadata?.utm_campaign || null,
        variantId: session.metadata?.variant_id || null,
        headlineVariantId: session.metadata?.headline_variant_id || null,
      };
    }

    case "hotmart": {
      const data = body.data || body;
      if (body.event !== "PURCHASE_COMPLETE" && body.event !== "PURCHASE_APPROVED") return null;
      return {
        ...base,
        amount: data.purchase?.price?.value || 0,
        currency: data.purchase?.price?.currency_code || "BRL",
        transactionId: data.purchase?.transaction || body.id,
        utmSource: data.purchase?.tracking?.source || null,
      };
    }

    case "clickbank": {
      if (body.transactionType !== "SALE") return null;
      return {
        ...base,
        amount: body.totalOrderAmount || 0,
        currency: body.currency || "USD",
        transactionId: body.receipt,
        utmSource: body.trackingCodes?.[0] || null,
      };
    }

    case "custom":
    default: {
      // Generic: expect { amount, currency, transactionId, viewerFingerprint }
      return {
        ...base,
        amount: body.amount || 0,
        currency: body.currency || "USD",
        transactionId: body.transactionId || body.id,
        viewerFingerprint: body.viewerFingerprint || body.viewer_fingerprint || null,
        sessionId: body.sessionId || body.session_id || null,
        utmSource: body.utmSource || body.utm_source || null,
        variantId: body.variantId || body.variant_id || null,
      };
    }
  }
}

export { app as conversionRoutes };
