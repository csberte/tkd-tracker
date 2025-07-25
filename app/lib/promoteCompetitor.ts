import { SupabaseClient } from "@supabase/supabase-js";
import { promoteCompetitor as promoteCompetitorHelper } from './supabaseHelpers';
import { createChampionFrom, createCompetitorFrom } from './supabaseHelpers';

/**
 * Promote an "Other" competitor to Champion / Competitor
 * • Upserts into the master table (champions / competitors)
 * • Updates tournament_competitors.source_type & source_id
 */
export const promoteCompetitor = async (
  supabase: SupabaseClient,
  tournamentCompetitorId: string,
  target: "Champion" | "Competitor",
  payload: { name: string; avatar?: string; school?: string; location?: string }
) => {
  console.log('[promoteCompetitor] Starting promotion:', {
    tournamentCompetitorId,
    target,
    payload
  });

  /* 1️⃣  make / find the master-table record
   * ─────────────────────────────────────── */
  let sourceRecord;
  if (target === "Champion") {
    sourceRecord = await createChampionFrom(payload);
  } else {
    sourceRecord = await createCompetitorFrom(payload);
  }
  
  const sourceId = sourceRecord.id;
  console.log('[promoteCompetitor] Using source ID:', sourceId);

  /* 2️⃣  patch tournament_competitors using supabaseHelpers
   * ───────────────────────────────────────────────────── */
  const data = await promoteCompetitorHelper(
    tournamentCompetitorId,
    target,
    sourceId
  );
  
  console.log('[promoteCompetitor] Success - updated record:', data);
  return { ...data, source_id: sourceId };
};

// Export a React component as default to fix Expo Router error
export default function PromoteCompetitor() {
  return null; // stub until we build this screen
}