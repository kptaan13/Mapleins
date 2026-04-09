import { lookup } from "dns/promises";
import net from "net";
import { ApiError } from "@/lib/api/error";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return false;
}

function getAllowedResumeHosts(): string[] {
  const fromEnv =
    process.env.ALLOWED_RESUME_FETCH_HOSTS
      ?.split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean) ?? [];

  const supabaseHost = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return url ? new URL(url).hostname.toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  return Array.from(new Set([...fromEnv, ...(supabaseHost ? [supabaseHost] : [])]));
}

function isHostAllowed(hostname: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return true;
  const host = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    if (entry.startsWith("*.")) {
      const domain = entry.slice(2);
      return host === domain || host.endsWith(`.${domain}`);
    }
    return host === entry;
  });
}

export async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ApiError(400, "Invalid resume URL.", { code: "INVALID_RESUME_URL" });
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:") {
    throw new ApiError(400, "Only HTTPS resume URLs are allowed.", {
      code: "UNSAFE_RESUME_URL_PROTOCOL",
    });
  }

  if (parsed.username || parsed.password) {
    throw new ApiError(400, "Resume URL must not include credentials.", {
      code: "UNSAFE_RESUME_URL_CREDENTIALS",
    });
  }

  const host = parsed.hostname.toLowerCase();
  const allowedHosts = getAllowedResumeHosts();
  if (!isHostAllowed(host, allowedHosts)) {
    throw new ApiError(400, "Resume URL host is not allowed.", {
      code: "UNSAFE_RESUME_URL_HOST",
      details: { host },
    });
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    throw new ApiError(400, "Private/internal resume URL hosts are not allowed.", {
      code: "UNSAFE_RESUME_URL_PRIVATE_IP",
    });
  }

  try {
    const addresses = await lookup(host, { all: true });
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new ApiError(400, "Private/internal resume URL hosts are not allowed.", {
        code: "UNSAFE_RESUME_URL_PRIVATE_DNS",
      });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Could not validate resume URL host.", {
      code: "UNSAFE_RESUME_URL_DNS",
    });
  }

  return parsed;
}

