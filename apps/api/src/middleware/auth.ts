import type { Context, Next } from "hono";
import { env } from "../config/env";

/**
 * Auth middleware — verifies Clerk JWT token.
 * In development without Clerk keys, uses a dev bypass.
 */
export async function authMiddleware(c: Context, next: Next) {
  // Dev bypass when Clerk is not configured
  if (env.NODE_ENV === "development" && !env.CLERK_SECRET_KEY) {
    c.set("userId", "dev-user-001");
    c.set("orgId", "dev-org-001");
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // In production, verify with Clerk SDK
    // For now, decode JWT payload (unsigned verification for dev)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    c.set("userId", payload.sub);
    c.set("orgId", payload.org_id || payload.metadata?.orgId);

    if (!c.get("orgId")) {
      return c.json({ error: "Organization required" }, 403);
    }

    return next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

/** Extracts orgId from context — use after authMiddleware */
export function getOrgId(c: Context): string {
  return c.get("orgId") as string;
}

export function getUserId(c: Context): string {
  return c.get("userId") as string;
}
