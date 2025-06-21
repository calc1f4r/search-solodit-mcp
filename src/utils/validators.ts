import type { VulnerabilityReport } from "../types";

export function sanitizeString(input: string): string {
  return input.replace(/^"|"$/g, "").trim();
}

export function validateSlug(slug: string): boolean {
  // Basic slug validation - should contain only letters, numbers, hyphens, and underscores
  const slugRegex = /^[a-zA-Z0-9_-]+$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 200;
}

export function validateKeywords(keywords: string): boolean {
  // Keywords should not be empty and should not contain malicious patterns
  const cleaned = sanitizeString(keywords);
  return cleaned.length > 0 && cleaned.length <= 500;
}

export function validateImpact(impact: string): impact is "HIGH" | "MEDIUM" | "LOW" {
  return ["HIGH", "MEDIUM", "LOW"].includes(impact);
}

export function validateQualityScore(score: number): boolean {
  return score >= 0 && score <= 10;
}

export function validatePage(page: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= 1000;
}

export function validateLimit(limit: number): boolean {
  return Number.isInteger(limit) && limit >= 1 && limit <= 100;
}

export function sanitizeVulnerabilityReport(report: VulnerabilityReport): VulnerabilityReport {
  return {
    ...report,
    title: report.title?.trim() || "",
    content: report.content?.trim() || "",
    summary: report.summary?.trim() || "",
    protocol_name: report.protocol_name?.trim() || "",
    firm_name: report.firm_name?.trim() || "",
  };
}

export function createCacheKey(baseKey: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${baseKey}:${sortedParams}`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + "...";
} 