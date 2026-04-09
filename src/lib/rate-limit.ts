import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/error";

type Counter = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RouteRateLimitRule = Partial<RateLimitRule>;

declare global {
  // eslint-disable-next-line no-var
  var __mapleinsRateLimitStore__: Map<string, Counter> | undefined;
}

const store = globalThis.__mapleinsRateLimitStore__ ?? new Map<string, Counter>();
globalThis.__mapleinsRateLimitStore__ = store;

const GLOBAL_LIMIT = Number(process.env.GLOBAL_RATE_LIMIT_MAX ?? 240);
const GLOBAL_WINDOW_MS = Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS ?? 60_000);

function getGlobalRule(): RateLimitRule | null {
  if (!Number.isFinite(GLOBAL_LIMIT) || GLOBAL_LIMIT <= 0) return null;
  if (!Number.isFinite(GLOBAL_WINDOW_MS) || GLOBAL_WINDOW_MS <= 0) return null;
  return { limit: GLOBAL_LIMIT, windowMs: GLOBAL_WINDOW_MS };
}

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function consume(key: string, rule: RateLimitRule): Counter & { remaining: number } {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next: Counter = { count: 1, resetAt: now + rule.windowMs };
    store.set(key, next);
    return { ...next, remaining: Math.max(rule.limit - 1, 0) };
  }

  current.count += 1;
  store.set(key, current);
  return { ...current, remaining: Math.max(rule.limit - current.count, 0) };
}

function cleanupStore() {
  // Lightweight opportunistic cleanup.
  if (store.size < 10_000) return;
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) store.delete(key);
  });
}

function enforceRule(prefix: string, ip: string, rule: RateLimitRule) {
  cleanupStore();
  const key = `${prefix}:${ip}`;
  const hit = consume(key, rule);
  if (hit.count <= rule.limit) return;

  const retryAfter = Math.max(Math.ceil((hit.resetAt - Date.now()) / 1000), 1);
  throw new ApiError(429, "Too many requests. Please try again shortly.", {
    code: "RATE_LIMITED",
    headers: {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": String(rule.limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(hit.resetAt),
    },
  });
}

export function enforceRateLimit(
  request: NextRequest,
  routeKey: string,
  routeRule?: RouteRateLimitRule
) {
  const ip = getClientIp(request);
  const globalRule = getGlobalRule();

  if (globalRule) {
    enforceRule("global", ip, globalRule);
  }

  if (routeRule?.limit && routeRule?.windowMs) {
    enforceRule(routeKey, ip, {
      limit: routeRule.limit,
      windowMs: routeRule.windowMs,
    });
  }
}
