import { supabase } from "./supabase";
import type { DailyWord } from "./data";
import { getTodayWordDate } from "./countdown";

/** Fallback when words table is empty or no word has active_date IS NULL. */
export function getFallbackWord(today: string): DailyWord {
  return {
    word_en: "EXPLORE",
    word_es: "explorar",
    active_date: today,
  };
}

/** YYYY-MM-DD regex for validation */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fetch or assign today's daily word (Europe/Madrid date).
 * @param todayOverride - Optional YYYY-MM-DD for testing (e.g. from ?testdate=).
 * 1. Fetch from words where active_date = today.
 * 2. If none, pick a random word where active_date IS NULL, update it to today, use it.
 * 3. If table empty or no candidate, return fallback EXPLORE / explorar.
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

  // 1. Fetch word for today
  const { data: todayRow, error: todayError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .eq("active_date", today)
    .maybeSingle();

  if (!todayError && todayRow) {
    console.log("Word fetched:", todayRow.word_en);
    console.log("active_date in DB:", todayRow.active_date);
    return {
      word_en: todayRow.word_en,
      word_es: todayRow.word_es,
      active_date: todayRow.active_date,
    };
  }

  if (todayError) {
    console.error("Supabase words fetch (today) failed:", todayError);
  }

  // 2. No word for today: pick a random word where active_date IS NULL
  const { data: candidates, error: listError } = await client
    .from("words")
    .select("id, word_en, word_es, active_date")
    .is("active_date", null);

  if (listError) {
    console.error("Supabase words fetch (candidates, active_date IS NULL) failed:", listError);
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

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

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

  console.log("Word fetched:", chosen.word_en, "(assigned from NULL)");
  console.log("active_date in DB:", today);
  return {
    word_en: chosen.word_en,
    word_es: chosen.word_es,
    active_date: today,
  };
}
