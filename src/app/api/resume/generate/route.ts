/**
 * Resume PDF generation — Mapleins ATS-optimised format.
 *
 * DATA FLOW:
 * 1. Dashboard: upload PDF → POST /api/resume/analyze → { name, email, phone, summary, experience, skills }
 * 2. Dashboard saves result to sessionStorage as "mapleinsResumeAnalysis"
 * 3. Resume-results page: "Download" POSTs here with body { jobType, city, parsedData }
 * 4. This route renders MapleinsResumePDF → returns PDF bytes
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import {
  getFallbackResume,
  extractFromText,
  mergeWithFallback,
  type ParsedResume,
  type ExperienceEntry,
  type SkillCategory,
} from "@/lib/resumeUtils";
import { callAI } from "@/lib/ai";
import {
  getCompetencyProfile,
  rerankBullets,
  getSeniorityTier,
  extractJDKeywords,
} from "@/lib/competencyProfiles";
import { extractTextFromPDFUrl } from "@/lib/pdfExtract";

// ─── Placeholder filter ───────────────────────────────────────────────────────

const PLACEHOLDER_STRINGS = [
  "not provided", "your name", "n/a", "none", "unknown",
  "your email", "your phone", "not available", "placeholder",
];

function isPlaceholder(val: string | undefined): boolean {
  if (!val?.trim()) return true;
  const lower = val.trim().toLowerCase();
  if (PLACEHOLDER_STRINGS.includes(lower)) return true;
  if (lower.includes("example.com")) return true;
  if (/^\+?1?[-.\s]?555/.test(lower)) return true;
  return false;
}

function cleanValue(val: string | undefined, fallback: string): string {
  return isPlaceholder(val) ? fallback : val!.trim();
}

// ─── Theme System ─────────────────────────────────────────────────────────────

export type ThemeName =
  // Colour-only variants (single-column layout)
  | "classic" | "navy" | "minimal" | "executive" | "modern"
  // Canadian layout variants
  | "federal" | "bay-street" | "vancouver" | "newcomer";

interface ThemeConfig {
  accent: string;
  dark: string;
  mid: string;
  light: string;
  background: string;
  chipBg: string;
  chipBorder: string;
  bulletChar: string;
  /** plain = coloured uppercase text; line = black text + underline; bar = left accent bar */
  sectionStyle: "plain" | "line" | "bar";
  /** layout determines which render component is used */
  layout: "single" | "sidebar" | "header-band";
}

const THEMES: Record<ThemeName, ThemeConfig> = {
  classic: {
    accent: "#166534", dark: "#111827", mid: "#374151", light: "#6b7280",
    background: "#ffffff", chipBg: "#f0fdf4", chipBorder: "#bbf7d0",
    bulletChar: "▸", sectionStyle: "plain", layout: "single",
  },
  navy: {
    accent: "#1e3a5f", dark: "#0f172a", mid: "#374151", light: "#64748b",
    background: "#ffffff", chipBg: "#eff6ff", chipBorder: "#bfdbfe",
    bulletChar: "▸", sectionStyle: "plain", layout: "single",
  },
  minimal: {
    accent: "#111827", dark: "#111827", mid: "#374151", light: "#6b7280",
    background: "#ffffff", chipBg: "#f9fafb", chipBorder: "#e5e7eb",
    bulletChar: "–", sectionStyle: "line", layout: "single",
  },
  executive: {
    accent: "#92400e", dark: "#1c1917", mid: "#44403c", light: "#78716c",
    background: "#fffbf7", chipBg: "#fffbeb", chipBorder: "#fde68a",
    bulletChar: "•", sectionStyle: "bar", layout: "single",
  },
  modern: {
    accent: "#0d9488", dark: "#0f172a", mid: "#334155", light: "#64748b",
    background: "#ffffff", chipBg: "#f0fdfa", chipBorder: "#99f6e4",
    bulletChar: "›", sectionStyle: "plain", layout: "single",
  },
  // ── Canadian layout themes ──────────────────────────────────────────────────
  federal: {
    // Government/healthcare: deep blue, clean underline headers, no chips
    accent: "#1d4ed8", dark: "#111827", mid: "#374151", light: "#6b7280",
    background: "#ffffff", chipBg: "#eff6ff", chipBorder: "#bfdbfe",
    bulletChar: "–", sectionStyle: "line", layout: "single",
  },
  "bay-street": {
    // Corporate finance: dark navy sidebar + white main panel
    accent: "#1e3a5f", dark: "#0f172a", mid: "#374151", light: "#64748b",
    background: "#ffffff", chipBg: "#eff6ff", chipBorder: "#bfdbfe",
    bulletChar: "▸", sectionStyle: "plain", layout: "sidebar",
  },
  vancouver: {
    // Tech/startup: cyan accent, left bar section headers, inline contact
    accent: "#0891b2", dark: "#0f172a", mid: "#334155", light: "#64748b",
    background: "#ffffff", chipBg: "#ecfeff", chipBorder: "#a5f3fc",
    bulletChar: "›", sectionStyle: "bar", layout: "single",
  },
  newcomer: {
    // Newcomer bold: full-width coloured header band
    accent: "#166534", dark: "#111827", mid: "#374151", light: "#6b7280",
    background: "#ffffff", chipBg: "#f0fdf4", chipBorder: "#bbf7d0",
    bulletChar: "▸", sectionStyle: "plain", layout: "header-band",
  },
};

