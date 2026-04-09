import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const constructEventMock = vi.fn();
const paymentLookupMock = vi.fn();
const paymentInsertMock = vi.fn();
const profileUpsertMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === "payments") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: paymentLookupMock,
        })),
      })),
      insert: paymentInsertMock,
    };
  }
  if (table === "profiles") {
    return {
      upsert: profileUpsertMock,
    };
  }
  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    webhooks = {
      constructEvent: constructEventMock,
    };
  },
}));

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("processes completed checkout sessions", async () => {
    paymentLookupMock.mockResolvedValue({ data: [], error: null });
    paymentInsertMock.mockResolvedValue({ error: null });
    profileUpsertMock.mockResolvedValue({ error: null });

    constructEventMock.mockReturnValue({
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          amount_total: 1500,
          currency: "cad",
          metadata: {
            userId: "11111111-1111-4111-8111-111111111111",
            type: "resume",
          },
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "test_signature" },
        body: "{}",
      }) as unknown as NextRequest
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.inserted).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(paymentInsertMock).toHaveBeenCalledTimes(1);
    expect(profileUpsertMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates already-processed checkout sessions", async () => {
    paymentLookupMock.mockResolvedValue({ data: [{ id: "existing-payment" }], error: null });
    paymentInsertMock.mockResolvedValue({ error: null });
    profileUpsertMock.mockResolvedValue({ error: null });

    constructEventMock.mockReturnValue({
      id: "evt_test_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_duplicate",
          amount_total: 1500,
          currency: "cad",
          metadata: {
            userId: "11111111-1111-4111-8111-111111111111",
            type: "resume",
          },
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "test_signature" },
        body: "{}",
      }) as unknown as NextRequest
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.inserted).toBe(false);
    expect(body.duplicate).toBe(true);
    expect(paymentInsertMock).not.toHaveBeenCalled();
    expect(profileUpsertMock).not.toHaveBeenCalled();
  });

  it("returns 400 when signature is invalid", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "bad_signature" },
        body: "{}",
      }) as unknown as NextRequest
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("INVALID_STRIPE_SIGNATURE");
  });
});
