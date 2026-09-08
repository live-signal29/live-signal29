/**
 * Weekday / Weekend market session helper.
 *
 * Mirrors the same rule used server-side in the
 * `telegram-signal-post` edge function, so the dashboard banner
 * and the Telegram channel always agree on what "session" it is:
 *
 *   Mon 00:00 UTC -> Fri 20:00 UTC  = "weekday" (Gold/Forex open)
 *   Fri 20:00 UTC -> Mon 00:00 UTC  = "weekend" (Gold/Forex closed,
 *   crypto + synthetic indices keep trading)
 *
 * Intentionally simple (no holiday calendar) — good enough to
 * drive a "closed for the weekend" banner and countdown.
 */

export type MarketPhase = "weekday" | "weekend";

export function getMarketPhase(now: Date = new Date()): MarketPhase {
  const day = now.getUTCDay(); // 0 = Sun ... 6 = Sat
  const hour = now.getUTCHours();

  if (day === 0 || day === 6) return "weekend";
  if (day === 5 && hour >= 20) return "weekend";
  return "weekday";
}

/** Midnight UTC of the next upcoming Monday. */
export function getNextMondayUTC(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);

  const day = d.getUTCDay();
  const daysToAdd = ((8 - day) % 7) || 7;

  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d;
}

/** "1d 4h" / "3h 12m" style countdown label. */
export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "any moment now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }

  return `${hours}h ${minutes}m`;
}