function getThemeStyles(t: ThemeConfig) {
  return StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingBottom: 36,
      paddingHorizontal: 44,
      fontFamily: "Helvetica",
      backgroundColor: t.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    name: {
      fontSize: 22,
      fontFamily: "Helvetica-Bold",
      color: t.dark,
      letterSpacing: 0.3,
    },
    jobTitle: {
      fontSize: 10,
      color: t.accent,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 0.1,
      marginBottom: 3,
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 2,
    },
    contactText: { fontSize: 9, color: t.light },
    divider: {
      marginVertical: 6,
      height: 1,
      backgroundColor: "#e5e7eb",
    },
    section: { marginBottom: 8 },
    // "plain" style: coloured uppercase text (classic / navy)
    sectionTitle: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: t.sectionStyle === "plain" ? t.accent : t.dark,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: t.sectionStyle === "line" ? 2 : 4,
    },
    // "line" style underline (minimal)
    sectionUnderline: {
      height: 1,
      backgroundColor: t.accent,
      marginBottom: 4,
    },
    // "bar" style left accent bar (executive)
    sectionBarRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    sectionBar: {
      width: 3,
      height: 12,
      backgroundColor: t.accent,
      marginRight: 6,
      borderRadius: 1,
    },
    bodyText: { fontSize: 9.5, color: t.mid, lineHeight: 1.4 },
    roleHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 1,
    },
    roleTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: t.dark,
    },
    roleDates: {
      fontSize: 9,
      color: t.light,
      textAlign: "right",
    },
    roleCompany: {
      fontSize: 9.5,
      color: t.accent,
      marginBottom: 3,
    },
    roleEntry: { marginBottom: 8 },
    bulletRow: { flexDirection: "row", marginBottom: 3 },
    bulletDot: { fontSize: 9.5, color: t.accent, width: 12 },
    bulletText: { fontSize: 9.5, color: t.mid, flex: 1, lineHeight: 1.35 },
    skillsCategoryLabel: {
      fontSize: 8.5,
      fontFamily: "Helvetica-Bold",
      color: t.dark,
      marginBottom: 2,
      marginTop: 3,
    },
    skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    skillChip: {
      fontSize: 8.5,
      color: t.accent,
      backgroundColor: t.chipBg,
      borderColor: t.chipBorder,
      borderWidth: 1,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    footer: {
      position: "absolute",
      bottom: 16,
      left: 44,
      right: 44,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: { fontSize: 7.5, color: "#9ca3af" },
  });
}

// ─── Bay Street layout (dark navy sidebar + white main panel) ─────────────────

