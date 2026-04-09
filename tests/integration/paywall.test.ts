import { describe, expect, it } from "vitest";
import { shouldShowPaywall } from "@/lib/paywall";

describe("paywall decision", () => {
  it("shows paywall when limit reached and no bypass", () => {
    expect(
      shouldShowPaywall({
        freeDownloadCount: 3,
        freeDownloadLimit: 3,
        hasPromoTrial: false,
        isUnlimited: false,
      })
    ).toBe(true);
  });

  it("does not show paywall during promo trial", () => {
    expect(
      shouldShowPaywall({
        freeDownloadCount: 100,
        freeDownloadLimit: 3,
        hasPromoTrial: true,
        isUnlimited: false,
      })
    ).toBe(false);
  });

  it("does not show paywall for unlimited users", () => {
    expect(
      shouldShowPaywall({
        freeDownloadCount: 100,
        freeDownloadLimit: 3,
        hasPromoTrial: false,
        isUnlimited: true,
      })
    ).toBe(false);
  });
});

