import { supabase } from "./supabase";
import type { DailyWord } from "./data";
import { getTodayWordDate } from "./countdown";

const CACHE_KEY_PREFIX = "daily-word-";

/** Fallback when words table is empty or no word has active_date IS NULL. */
export function getFallbackWord(today: string): DailyWord {
  return {
    word_en: "EXPLORE",
    word_es: "explorar",
    active_date: today,
  };
}

/** Get cached word for date from localStorage if valid (same date). */
export function getCachedWord(today: string): DailyWord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + today);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyWord;
    if (parsed?.active_date === today && parsed?.word_en && parsed?.word_es) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Store word in localStorage for the given date. */
export function setCachedWord(today: string, word: DailyWord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + today, JSON.stringify(word));
  } catch {
    // ignore
  }
}

/** YYYY-MM-DD regex for validation */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Day of year 1–366 for a YYYY-MM-DD date string (deterministic word selection). */
function getDayOfYear(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(y, 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Fetch or assign today's daily word (Europe/Madrid date).
 * Same word for ALL users all day: check first, then assign using deterministic selection (day of year), no random.
 * @param todayOverride - Optional YYYY-MM-DD for testing (e.g. from ?testdate=).
 */
export async function getDailyWord(todayOverride?: string): Promise<DailyWord> {
  const client = supabase;
  const today =
    todayOverride && DATE_RE.test(todayOverride)
      ? todayOverride
      : getTodayWordDate();

  console.log("Today's date (Madrid):", today);

  if (!client) {
    const fallback = getFallbackWord(today);
    console.log("Word fetched:", fallback.word_en, "(fallback – no Supabase)");
    console.log("active_date in DB: N/A (fallback)");
    return fallback;
  }

  // Step 1: Check if a word is already assigned for today — return it immediately
  const { data: existingWord, error: todayError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .eq("active_date", today)
    .limit(1)
    .maybeSingle();

  if (!todayError && existingWord) {
    return {
      word_en: existingWord.word_en,
      word_es: existingWord.word_es,
      active_date: existingWord.active_date,
    };
  }

  if (todayError) {
    console.error("Supabase words fetch (today) failed:", todayError);
  }

  // Step 2: No word for today — assign one with smart repetition rules
  const dayOfYear = getDayOfYear(today);

  let candidates: { id: number; word_en: string; word_es: string; active_date: string | null; times_used?: number; last_used_date?: string | null }[] | null = null;
  let useSmartRepetition = false;

  const { data: allWords } = await client.from("words").select("times_used");
  const totalUses = allWords?.reduce((s, r) => s + (Number((r as { times_used?: number }).times_used) || 0), 0) ?? 0;
  const maxPerWord = Math.max(1, Math.floor(0.3 * (totalUses + 1)));

  const thirtyDaysAgo = new Date(today + "T12:00:00Z");
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const smartResult = await client
    .from("words")
    .select("id, word_en, word_es, active_date, times_used, last_used_date")
    .or(`active_date.is.null,last_used_date.is.null,last_used_date.lt.${thirtyDaysAgoStr}`)
    .lt("times_used", maxPerWord)
    .order("times_used", { ascending: true })
    .order("id", { ascending: true });

  if (!smartResult.error && smartResult.data?.length) {
    candidates = smartResult.data as typeof candidates;
    useSmartRepetition = true;
  }

  if (!candidates?.length) {
    const legacyResult = await client
      .from("words")
      .select("id, word_en, word_es, active_date")
      .is("active_date", null)
      .order("id", { ascending: true });
    if (legacyResult.error || !legacyResult.data?.length) {
      return getFallbackWord(today);
    }
    candidates = legacyResult.data as typeof candidates;
  }

  const chosenIndex = dayOfYear % candidates!.length;
  const chosen = candidates![chosenIndex];

  const { data: recheckRow, error: recheckError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .eq("active_date", today)
    .maybeSingle();

  if (!recheckError && recheckRow) {
    return {
      word_en: recheckRow.word_en,
      word_es: recheckRow.word_es,
      active_date: recheckRow.active_date,
    };
  }

  const updatePayload = useSmartRepetition
    ? {
        active_date: today,
        last_used_date: today,
        times_used: (Number(chosen.times_used) || 0) + 1,
      }
    : { active_date: today };

  const { error: updateError } = await client.from("words").update(updatePayload).eq("id", chosen.id);

  if (updateError) {
    console.error("Supabase words update failed:", updateError);
    return getFallbackWord(today);
  }

  return {
    word_en: chosen.word_en,
    word_es: chosen.word_es,
    active_date: today,
  };
}