function BayStreetResumePDF({ parsed, jobType, city }: { parsed: ParsedResume; jobType: string; city: string }) {
  const SB = "#0f2342";           // sidebar background
  const SA = "#93c5fd";           // sidebar accent (light blue headings)
  const ST = "#e2e8f0";           // sidebar body text
  const MA = "#1e3a5f";           // main panel accent
  const MD = "#0f172a";           // main dark
  const MM = "#374151";           // main mid
  const ML = "#6b7280";           // main light

  const contactParts = [parsed.email, parsed.phone, city].filter(v => v && !isPlaceholder(v));
  const useRoleView = (parsed.experienceByRole?.length ?? 0) > 0;
  const hasBullets = useRoleView
    ? parsed.experienceByRole!.some(e => (e?.bullets?.length ?? 0) > 0)
    : parsed.experience.filter(Boolean).length > 0;

  const sbHeading = (label: string) => React.createElement(Text, {
    style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: SA, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6 },
  }, label);

  const mainHeading = (label: string) => React.createElement(View, {
    style: { borderBottomWidth: 1.5, borderBottomColor: MA, marginBottom: 8, paddingBottom: 3 },
  }, React.createElement(Text, {
    style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MA, letterSpacing: 1.2, textTransform: "uppercase" as const },
  }, label));

  // ── Sidebar children
  const sidebarChildren = [
    React.createElement(Text, { style: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 3, lineHeight: 1.2 } }, parsed.name),
    React.createElement(Text, { style: { fontSize: 9, color: SA, fontFamily: "Helvetica-Bold", marginBottom: 18 } }, jobType),

    sbHeading("Contact"),
    ...contactParts.map(p => React.createElement(Text, { key: p, style: { fontSize: 8, color: ST, marginBottom: 4, lineHeight: 1.4 } }, p)),

    parsed.skills.length > 0 ? React.createElement(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: SA, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6, marginTop: 18 } }, "Core Skills") : null,
    parsed.skills.length > 0 ? React.createElement(View, { style: { marginBottom: 4 } },
      ...parsed.skills.filter(Boolean).slice(0, 14).map((s, i) =>
        React.createElement(View, { key: i, style: { flexDirection: "row", marginBottom: 4 } },
          React.createElement(Text, { style: { color: SA, fontSize: 8, width: 10 } }, "▸"),
          React.createElement(Text, { style: { fontSize: 8, color: ST, flexShrink: 1, lineHeight: 1.3 } }, s)
        )
      )
    ) : null,

    parsed.education?.length > 0 && !isPlaceholder(parsed.education[0])
      ? React.createElement(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: SA, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6, marginTop: 18 } }, "Education")
      : null,
    parsed.education?.length > 0 && !isPlaceholder(parsed.education[0])
      ? React.createElement(View, null,
          ...parsed.education.filter(e => e && !isPlaceholder(e)).map((e, i) =>
            React.createElement(Text, { key: i, style: { fontSize: 8, color: ST, marginBottom: 4, lineHeight: 1.3 } }, e)
          )
        )
      : null,

    (parsed.certifications?.filter(c => c && !isPlaceholder(c)).length ?? 0) > 0
      ? React.createElement(Text, { style: { fontSize: 7, fontFamily: "Helvetica-Bold", color: SA, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6, marginTop: 18 } }, "Certifications")
      : null,
    (parsed.certifications?.filter(c => c && !isPlaceholder(c)).length ?? 0) > 0
      ? React.createElement(View, null,
          ...(parsed.certifications ?? []).filter(c => c && !isPlaceholder(c)).map((c, i) =>
            React.createElement(Text, { key: i, style: { fontSize: 8, color: ST, marginBottom: 4, lineHeight: 1.3 } }, c)
          )
        )
      : null,
  ].filter(Boolean) as React.ReactElement[];

  // ── Right panel children
  const rightChildren = [
    parsed.summary && !isPlaceholder(parsed.summary)
      ? React.createElement(View, { style: { marginBottom: 14 } },
          mainHeading("Professional Summary"),
          React.createElement(Text, { style: { fontSize: 9.5, color: MM, lineHeight: 1.5 } }, parsed.summary)
        )
      : null,
    hasBullets
      ? React.createElement(View, { style: { marginBottom: 14 } },
          mainHeading("Professional Experience"),
          ...(useRoleView
            ? parsed.experienceByRole!.filter(e => e?.role || (e?.bullets?.length ?? 0) > 0).map((entry, rIdx) =>
                React.createElement(View, { key: `r-${rIdx}`, style: { marginBottom: 8 } },
                  React.createElement(View, { wrap: false },
                    React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 } },
                      React.createElement(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: MD } }, entry.role || ""),
                      entry.dates ? React.createElement(Text, { style: { fontSize: 9, color: ML } }, entry.dates) : null
                    ),
                    entry.company ? React.createElement(Text, { style: { fontSize: 9.5, color: MA, marginBottom: 4 } }, entry.company) : null,
                  ),
                  ...(entry.bullets || []).filter(Boolean).slice(0, 8).map((b, bi) =>
                    React.createElement(View, { key: `b-${bi}`, style: { flexDirection: "row", marginBottom: 3 }, wrap: false },
                      React.createElement(Text, { style: { fontSize: 9.5, color: MA, width: 12 } }, "▸"),
                      React.createElement(Text, { style: { fontSize: 9.5, color: MM, flex: 1, lineHeight: 1.45 } }, b)
                    )
                  )
                )
              )
            : parsed.experience.filter(Boolean).slice(0, 20).map((e, i) =>
                React.createElement(View, { key: i, style: { flexDirection: "row", marginBottom: 3 } },
                  React.createElement(Text, { style: { fontSize: 9.5, color: MA, width: 12 } }, "▸"),
                  React.createElement(Text, { style: { fontSize: 9.5, color: MM, flex: 1, lineHeight: 1.45 } }, e)
                )
              )
          )
        )
      : null,
  ].filter(Boolean) as React.ReactElement[];

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: { fontFamily: "Helvetica", backgroundColor: "#ffffff", paddingTop: 36, paddingBottom: 44 } },
      // Fixed dark sidebar background — repeats on every page automatically
      React.createElement(View, {
        fixed: true,
        style: { position: "absolute", left: 0, top: 0, bottom: 0, width: 175, backgroundColor: SB },
      }),
      // Sidebar content — absolute positioned, only renders on page 1
      React.createElement(View, {
        style: { position: "absolute", left: 0, top: 0, width: 175, paddingHorizontal: 22, paddingTop: 36, paddingBottom: 60 },
      }, ...sidebarChildren),
      // Main content — flows naturally across pages, cleared from sidebar
      React.createElement(View, {
        style: { marginLeft: 175, paddingHorizontal: 28 },
      }, ...rightChildren),
      // Fixed footer — repeats on every page
      React.createElement(View, {
        fixed: true,
        style: { position: "absolute", bottom: 16, left: 22, right: 28, flexDirection: "row", justifyContent: "space-between" },
      },
        React.createElement(Text, { style: { fontSize: 7, color: "#4a6fa5" } }, "Generated by Mapleins.ca"),
        React.createElement(Text, { style: { fontSize: 7, color: ML } }, `Tailored for ${jobType} roles · ${city}`)
      )
    )
  );
}

// ─── Newcomer Bold layout (full-width coloured header band) ───────────────────

