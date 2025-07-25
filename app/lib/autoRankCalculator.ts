import { supabase } from './supabase';
import { calculateRankingsWithTies } from './calculateRankingsWithTies';

export async function autoRankCalculator(eventId: string) {
  try {
    console.log('[RankCalc] Starting auto rank calculation for eventId:', eventId);
    
    if (!eventId) {
      console.error('[RankCalc] No eventId provided');
      return;
    }
    
    const { data: scoresRaw, error } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('[RankCalc] Error loading scores:', error.message);
      return;
    }

    if (!scoresRaw || scoresRaw.length === 0) {
      console.log('[RankCalc] No scores found for event:', eventId);
      return;
    }

    console.log('[RankCalc] Loaded scores:', scoresRaw.length, 'entries');
    
    // CRITICAL FIX: Use direct import instead of from allHelpers
    const updatedScores = calculateRankingsWithTies(scoresRaw);
    
    if (!updatedScores || updatedScores.length === 0) {
      console.error('[RankCalc] calculateRankingsWithTies returned no results');
      return;
    }
    
    console.log('[RankCalc] Calculated rankings, about to write:', updatedScores.map(s => ({
      id: s.id,
      name: s.tournament_competitor_id,
      total_score: s.total_score,
      final_rank: s.final_rank,
      points_earned: s.points_earned
    })));

    for (const score of updatedScores) {
      const { id, final_rank, points_earned } = score;
      
      // Guard check for missing score ID
      if (!id) {
        console.warn('[Ranking Error] Missing score ID for competitor', score.tournament_competitor_id);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({ final_rank, points_earned })
        .eq('id', id);

      if (updateError) {
        console.warn(`[RankCalc] Failed to update rank for ID ${id}:`, updateError.message);
      } else {
        console.log(`[RankCalc] Updated score ID ${id}: rank=${final_rank}, points=${points_earned}`);
      }
    }

    console.log('[RankCalc] Auto rank + points updated successfully');
  } catch (err) {
    console.error('[RankCalc] Unexpected error in autoRankCalculator:', err);
    throw err; // Re-throw to allow caller to handle
  }
}

// Keep existing function for compatibility
export async function calculateAndUpdateRanks(eventId: string) {
  return autoRankCalculator(eventId);
}
