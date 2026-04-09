export type PaywallDecisionInput = {
  freeDownloadCount: number;
  freeDownloadLimit: number;
  hasPromoTrial: boolean;
  isUnlimited: boolean;
};

export function shouldShowPaywall(input: PaywallDecisionInput): boolean {
  if (input.isUnlimited) return false;
  if (input.hasPromoTrial) return false;
  return input.freeDownloadCount >= input.freeDownloadLimit;
}