function NewcomerResumePDF({ parsed, jobType, city }: { parsed: ParsedResume; jobType: string; city: string }) {
  const BAND  = "#166534";
  const ACCENT = "#166534";
  const DARK   = "#111827";
  const MID    = "#374151";
  const LIGHT  = "#6b7280";

  const contactParts = [parsed.email, parsed.phone, city].filter(v => v && !isPlaceholder(v));
  const useRoleView = (parsed.experienceByRole?.length ?? 0) > 0;
  const hasBullets = useRoleView
    ? parsed.experienceByRole!.some(e => (e?.bullets?.length ?? 0) > 0)
    : parsed.experience.filter(Boolean).length > 0;

  const sectionHeading = (label: string) => React.createElement(View, {
    style: { backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: ACCENT },
  }, React.createElement(Text, {
    style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 1.2, textTransform: "uppercase" as const },
  }, label));

  const bodyChildren = [
    parsed.summary && !isPlaceholder(parsed.summary)
      ? React.createElement(View, { style: { marginBottom: 14 } },
          sectionHeading("Professional Summary"),
          React.createElement(Text, { style: { fontSize: 9.5, color: MID, lineHeight: 1.5 } }, parsed.summary)
        )
      : null,
    hasBullets
      ? React.createElement(View, { style: { marginBottom: 14 } },
          sectionHeading("Professional Experience"),
          ...(useRoleView
            ? parsed.experienceByRole!.filter(e => e?.role || (e?.bullets?.length ?? 0) > 0).map((entry, rIdx) =>
                React.createElement(View, { key: `r-${rIdx}`, style: { marginBottom: 8 } },
                  React.createElement(View, { wrap: false },
                    React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 } },
                      React.createElement(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK } }, entry.role || ""),
                      entry.dates ? React.createElement(Text, { style: { fontSize: 9, color: LIGHT } }, entry.dates) : null
                    ),
                    entry.company ? React.createElement(Text, { style: { fontSize: 9.5, color: ACCENT, marginBottom: 4 } }, entry.company) : null,
                  ),
                  ...(entry.bullets || []).filter(Boolean).slice(0, 8).map((b, bi) =>
                    React.createElement(View, { key: `b-${bi}`, style: { flexDirection: "row", marginBottom: 3 }, wrap: false },
                      React.createElement(Text, { style: { fontSize: 9.5, color: ACCENT, width: 12 } }, "▸"),
                      React.createElement(Text, { style: { fontSize: 9.5, color: MID, flex: 1, lineHeight: 1.45 } }, b)
                    )
                  )
                )
              )
            : parsed.experience.filter(Boolean).slice(0, 20).map((e, i) =>
                React.createElement(View, { key: i, style: { flexDirection: "row", marginBottom: 3 } },
                  React.createElement(Text, { style: { fontSize: 9.5, color: ACCENT, width: 12 } }, "▸"),
                  React.createElement(Text, { style: { fontSize: 9.5, color: MID, flex: 1, lineHeight: 1.45 } }, e)
                )
              )
          )
        )
      : null,
    parsed.skills.length > 0
      ? React.createElement(View, { style: { marginBottom: 14 } },
          sectionHeading("Core Competencies"),
          React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 5 } },
            ...parsed.skills.filter(Boolean).slice(0, 16).map((s, i) =>
              React.createElement(Text, { key: i, style: { fontSize: 8.5, color: ACCENT, backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 } }, s)
            )
          )
        )
      : null,
    parsed.education?.length > 0 && !isPlaceholder(parsed.education[0])
      ? React.createElement(View, { style: { marginBottom: 14 } },
          sectionHeading("Education"),
          ...parsed.education.filter(e => e && !isPlaceholder(e)).map((e, i) =>
            React.createElement(View, { key: i, style: { flexDirection: "row", marginBottom: 3 }, wrap: false },
              React.createElement(Text, { style: { fontSize: 9.5, color: ACCENT, width: 12 } }, "▸"),
              React.createElement(Text, { style: { fontSize: 9.5, color: MID, flex: 1 } }, e)
            )
          )
        )
      : null,
    (parsed.certifications?.filter(c => c && !isPlaceholder(c)).length ?? 0) > 0
      ? React.createElement(View, { style: { marginBottom: 14 } },
          sectionHeading("Certifications"),
          ...(parsed.certifications ?? []).filter(c => c && !isPlaceholder(c)).map((c, i) =>
            React.createElement(View, { key: i, style: { flexDirection: "row", marginBottom: 3 }, wrap: false },
              React.createElement(Text, { style: { fontSize: 9.5, color: ACCENT, width: 12 } }, "▸"),
              React.createElement(Text, { style: { fontSize: 9.5, color: MID, flex: 1 } }, c)
            )
          )
        )
      : null,
  ].filter(Boolean) as React.ReactElement[];

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: { fontFamily: "Helvetica", backgroundColor: "#ffffff" } },
      React.createElement(View, { style: { backgroundColor: BAND, paddingHorizontal: 48, paddingTop: 32, paddingBottom: 24 } },
        React.createElement(Text, { style: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 0.3, marginBottom: 4 } }, parsed.name),
        React.createElement(Text, { style: { fontSize: 10, color: "#bbf7d0", fontFamily: "Helvetica-Bold", marginBottom: 10 } }, jobType),
        contactParts.length > 0
          ? React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 16 } },
              ...contactParts.map(p => React.createElement(Text, { key: p, style: { fontSize: 9, color: "#d1fae5" } }, p))
            )
          : null
      ),
      React.createElement(View, { style: { paddingHorizontal: 48, paddingTop: 24, paddingBottom: 60 } }, ...bodyChildren),
      React.createElement(View, { style: { position: "absolute", bottom: 18, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" } },
        React.createElement(Text, { style: { fontSize: 7.5, color: "#9ca3af" } }, "Generated by Mapleins.ca"),
        React.createElement(Text, { style: { fontSize: 7.5, color: "#9ca3af" } }, `Tailored for ${jobType} roles · ${city}`)
      )
    )
  );
}

// ─── PDF Component ────────────────────────────────────────────────────────────

