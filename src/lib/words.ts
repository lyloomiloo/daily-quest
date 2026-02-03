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
    console.log("Word fetched:", existingWord.word_en);
    console.log("active_date in DB:", existingWord.active_date);
    return {
      word_en: existingWord.word_en,
      word_es: existingWord.word_es,
      active_date: existingWord.active_date,
    };
  }

  if (todayError) {
    console.error("Supabase words fetch (today) failed:", todayError);
  }

  // Step 2: No word for today — assign one using deterministic selection (same date = same word for everyone)
  const dayOfYear = getDayOfYear(today);

  const { data: candidates, error: listError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .is("active_date", null)
    .order("id", { ascending: true });

  if (listError) {
    console.error("Supabase words fetch (candidates) failed:", listError);
    const fallback = getFallbackWord(today);
    console.log("Word fetched:", fallback.word_en, "(fallback – query error)");
    console.log("active_date in DB: N/A (fallback)");
    return fallback;
  }

  if (!candidates?.length) {
    const fallback = getFallbackWord(today);
    console.log("Word fetched:", fallback.word_en, "(fallback – no NULL words)");
    console.log("active_date in DB: N/A (fallback)");
    return fallback;
  }

  const chosenIndex = dayOfYear % candidates.length;
  const chosen = candidates[chosenIndex];

  // Safeguard: re-check that no word was assigned in the meantime (another client may have assigned)
  const { data: recheckRow, error: recheckError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .eq("active_date", today)
    .maybeSingle();

  if (!recheckError && recheckRow) {
    console.log("Word fetched:", recheckRow.word_en, "(another client assigned; using same)");
    console.log("active_date in DB:", recheckRow.active_date);
    return {
      word_en: recheckRow.word_en,
      word_es: recheckRow.word_es,
      active_date: recheckRow.active_date,
    };
  }

  const { error: updateError } = await client
    .from("words")
    .update({ active_date: today })
    .eq("id", chosen.id);

  if (updateError) {
    console.error("Supabase words update failed:", updateError);
    const fallback = getFallbackWord(today);
    console.log("Word fetched:", fallback.word_en, "(fallback – update error)");
    console.log("active_date in DB: N/A (fallback)");
    return fallback;
  }

  console.log("Word fetched:", chosen.word_en, "(assigned deterministically)");
  console.log("active_date in DB:", today);
  return {
    word_en: chosen.word_en,
    word_es: chosen.word_es,
    active_date: today,
  };
}
