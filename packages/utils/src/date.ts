// packages/utils/src/date.ts
// Date formatting utilities for the Indian market

/**
 * Format epoch ms to display date
 * @example formatDate(1717200000000) → "1 Jun 2026"
 */
export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(new Date(epochMs));
}

/**
 * Format epoch ms to display date + time
 * @example formatDateTime(1717200000000) → "1 Jun 2026, 10:30 AM"
 */
export function formatDateTime(epochMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(epochMs));
}

/**
 * Format ISO date string YYYY-MM-DD for display
 * @example formatISODate("2026-06-01") → "Mon, 1 Jun"
 */
export function formatISODate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  }).format(date);
}

/**
 * Format delivery slot time range
 * @example formatSlot("10:00", "13:00") → "10:00 AM – 1:00 PM"
 */
export function formatSlot(startTime: string, endTime: string): string {
  const format = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = (h ?? 0) >= 12 ? "PM" : "AM";
    const hour12 = (h ?? 0) % 12 || 12;
    return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
  };
  return `${format(startTime)} – ${format(endTime)}`;
}

/**
 * Check if the claim window (48h) is still open
 */
export function isClaimWindowOpen(claimWindowExpiresAt: number): boolean {
  return Date.now() < claimWindowExpiresAt;
}

/**
 * Format relative time for recent events
 * @example timeAgo(Date.now() - 3600000) → "1 hour ago"
 */
export function timeAgo(epochMs: number): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = epochMs - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr  = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr  / 24);

  if (Math.abs(diffSec) < 60)  return rtf.format(diffSec,  "second");
  if (Math.abs(diffMin) < 60)  return rtf.format(diffMin,  "minute");
  if (Math.abs(diffHr)  < 24)  return rtf.format(diffHr,   "hour");
  return rtf.format(diffDay, "day");
}