function MapleinsResumePDF({
  parsed,
  jobType,
  city,
  theme = "classic",
}: {
  parsed: ParsedResume;
  jobType: string;
  city: string;
  theme?: ThemeName;
}) {
  // Dispatch to dedicated layout components
  if (theme === "bay-street") return BayStreetResumePDF({ parsed, jobType, city });
  if (theme === "newcomer") return NewcomerResumePDF({ parsed, jobType, city });

  const themeConfig = THEMES[theme];
  const styles = getThemeStyles(themeConfig);

  // Renders a section heading according to the theme's sectionStyle
  function sectionHeading(label: string): React.ReactElement {
    if (themeConfig.sectionStyle === "bar") {
      return React.createElement(
        View,
        { style: styles.sectionBarRow },
        React.createElement(View, { style: styles.sectionBar }),
        React.createElement(Text, { style: styles.sectionTitle }, label)
      );
    }
    if (themeConfig.sectionStyle === "line") {
      return React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.sectionTitle }, label),
        React.createElement(View, { style: styles.sectionUnderline })
      );
    }
    // "plain" — coloured uppercase text (classic / navy)
    return React.createElement(Text, { style: styles.sectionTitle }, label);
  }

  const contactParts = [parsed.email, parsed.phone, city].filter(
    (v) => v && !isPlaceholder(v)
  );

  const hasCategories =
    (parsed.skillCategories?.length ?? 0) > 0 &&
    parsed.skillCategories!.some((c) => c.skills.length > 0);

  // Use experienceByRole if available, otherwise fall back to flat experience list
  const useRoleView = (parsed.experienceByRole?.length ?? 0) > 0;
  const hasBullets = useRoleView
    ? parsed.experienceByRole!.some((e) => (e?.bullets?.length ?? 0) > 0)
    : parsed.experience.filter(Boolean).length > 0;

  // Build page children as an array and filter out null/undefined/false
  // @react-pdf/renderer does NOT handle boolean false as a child — must filter explicitly
  const pageChildren = [
    // ── Header
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(Text, { style: styles.name }, parsed.name)
    ),
    React.createElement(Text, { style: styles.jobTitle }, jobType),
    contactParts.length > 0
      ? React.createElement(
          View,
          { style: styles.contactRow },
          ...contactParts.map((part) =>
            React.createElement(Text, { key: part, style: styles.contactText }, part)
          )
        )
      : null,

    // ── Divider
    React.createElement(View, { style: styles.divider }),

    // ── Professional Summary
    parsed.summary && !isPlaceholder(parsed.summary)
      ? React.createElement(
          View,
          { style: styles.section },
          sectionHeading("Professional Summary"),
          React.createElement(Text, { style: styles.bodyText }, parsed.summary)
        )
      : null,

    // ── Professional Experience
    hasBullets
      ? React.createElement(
          View,
          { style: styles.section },
          sectionHeading("Professional Experience"),
          ...(useRoleView
            ? parsed.experienceByRole!
                .filter((e) => e?.role || (e?.bullets?.length ?? 0) > 0)
                .map((entry, roleIdx) =>
                  React.createElement(
                    View,
                    { key: `role-${roleIdx}`, style: styles.roleEntry },
                    React.createElement(View, { wrap: false },
                      React.createElement(
                        View,
                        { style: styles.roleHeaderRow },
                        React.createElement(Text, { style: styles.roleTitle }, entry.role || ""),
                        entry.dates
                          ? React.createElement(Text, { style: styles.roleDates }, entry.dates)
                          : null
                      ),
                      entry.company
                        ? React.createElement(Text, { style: styles.roleCompany }, entry.company)
                        : null,
                    ),
                    ...(entry.bullets || [])
                      .filter(Boolean)
                      .slice(0, 12)
                      .map((bullet, bi) =>
                        React.createElement(
                          View,
                          { key: `b-${bi}`, style: styles.bulletRow, wrap: false },
                          React.createElement(Text, { style: styles.bulletDot }, themeConfig.bulletChar),
                          React.createElement(Text, { style: styles.bulletText }, bullet)
                        )
                      )
                  )
                )
            : parsed.experience
                .filter(Boolean)
                .slice(0, 20)
                .map((exp, i) =>
                  React.createElement(
                    View,
                    { key: i, style: styles.bulletRow },
                    React.createElement(Text, { style: styles.bulletDot }, themeConfig.bulletChar),
                    React.createElement(Text, { style: styles.bulletText }, exp)
                  )
                ))
        )
      : null,

    // ── Core Competencies
    hasCategories || parsed.skills.length > 0
      ? React.createElement(
          View,
          { style: styles.section },
          sectionHeading("Core Competencies"),
          ...(hasCategories
            ? parsed.skillCategories!
                .filter((cat) => cat.skills.length > 0)
                .flatMap((cat, ci) => [
                  React.createElement(
                    Text,
                    { key: `cat-${ci}`, style: styles.skillsCategoryLabel },
                    cat.category
                  ),
                  React.createElement(
                    View,
                    { key: `chips-${ci}`, style: { ...styles.skillsRow, marginBottom: 6 } },
                    ...cat.skills
                      .filter(Boolean)
                      .slice(0, 10)
                      .map((skill, si) =>
                        React.createElement(Text, { key: si, style: styles.skillChip }, skill)
                      )
                  ),
                ])
            : [
                React.createElement(
                  View,
                  { key: "flat", style: styles.skillsRow },
                  ...parsed.skills
                    .filter(Boolean)
                    .slice(0, 16)
                    .map((skill, i) =>
                      React.createElement(Text, { key: i, style: styles.skillChip }, skill)
                    )
                ),
              ])
        )
      : null,

    // ── Education
    parsed.education?.length > 0 && !isPlaceholder(parsed.education[0])
      ? React.createElement(
          View,
          { style: styles.section },
          sectionHeading("Education"),
          ...parsed.education
            .filter((e) => e && !isPlaceholder(e))
            .map((edu, i) =>
              React.createElement(
                View,
                { key: i, style: styles.bulletRow, wrap: false },
                React.createElement(Text, { style: styles.bulletDot }, themeConfig.bulletChar),
                React.createElement(Text, { style: styles.bulletText }, edu)
              )
            )
        )
      : null,

    // ── Certifications
    (parsed.certifications?.length ?? 0) > 0 &&
    !(parsed.certifications ?? []).every((c) => !c || isPlaceholder(c))
      ? React.createElement(
          View,
          { style: styles.section },
          sectionHeading("Certifications"),
          ...(parsed.certifications ?? [])
            .filter((c) => c && !isPlaceholder(c))
            .map((cert, i) =>
              React.createElement(
                View,
                { key: i, style: styles.bulletRow, wrap: false },
                React.createElement(Text, { style: styles.bulletDot }, themeConfig.bulletChar),
                React.createElement(Text, { style: styles.bulletText }, cert)
              )
            )
        )
      : null,

    // ── Footer
    React.createElement(
      View,
      { style: styles.footer },
      React.createElement(Text, { style: styles.footerText }, "Generated by Mapleins.ca"),
      React.createElement(
        Text,
        { style: styles.footerText },
        `Tailored for ${jobType} roles · ${city}`
      )
    ),
  ].filter(Boolean) as React.ReactElement[];

  return React.createElement(
    Document,
    null,
    React.createElement(Page, { size: "A4", style: styles.page }, ...pageChildren)
  );
}

