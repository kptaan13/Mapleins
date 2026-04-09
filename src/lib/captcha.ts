import { z } from "zod";
import { ApiError } from "@/lib/api/error";
import { fetchWithTimeoutRetry } from "@/lib/net";

const captchaVerifySchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

function getCaptchaSecret(): string | null {
  const secret = process.env.CAPTCHA_SECRET_KEY?.trim();
  return secret ? secret : null;
}

export async function verifyCaptcha({
  token,
  ip,
  expectedAction,
}: {
  token?: string | null;
  ip?: string;
  expectedAction?: string;
}) {
  const secret = getCaptchaSecret();
  const enforceWithoutSecret = process.env.CAPTCHA_REQUIRED === "true";

  if (!secret) {
    if (enforceWithoutSecret) {
      throw new ApiError(500, "Captcha is required but CAPTCHA_SECRET_KEY is missing.", {
        code: "CAPTCHA_MISCONFIGURED",
      });
    }
    return;
  }

  if (!token || !token.trim()) {
    throw new ApiError(400, "Captcha verification is required.", {
      code: "CAPTCHA_TOKEN_REQUIRED",
    });
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (ip) body.set("remoteip", ip);

  const verifyUrl =
    process.env.CAPTCHA_VERIFY_URL?.trim() ||
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";

  const response = await fetchWithTimeoutRetry(
    verifyUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    { retries: 1, timeoutMs: 7000 }
  );

  if (!response.ok) {
    throw new ApiError(502, "Captcha verification service is unavailable.", {
      code: "CAPTCHA_UPSTREAM_ERROR",
    });
  }

  const parsed = captchaVerifySchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError(502, "Invalid response from captcha service.", {
      code: "CAPTCHA_UPSTREAM_INVALID",
    });
  }

  const result = parsed.data;
  if (!result.success) {
    throw new ApiError(400, "Captcha verification failed.", {
      code: "CAPTCHA_FAILED",
      details: result["error-codes"] ?? [],
    });
  }

  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new ApiError(400, "Captcha action mismatch.", {
      code: "CAPTCHA_ACTION_MISMATCH",
    });
  }
}

