import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

describe("POST /api/resume/analyze", () => {
  it("returns 400 for missing resumeUrl in JSON body", async () => {
    const { POST } = await import("@/app/api/resume/analyze/route");
    const req = new Request("http://localhost/api/resume/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_BODY");
  });
});