// ─── Merge helpers ────────────────────────────────────────────────────────────

async function fetchAndParseResume(resumeUrl: string): Promise<string> {
  return extractTextFromPDFUrl(resumeUrl);
}

function buildParsedResume(
  ai: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    experience?: string[];
    experienceByRole?: ExperienceEntry[];
    skillCategories?: SkillCategory[];
    skills?: string[];
    education?: string[];
    certifications?: string[];
    yearsOfExperience?: number;
  },
  fallback: ParsedResume
): ParsedResume {
  // For name: use whatever the user's resume produced (even "Your Name" — it's their data).
  // Only fall back to the generic default if the field is completely blank.
  const name = ai.name?.trim() || fallback.name;

  return {
    name,
    email: cleanValue(ai.email, fallback.email),
    phone: cleanValue(ai.phone, fallback.phone),
    summary: cleanValue(ai.summary, fallback.summary),
    experience: ai.experience?.filter(Boolean).length
      ? ai.experience.filter(Boolean)
      : fallback.experience,
    experienceByRole: ai.experienceByRole?.length ? ai.experienceByRole : fallback.experienceByRole,
    skillCategories: ai.skillCategories?.length ? ai.skillCategories : fallback.skillCategories,
    skills: ai.skills?.filter(Boolean).length ? ai.skills.filter(Boolean) : fallback.skills,
    education: ai.education?.filter(Boolean).length
      ? ai.education.filter(Boolean)
      : fallback.education,
    certifications: ai.certifications?.filter(Boolean).length
      ? ai.certifications.filter(Boolean)
      : fallback.certifications,
    yearsOfExperience: ai.yearsOfExperience ?? 0,
  };
}

// ─── Pre-processing: bullet re-ranking + seniority prep ───────────────────────

function applyCompetencyEnhancements(
  parsed: ParsedResume,
  jobType: string
): ParsedResume {
  const profile = getCompetencyProfile(jobType);
  if (!profile || !parsed.experienceByRole?.length) return parsed;

  const reranked = parsed.experienceByRole.map((entry) => ({
    ...entry,
    bullets: rerankBullets(entry.bullets, profile),
  }));

  return { ...parsed, experienceByRole: reranked };
}

// ─── AI Refinement ────────────────────────────────────────────────────────────

const WEAK_PHRASES = [
  "responsible for", "helped with", "assisted in", "worked on",
  "participated in", "involved in", "duties included", "tasks included",
  "was part of", "supported the team",
];

type ResumeVersion = "ats" | "leadership" | "concise";

