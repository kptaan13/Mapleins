import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const signOutMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}));

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it("redirects to home when signout succeeds", async () => {
    signOutMock.mockResolvedValue({ error: null });
    const { POST } = await import("@/app/api/auth/signout/route");

    const res = await POST(
      new Request("http://localhost/api/auth/signout", { method: "POST" }) as unknown as NextRequest
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("returns server error when signout fails", async () => {
    signOutMock.mockResolvedValue({ error: { message: "boom" } });
    const { POST } = await import("@/app/api/auth/signout/route");

    const res = await POST(
      new Request("http://localhost/api/auth/signout", { method: "POST" }) as unknown as NextRequest
    );
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe("SIGNOUT_FAILED");
  });
});

