import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

describe("POST /api/resume/generate", () => {
  it("returns PDF when skipRefinement is true", async () => {
    const { POST } = await import("@/app/api/resume/generate/route");
    const req = new Request("http://localhost/api/resume/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobType: "Retail",
        city: "Toronto",
        skipRefinement: true,
        parsedData: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "111-222-3333",
          summary: "Experienced retail associate with customer service strengths.",
          experience: ["Managed customer transactions and inventory checks."],
          skills: ["Customer Service", "POS"],
          education: ["High School Diploma"],
        },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });
});