async function refineResumeForATS(
  parsed: ParsedResume,
  jobType: string,
  city: string,
  version: ResumeVersion = "ats",
  jobDescriptionKeywords: string[] = []
): Promise<ParsedResume> {
  const years = parsed.yearsOfExperience ?? 0;
  const tier = getSeniorityTier(years);

  const seniorityInstruction =
    tier === "entry"
      ? `The candidate is early-career (${years} yrs). Use action verbs like: Assisted, Supported, Coordinated, Processed, Achieved. Focus on accuracy, learning, and volume.`
      : tier === "mid"
      ? `The candidate is mid-career (${years} yrs). Use action verbs like: Managed, Delivered, Improved, Led, Developed, Implemented. Focus on team ownership and measurable results.`
      : `The candidate is senior (${years}+ yrs). Use executive verbs like: Directed, Oversaw, Drove, Transformed, Owned, Scaled, Built. Focus on P&L, leadership scope, and business transformation.`;

  const versionInstruction =
    version === "leadership"
      ? `VERSION: Leadership-Focused. Emphasise team size, budget ownership, stakeholder management, and strategic decisions. Use executive language throughout. For the summary, lead with leadership scope.`
      : version === "concise"
      ? `VERSION: Concise 1-Page. Use maximum 3 bullets per role. Summary must be exactly 2 sentences. Skills: max 10 total. Keep everything tight.`
      : `VERSION: ATS Optimised. Maximise keyword density for "${jobType}" roles. Include all technical skills, tools, and certifications. Use industry-standard terminology throughout.`;

  const kwInstruction =
    jobDescriptionKeywords.length > 0
      ? `KEYWORD INJECTION: The hiring manager's job description uses these key terms — naturally weave as many as possible into the summary, bullets, and skills (do NOT keyword-stuff, maintain readability): ${jobDescriptionKeywords.join(", ")}.`
      : "";

  const experienceByRoleForAI =
    parsed.experienceByRole?.length
      ? parsed.experienceByRole
      : [{ role: "", company: "", bullets: parsed.experience.filter(Boolean) }];

  const resumeForAI = {
    summary: parsed.summary,
    experienceByRole: experienceByRoleForAI,
    skills: parsed.skills,
    education: parsed.education,
  };

  const systemPrompt = `You are a senior Canadian resume writer. Rewrite this resume for "${jobType}" roles in ${city}, Canada.

${versionInstruction}

${seniorityInstruction}

${kwInstruction}

━━━ PROFESSIONAL SUMMARY ━━━
Write 4–5 sentences — no filler, no clichés:
• Sentence 1: ${years > 0 ? years : "Several"} years of [specialisation] experience, targeting "${jobType}" roles.
• Sentence 2: Include 1–2 specific, measurable achievements (team size, revenue, %, $ budget).
• Sentence 3: Value you bring to a ${city} employer — sector insight, leadership scope, or domain expertise.
• Sentences 4–5: Briefly mention 2–3 core strengths or domains (tools, industries, leadership scope) that matter for "${jobType}" in ${city}.
BANNED: "passionate", "results-oriented", "dynamic", "team player", "hardworking", "dedicated", "seeking opportunities".

━━━ EXPERIENCE BULLETS ━━━
1. Start EVERY bullet with a strong past-tense action verb.
2. NEVER use: ${WEAK_PHRASES.map((p) => `"${p}"`).join(", ")}.
3. Target 5–8 bullets per role. When the original role has 5+ bullets, you MUST return at least 5 improved bullets for that role (never collapse a detailed role down to only 1–2 bullets).
4. AT LEAST 2 of the bullets for each role must include hard numbers (team size, %, $, volume, timeframe).
   Formula: Action Verb + Scope + Result + Metric (+ Timeframe if available)
   Examples:
   • "Managed a team of 14 across 3 store departments, exceeding sales targets by 22% in Q4."
   • "Streamlined inbound logistics process, reducing receiving errors by 38% over 6 months."
   • "Coordinated 180+ daily deliveries across GTA, maintaining 97% on-time rate."
5. Add KPI/ownership language: "P&L ownership", "budget accountability of $X", "reporting to Director".
6. Bullet = 1 sentence, under 25 words. Specific beats vague.
7. If no numbers exist in original: estimate realistic ones based on typical company size and role. DO NOT invent employers, titles, or dates.

━━━ CREDIBILITY CHECK ━━━
Before including any achievement, verify:
- Revenue claims over $10M: add "annualised" or "cumulative" qualifier
- Team sizes over 50: add department or division context
- % improvements over 60%: add timeframe and baseline context
If a claim seems extreme and unverifiable, soften it with a qualifier, don't remove it.

━━━ SKILLS (STRATEGIC CATEGORIES) ━━━
Group into exactly 4 named categories. Most "${jobType}"-relevant categories first. Max 8 skills each. Each skill must appear in ONLY ONE category — no duplicates across categories. Remove filler ("hard-working", "fast learner"):
- "Leadership & Management"
- "Technical & Domain Skills"
- "Operations & Process"
- "Communication & Interpersonal"

━━━ EXPERIENCE STRUCTURE ━━━
For EVERY role in experienceByRole, you MUST return ALL three fields:
- "role": copy EXACTLY from input — never rename or invent titles
- "company": copy EXACTLY from input — never rename, leave blank, or invent employers
- "dates": copy EXACTLY from input — never change dates
Only the "bullets" array may be rewritten.

━━━ EDUCATION ━━━
Return EXACTLY as provided — zero changes.

Return ONLY valid JSON. No markdown:
{
  "summary": "3 sentences, numbers included",
  "experienceByRole": [
    { "role": "Title", "company": "Company", "dates": "Month Year – Month Year",
      "bullets": ["Action verb bullet with metric", "Action verb bullet with metric"] }
  ],
  "skillCategories": [
    { "category": "Leadership & Management", "skills": ["skill1"] },
    { "category": "Technical & Domain Skills", "skills": ["skill1"] },
    { "category": "Operations & Process", "skills": ["skill1"] },
    { "category": "Communication & Interpersonal", "skills": ["skill1"] }
  ],
  "skills": ["flat list, most relevant first"],
  "education": ["unchanged"]
}`;

  const userPrompt = `Rewrite for ${jobType} in ${city}, Canada.\nIMPORTANT: The JSON below is the ONLY source of truth. Copy every "role", "company", and "dates" field EXACTLY — do not rename, merge, omit, or leave blank.\n\n${JSON.stringify(resumeForAI)}`;

  try {
    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let raw = content.trim();
    raw = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    // AI may return "Here is the JSON:" or similar — extract the JSON object
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    const json = JSON.parse(raw) as {
      summary?: string;
      experienceByRole?: ExperienceEntry[];
      skillCategories?: SkillCategory[];
      skills?: string[];
      education?: string[];
    };

    const flatSkills =
      json.skillCategories?.flatMap((c) => c.skills) ??
      (json.skills?.length ? json.skills : parsed.skills);

    // Merge AI-rewritten bullets back onto ORIGINAL role/company/dates metadata.
    // The AI is only trusted to improve bullet text — never to rename or drop employers.
    const originalRoles = parsed.experienceByRole ?? [];
    const aiRoles = json.experienceByRole ?? [];

    const MIN_BULLETS_PER_ROLE = 5;
    const MAX_BULLETS_PER_ROLE = 8;

    const mergedByRole: ExperienceEntry[] = aiRoles.map((aiEntry, idx) => {
      const original = originalRoles[idx];
      const originalBullets = (original?.bullets ?? []).filter(Boolean);

      // Safety: if the AI swapped or hallucinated a company name, its bullets are for the wrong
      // role — discard them and fall back to the original bullets for this slot.
      const aiCompany = (aiEntry.company ?? "").trim().toLowerCase();
      const origCompany = (original?.company ?? "").trim().toLowerCase();
      const companyMismatch =
        origCompany.length > 0 &&
        aiCompany.length > 0 &&
        !aiCompany.includes(origCompany.slice(0, 6)) &&
        !origCompany.includes(aiCompany.slice(0, 6));

      const aiBullets = companyMismatch
        ? [] // treat as if AI returned nothing — will fall back to originals below
        : (aiEntry.bullets ?? []).filter(Boolean);

      let bullets = aiBullets;

      // If the original role had 5+ bullets, we want to keep that richness.
      if (originalBullets.length >= MIN_BULLETS_PER_ROLE) {
        if (aiBullets.length === 0) {
          // AI failed to return bullets — fall back to original, capped at MAX_BULLETS_PER_ROLE
          bullets = originalBullets.slice(0, MAX_BULLETS_PER_ROLE);
        } else if (aiBullets.length < MIN_BULLETS_PER_ROLE) {
          // AI returned too few — top up with originals, but only non-duplicate ones
          const combined = [...aiBullets];
          for (const b of originalBullets) {
            if (combined.length >= MIN_BULLETS_PER_ROLE) break;
            if (!combined.includes(b)) combined.push(b);
          }
          bullets = combined.slice(0, MAX_BULLETS_PER_ROLE);
        } else {
          // AI returned enough bullets — use them directly, no originals appended
          bullets = aiBullets.slice(0, MAX_BULLETS_PER_ROLE);
        }
      } else if (aiBullets.length < MIN_BULLETS_PER_ROLE && originalBullets.length > aiBullets.length) {
        // Original had fewer than 5, but still more than AI: gently top up from original
        const target = Math.min(MIN_BULLETS_PER_ROLE, originalBullets.length);
        const combined = [...aiBullets];
        for (const b of originalBullets) {
          if (combined.length >= target) break;
          if (!combined.includes(b)) combined.push(b);
        }
        bullets = combined;
      }

      return {
        role:    original?.role    || aiEntry.role    || "",
        company: original?.company || aiEntry.company || "",
        dates:   original?.dates   || aiEntry.dates   || "",
        bullets,
      };
    });
    // If AI returned fewer roles than original, append remaining originals
    if (originalRoles.length > aiRoles.length) {
      for (let i = aiRoles.length; i < originalRoles.length; i++) {
        mergedByRole.push(originalRoles[i]);
      }
    }

    const refined: ParsedResume = {
      name:             parsed.name,
      email:            parsed.email,
      phone:            parsed.phone,
      summary:          json.summary?.trim() || parsed.summary,
      experience:       mergedByRole.flatMap((e) => e.bullets),
      experienceByRole: mergedByRole.length ? mergedByRole : parsed.experienceByRole,
      skillCategories:  json.skillCategories?.length ? json.skillCategories : parsed.skillCategories,
      skills:           flatSkills.filter(Boolean),
      education:        json.education?.length ? json.education : parsed.education,
      certifications:   parsed.certifications?.length ? parsed.certifications : undefined,
      yearsOfExperience: parsed.yearsOfExperience,
    };

    if (!refined.experienceByRole?.length && refined.experience.length > 0) {
      refined.experienceByRole = [{ role: "", company: "", bullets: refined.experience }];
    }

    return refined;
  } catch (err) {
    console.warn("AI refinement failed, using original content:", err);
    return parsed;
  }
}

