import { cors } from "hono/cors";
import { env } from "../config/env";

export const corsMiddleware = cors({
  origin: env.NODE_ENV === "development"
    ? "*"
    : [env.WEB_URL, env.API_URL],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
});
