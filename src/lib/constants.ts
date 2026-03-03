export const JOB_TYPES = [
  "Warehouse",
  "Trucking",
  "Retail",
  "IT",
  "Healthcare",
] as const;

export const CITIES = [
  "Prince Albert",
  "Saskatoon",
  "Toronto",
  "Vancouver",
] as const;

export const IMMIGRATION_STATUSES = [
  "Work Permit",
  "PR / Citizen",
  "Student Visa",
  "Open Work Permit",
  "Other",
] as const;

/** Stripe Payment Link for donations (customer chooses amount). Set in env as NEXT_PUBLIC_STRIPE_DONATION_LINK. */
export const STRIPE_DONATION_LINK =
  typeof process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK === "string" &&
  process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK.trim() !== ""
    ? process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK.trim()
    : null;

export const WAITLIST_ONLY =
  typeof process.env.NEXT_PUBLIC_WAITLIST_ONLY === "string" &&
  process.env.NEXT_PUBLIC_WAITLIST_ONLY.trim().toLowerCase() === "true";
