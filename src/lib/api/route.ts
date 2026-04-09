import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ZodError, ZodType } from "zod";
import { ApiError } from "@/lib/api/error";
import { enforceRateLimit, type RouteRateLimitRule } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";

type HandlerContext = {
  requestId: string;
  user: string | null;
};

type HandlerResult = Response | NextResponse | unknown | void;

type ApiRouteOptions = {
  routeKey: string;
  rateLimit?: RouteRateLimitRule;
};

type ApiErrorResponse = {
  response: Response;
  status: number;
  code: string;
};

function getUserHint(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || request.headers.get("x-user-email") || null;
}

export function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

function attachRequestId(response: Response, requestId: string): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}

export function toApiErrorResponse(error: unknown, requestId: string): ApiErrorResponse {
  if (error instanceof ApiError) {
    const body = {
      error: error.message,
      code: error.code ?? "API_ERROR",
      details: error.details,
      requestId,
    };
    const response = NextResponse.json(body, { status: error.status });
    if (error.headers) {
      for (const [key, value] of Object.entries(error.headers)) {
        response.headers.set(key, value);
      }
    }
    return {
      response: attachRequestId(response, requestId),
      status: error.status,
      code: error.code ?? "API_ERROR",
    };
  }

  if (error instanceof ZodError) {
    const response = NextResponse.json(
      {
        error: "Invalid request.",
        code: "INVALID_REQUEST",
        details: error.flatten(),
        requestId,
      },
      { status: 400 }
    );
    return { response: attachRequestId(response, requestId), status: 400, code: "INVALID_REQUEST" };
  }

  if (error instanceof SyntaxError) {
    const response = NextResponse.json(
      {
        error: "Invalid JSON payload.",
        code: "INVALID_JSON",
        requestId,
      },
      { status: 400 }
    );
    return { response: attachRequestId(response, requestId), status: 400, code: "INVALID_JSON" };
  }

  Sentry.captureException(error);
  const response = NextResponse.json(
    {
      error: "Internal server error.",
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    },
    { status: 500 }
  );
  return {
    response: attachRequestId(response, requestId),
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
  };
}

export function withApiHandler(
  handler: (request: NextRequest, ctx: HandlerContext) => Promise<HandlerResult>,
  options: ApiRouteOptions
) {
  return async function wrappedHandler(request: NextRequest): Promise<Response> {
    const requestId = getRequestId(request);
    const startedAt = Date.now();
    const user = getUserHint(request);

    try {
      enforceRateLimit(request, options.routeKey, options.rateLimit);
      const result = await handler(request, { requestId, user });
      const response = result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
      const attached = attachRequestId(response, requestId);

      logEvent({
        level: "info",
        event: "api.request",
        requestId,
        route: options.routeKey,
        method: request.method,
        status: attached.status,
        latencyMs: Date.now() - startedAt,
        user,
      });

      return attached;
    } catch (error) {
      const handled = toApiErrorResponse(error, requestId);
      logEvent({
        level: handled.status >= 500 ? "error" : "warn",
        event: "api.request",
        requestId,
        route: options.routeKey,
        method: request.method,
        status: handled.status,
        latencyMs: Date.now() - startedAt,
        user,
        errorCode: handled.code,
        details: error,
      });
      return handled.response;
    }
  };
}

export async function parseJsonBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON payload.", { code: "INVALID_JSON" });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid request body.", {
      code: "INVALID_BODY",
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

