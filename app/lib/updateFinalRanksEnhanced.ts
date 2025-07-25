import { supabase } from './supabase';
import { calculateSeasonalPoints, normalizeTournamentClass } from './seasonalPointsFixed';
import { sanitizeFinalRank } from './rankSanitizer';

export async function updateFinalRanks(eventId: string) {
  try {
    console.log('[updateFinalRanksEnhanced] Starting rank update for event:', eventId);
    
    // Get all scores for this event
    const { data: scores, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (scoresError) {
      console.error('[updateFinalRanksEnhanced] Error fetching scores:', scoresError);
      return;
    }
    
    if (!scores || scores.length === 0) {
      console.log('[updateFinalRanksEnhanced] No scores found for event:', eventId);
      return;
    }
    
    // Get tournament info for points calculation
    const { data: event } = await supabase
      .from('events')
      .select('tournament_id')
      .eq('id', eventId)
      .single();
    
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('class')
      .eq('id', event?.tournament_id)
      .single();
    
    // ADD REQUESTED DEBUG LOG
    console.log('[DEBUG][RankCalc] Tournament Class Raw:', tournament?.class);
    
    // Guard clause: abort if tournament class not loaded
    if (!tournament?.class) {
      console.log('[updateFinalRanks] Tournament class not loaded yet — aborting points calculation');
      return;
    }
    
    const normalizedClass = normalizeTournamentClass(tournament.class);
    console.log('[DEBUG] Normalized class result:', normalizedClass);
    
    // Update ranks and points
    const updatePromises = [];
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const rank = i + 1;
      
      console.log('[POINTS DEBUG] Rank:', rank, 'Class:', normalizedClass);
      
      const points = calculateSeasonalPoints(rank, normalizedClass, scores.length);
      
      const cleanedRank = sanitizeFinalRank(rank);
      
      console.log(`[updateFinalRanksEnhanced] Updating competitor ${score.tournament_competitor_id}: rank=${rank}, cleanedRank=${cleanedRank}, points=${points}`);
      
      const updatePromise = supabase
        .from('event_scores')
        .update({
          final_rank: cleanedRank,
          rank: cleanedRank,
          points: points,
          points_earned: points
        })
        .eq('id', score.id)
        .select();
      
      updatePromises.push(updatePromise);
    }
    
    const results = await Promise.all(updatePromises);
    
    let hasErrors = false;
    results.forEach((result, index) => {
      if (result.error || !result.data || result.data.length === 0) {
        console.error(`[updateFinalRanksEnhanced] Error updating score at index ${index}:`, result.error);
        hasErrors = true;
      } else {
        console.log(`[updateFinalRanksEnhanced] Successfully updated rank for competitor:`, scores[index].tournament_competitor_id);
      }
    });
    
    if (!hasErrors) {
      console.log('[updateFinalRanksEnhanced] Successfully updated ranks for', scores.length, 'competitors');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('[updateFinalRanksEnhanced] Unexpected error:', error);
    return false;
  }
}