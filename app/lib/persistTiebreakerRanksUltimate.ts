import { supabase } from './supabase';
import { normalizeRank } from './rankUtils';
import { calculateSeasonalPoints } from './seasonalPointsFixed';

export async function persistTiebreakerRanks(
  eventId: string,
  competitors: any[]
): Promise<boolean> {
  try {
    console.log('[persistTiebreakerRanks] Persisting ranks for event:', eventId);
    console.log('[persistTiebreakerRanks] Competitors to update:', competitors.length);
    
    // Get tournament info for points calculation
    const { data: event } = await supabase
      .from('events')
      .select('tournament_id')
      .eq('id', eventId)
      .single();
    
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('tournament_class')
      .eq('id', event?.tournament_id)
      .single();
    
    const tournamentClass = tournament?.tournament_class || 'C';
    
    const updates = competitors.map((competitor, index) => {
      const normalizedRank = normalizeRank(competitor.final_rank || competitor.rank || (index + 1));
      const placement = normalizedRank; // placement should be same as final_rank
      const pointsEarned = calculateSeasonalPoints(normalizedRank, tournamentClass, competitors.length);
      
      console.log(`[persistTiebreakerRanks] Preparing competitor ${competitor.id}:`, {
        name: competitor.name,
        originalRank: competitor.final_rank || competitor.rank,
        normalizedRank,
        placement,
        pointsEarned,
        index: index + 1
      });
      
      return {
        id: competitor.id,
        final_rank: normalizedRank,
        rank: normalizedRank,
        placement: placement,
        points_earned: pointsEarned,
        medal: competitor.medal,
        points: competitor.points,
        tie_breaker_status: competitor.tie_breaker_status || 'resolved',
        tie_breaker_state: competitor.tie_breaker_state || 'resolved'
      };
    });
    
    // Update all competitors with detailed logging
    const updatePromises = updates.map(async (update) => {
      const competitorId = update.id;
      const final_rank = update.final_rank;
      const placement = update.placement;
      const points_earned = update.points_earned;
      const tie_breaker_state = update.tie_breaker_state;
      
      console.log("🚀 Persisting Tiebreaker", {
        competitorId,
        final_rank,
        placement,
        points_earned,
        tie_breaker_state,
      });
      
      const response = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          rank: update.rank,
          placement: update.placement,
          points_earned: update.points_earned,
          medal: update.medal,
          points: update.points,
          tie_breaker_status: update.tie_breaker_status,
          tie_breaker_state: update.tie_breaker_state
        })
        .eq('id', update.id);
      
      console.log("📬 Tiebreaker Update Response", response);
      
      if (response.error) {
        console.error(`[persistTiebreakerRanks] FAILED to update competitor ${update.id}:`, {
          error: response.error,
          code: response.error.code,
          message: response.error.message,
          details: response.error.details
        });
      } else {
        console.log(`[persistTiebreakerRanks] SUCCESS updating competitor ${update.id}`);
      }
      
      return response;
    });
    
    const results = await Promise.all(updatePromises);
    
    // Check for errors with detailed reporting
    const failedUpdates = results.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error(`[persistTiebreakerRanks] ${failedUpdates.length} out of ${results.length} updates failed`);
      failedUpdates.forEach((result, index) => {
        console.error(`[persistTiebreakerRanks] Failed update ${index + 1}:`, result.error);
      });
      return false;
    }
    
    console.log(`[persistTiebreakerRanks] Successfully updated all ${results.length} competitors`);
    return true;
  } catch (error) {
    console.error('[persistTiebreakerRanks] Unexpected error:', error);
    return false;
  }
}

export async function preserveRankOrder(
  eventId: string,
  sortedCompetitors: any[]
): Promise<boolean> {
  try {
    console.log('[preserveRankOrder] Starting rank preservation for event:', eventId);
    console.log('[preserveRankOrder] Processing', sortedCompetitors.length, 'competitors');
    
    // Get tournament info for points calculation
    const { data: event } = await supabase
      .from('events')
      .select('tournament_id')
      .eq('id', eventId)
      .single();
    
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('tournament_class')
      .eq('id', event?.tournament_id)
      .single();
    
    const tournamentClass = tournament?.tournament_class || 'C';
    
    // Update the display order and final rank based on tiebreaker results
    const updates = sortedCompetitors.map((competitor, index) => {
      const displayRank = index + 1;
      const finalRank = normalizeRank(competitor.final_rank || displayRank);
      const placement = finalRank; // placement should match final_rank
      const pointsEarned = calculateSeasonalPoints(finalRank, tournamentClass, sortedCompetitors.length);
      
      console.log(`[preserveRankOrder] Preparing update for competitor ${competitor.id}:`, {
        name: competitor.name,
        currentFinalRank: competitor.final_rank,
        newDisplayRank: displayRank,
        newFinalRank: finalRank,
        newPlacement: placement,
        newPointsEarned: pointsEarned
      });
      
      return {
        id: competitor.id,
        display_order: displayRank,
        final_rank: finalRank,
        placement: placement,
        points_earned: pointsEarned
      };
    });
    
    // Update competitors with detailed logging
    const updatePromises = updates.map(async (update) => {
      console.log(`[preserveRankOrder] Sending update for competitor ${update.id}:`, {
        display_order: update.display_order,
        final_rank: update.final_rank,
        placement: update.placement,
        points_earned: update.points_earned
      });
      
      const result = await supabase
        .from('event_scores')
        .update({
          display_order: update.display_order,
          final_rank: update.final_rank,
          placement: update.placement,
          points_earned: update.points_earned
        })
        .eq('id', update.id);
      
      if (result.error) {
        console.error(`[preserveRankOrder] FAILED to update competitor ${update.id}:`, {
          error: result.error,
          code: result.error.code,
          message: result.error.message,
          details: result.error.details
        });
      } else {
        console.log(`[preserveRankOrder] SUCCESS updating competitor ${update.id}`);
      }
      
      return result;
    });
    
    const results = await Promise.all(updatePromises);
    
    // Check for errors with detailed reporting
    const failedUpdates = results.filter(result => result.error);
    if (failedUpdates.length > 0) {
      console.error(`[preserveRankOrder] ${failedUpdates.length} out of ${results.length} updates failed`);
      failedUpdates.forEach((result, index) => {
        console.error(`[preserveRankOrder] Failed update ${index + 1}:`, result.error);
      });
      return false;
    }
    
    console.log(`[preserveRankOrder] Successfully updated all ${results.length} competitors`);
    return true;
  } catch (error) {
    console.error('[preserveRankOrder] Unexpected error:', error);
    return false;
  }
}