async function buildPdfResponse(
  parsed: ParsedResume,
  jobType: string,
  city: string,
  filename = "Mapleins-Resume.pdf",
  theme: ThemeName = "classic"
) {
  const doc = MapleinsResumePDF({ parsed, jobType, city, theme });
  const stream = await renderToStream(doc);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobType = searchParams.get("jobType") || "Retail";
  const city = searchParams.get("city") || "Toronto";
  const resumeUrl = searchParams.get("resumeUrl") || "";
  const theme = (searchParams.get("theme") || "classic") as ThemeName;

  let parsed: ParsedResume = getFallbackResume(jobType, city);

  if (resumeUrl) {
    try {
      const rawText = await fetchAndParseResume(resumeUrl);
      if (rawText?.trim()) {
        const extracted = extractFromText(rawText);
        parsed = mergeWithFallback(extracted, getFallbackResume(jobType, city));
      }
    } catch (err) {
      console.error("Resume parse error:", err);
    }
  }

  const enhanced = applyCompetencyEnhancements(parsed, jobType);
  const refined = await refineResumeForATS(enhanced, jobType, city);
  return buildPdfResponse(refined, jobType, city, undefined, theme);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobType, city, parsedData, version, jobDescription, skipRefinement, theme } = body as {
      jobType?: string;
      city?: string;
      version?: ResumeVersion;
      theme?: ThemeName;
      jobDescription?: string;
      skipRefinement?: boolean;
      parsedData?: {
        name?: string;
        email?: string;
        phone?: string;
        summary?: string;
        experience?: string[];
        experienceByRole?: ExperienceEntry[];
        skillCategories?: SkillCategory[];
        skills?: string[];
        certifications?: string[];
        education?: string[];
        yearsOfExperience?: number;
      };
    };

    const jt = jobType || "Retail";
    const c = city || "Toronto";
    const v: ResumeVersion = version || "ats";
    const t: ThemeName = theme || "classic";
    const jdKeywords = jobDescription ? extractJDKeywords(jobDescription) : [];

    const fallback = getFallbackResume(jt, c);
    const parsed = parsedData ? buildParsedResume(parsedData, fallback) : fallback;

    // When skipRefinement is true (e.g. from Live Editor), use content as-is so the PDF matches what the user saved
    if (skipRefinement) {
      return buildPdfResponse(parsed, jt, c, "Mapleins-Resume.pdf", t);
    }

    // Apply pre-processing: re-rank bullets by relevance to target role
    const enhanced = applyCompetencyEnhancements(parsed, jt);

    // AI refinement with version + JD keyword injection
    const refined = await refineResumeForATS(enhanced, jt, c, v, jdKeywords);

    const versionLabel =
      v === "leadership" ? "Leadership" : v === "concise" ? "Concise" : "ATS";
    const themeLabel = t !== "classic" ? `-${t.charAt(0).toUpperCase() + t.slice(1)}` : "";
    const filename = `Mapleins-Resume-${versionLabel}${themeLabel}.pdf`;

    return buildPdfResponse(refined, jt, c, filename, t);
  } catch (err) {
    console.error("Generate POST error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
