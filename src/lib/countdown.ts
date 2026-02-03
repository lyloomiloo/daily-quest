/**
 * Time until midnight in Europe/Madrid.
 * Returns { hours, minutes } and formatted "Xh Ym".
 */
export function getCountdownToMidnightMadrid(): { hours: number; minutes: number; text: string } {
  const now = new Date();
  const madrid = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  );
  const midnight = new Date(madrid);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - madrid.getTime();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, text: "0h 0m" };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return {
    hours,
    minutes,
    text: `${hours}h ${minutes}m`,
  };
}

export function formatDateHeader(date: Date): string {
  const d = new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  );
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}
// e.g. "Tue, Feb 3"

/** Today's date as YYYY-MM-DD in Europe/Madrid (for word_date / pins queries). */
export function getTodayWordDate(): string {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
