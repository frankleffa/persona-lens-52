/**
 * UTM normalization, quality alerts, and derived metrics.
 */

import type { GA4UTMEntry } from "@/hooks/useAdsData";

// ─── Normalization Maps ─────────────────────────────────────────────────

const SOURCE_NORMALIZE: Record<string, string> = {
  fb: "facebook",
  ig: "instagram",
  meta: "meta",
  google: "google",
  bing: "bing",
  "": "(não identificado)",
  "(not set)": "(não identificado)",
  "(direct)": "(direto)",
};

const MEDIUM_NORMALIZE: Record<string, string> = {
  "": "(não identificado)",
  "(not set)": "(não identificado)",
  "(none)": "(nenhum)",
};

const META_SOURCES = new Set(["facebook", "fb", "ig", "instagram", "meta"]);

// ─── Types ──────────────────────────────────────────────────────────────

export interface NormalizedUTMEntry {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number;
  // Future expansion placeholders
  utmContent?: string;
  utmTerm?: string;
  cost?: number;
  cpa?: number;
  revenue?: number;
  roas?: number;
}

export interface ChannelSummary {
  source: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number;
}

export interface UTMQualityAlert {
  type: "numeric_campaign" | "inconsistent_medium" | "inconsistent_source" | "unidentified";
  message: string;
  count: number;
}

// ─── Normalization ──────────────────────────────────────────────────────

function normalizeSource(raw: string): string {
  const s = (raw || "").toLowerCase().trim();
  return SOURCE_NORMALIZE[s] ?? s;
}

function normalizeMedium(raw: string, rawSource: string): string {
  const m = (raw || "").toLowerCase().trim();
  const base = MEDIUM_NORMALIZE[m] ?? m;
  // If medium is generic "paid" and source is Meta family, refine it
  if (base === "paid" && META_SOURCES.has(rawSource.toLowerCase().trim())) {
    return "paid_social";
  }
  return base;
}

function normalizeCampaign(raw: string): string {
  const c = (raw || "").trim();
  if (!c || c === "(not set)" || c === "(not provided)") return "(não identificado)";
  return c;
}

function isNumericCampaign(campaign: string): boolean {
  return /^\d+$/.test(campaign.trim());
}

function calcRate(conversions: number, sessions: number): number {
  if (sessions === 0) return 0;
  return Math.round((conversions / sessions) * 10000) / 100;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function normalizeUTMData(data: GA4UTMEntry[]): NormalizedUTMEntry[] {
  return (data || []).map((row) => {
    const source = normalizeSource(row.source);
    const medium = normalizeMedium(row.medium, row.source);
    const campaign = normalizeCampaign(row.campaign);
    const displayCampaign = isNumericCampaign(row.campaign) ? `Campanha sem nome (${row.campaign})` : campaign;

    return {
      source,
      medium,
      campaign: displayCampaign,
      sessions: row.sessions,
      users: row.users,
      conversions: row.conversions,
      conversionRate: calcRate(row.conversions, row.sessions),
    };
  });
}

export function aggregateByChannel(data: NormalizedUTMEntry[]): ChannelSummary[] {
  const map = new Map<string, { sessions: number; users: number; conversions: number }>();
  for (const row of data) {
    const existing = map.get(row.source) || { sessions: 0, users: 0, conversions: 0 };
    existing.sessions += row.sessions;
    existing.users += row.users;
    existing.conversions += row.conversions;
    map.set(row.source, existing);
  }
  return Array.from(map.entries()).map(([source, v]) => ({
    source,
    ...v,
    conversionRate: calcRate(v.conversions, v.sessions),
  }));
}

export function detectQualityAlerts(raw: GA4UTMEntry[]): UTMQualityAlert[] {
  const alerts: UTMQualityAlert[] = [];

  const numericCampaigns = raw.filter((r) => isNumericCampaign(r.campaign));
  if (numericCampaigns.length > 0) {
    alerts.push({
      type: "numeric_campaign",
      message: `${numericCampaigns.length} campanha(s) com nome numérico (possível falta de UTM)`,
      count: numericCampaigns.length,
    });
  }

  const unidentified = raw.filter(
    (r) => !r.source || r.source === "(not set)" || !r.medium || r.medium === "(not set)"
  );
  if (unidentified.length > 0) {
    alerts.push({
      type: "unidentified",
      message: `${unidentified.length} registro(s) com source ou medium não identificado`,
      count: unidentified.length,
    });
  }

  // Check for inconsistent source variations (e.g. "fb" and "facebook" coexisting)
  const sources = new Set(raw.map((r) => (r.source || "").toLowerCase().trim()));
  const hasFbVariants = ["fb", "facebook"].filter((s) => sources.has(s));
  if (hasFbVariants.length > 1) {
    alerts.push({
      type: "inconsistent_source",
      message: `Variações inconsistentes de source: ${hasFbVariants.join(", ")}`,
      count: hasFbVariants.length,
    });
  }

  const hasIgVariants = ["ig", "instagram"].filter((s) => sources.has(s));
  if (hasIgVariants.length > 1) {
    alerts.push({
      type: "inconsistent_source",
      message: `Variações inconsistentes de source: ${hasIgVariants.join(", ")}`,
      count: hasIgVariants.length,
    });
  }

  return alerts;
}

export function getConversionRateTier(rate: number): "high" | "medium" | "low" {
  if (rate >= 5) return "high";
  if (rate >= 2) return "medium";
  return "low";
}
