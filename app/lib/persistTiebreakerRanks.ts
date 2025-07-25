import { supabase } from './supabase';
import { normalizeRank } from './rankUtils';

export async function persistTiebreakerRanks(
  eventId: string,
  competitors: any[]
): Promise<boolean> {
  try {
    console.log('[persistTiebreakerRanks] Persisting ranks for event:', eventId);
    console.log('[persistTiebreakerRanks] Competitors to update:', competitors.length);
    
    const updates = competitors.map((competitor, index) => {
      const normalizedRank = normalizeRank(competitor.final_rank || competitor.rank || (index + 1));
      const placement = normalizedRank; // placement should be same as final_rank
      
      console.log(`[persistTiebreakerRanks] Preparing competitor ${competitor.id}:`, {
        name: competitor.name,
        originalRank: competitor.final_rank || competitor.rank,
        normalizedRank,
        placement,
        index: index + 1
      });
      
      return {
        id: competitor.id,
        final_rank: normalizedRank,
        rank: normalizedRank,
        placement: placement,
        medal: competitor.medal,
        points: competitor.points,
        tie_breaker_status: competitor.tie_breaker_status || 'resolved'
      };
    });
    
    // Update all competitors with detailed logging
    const updatePromises = updates.map(async (update) => {
      console.log(`[persistTiebreakerRanks] Updating competitor ${update.id} with payload:`, {
        final_rank: update.final_rank,
        rank: update.rank,
        placement: update.placement,
        medal: update.medal,
        points: update.points,
        tie_breaker_status: update.tie_breaker_status
      });
      
      const result = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          rank: update.rank,
          placement: update.placement,
          medal: update.medal,
          points: update.points,
          tie_breaker_status: update.tie_breaker_status
        })
        .eq('id', update.id);
      
      if (result.error) {
        console.error(`[persistTiebreakerRanks] FAILED to update competitor ${update.id}:`, {
          error: result.error,
          code: result.error.code,
          message: result.error.message,
          details: result.error.details
        });
      } else {
        console.log(`[persistTiebreakerRanks] SUCCESS updating competitor ${update.id}`);
      }
      
      return result;
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
    
    // Update the final rank and placement based on tiebreaker results
    const updates = sortedCompetitors.map((competitor, index) => {
      const displayRank = index + 1;
      const finalRank = normalizeRank(competitor.final_rank || displayRank);
      const placement = finalRank; // placement should match final_rank
      
      console.log(`[preserveRankOrder] Preparing update for competitor ${competitor.id}:`, {
        name: competitor.name,
        currentFinalRank: competitor.final_rank,
        newDisplayRank: displayRank,
        newFinalRank: finalRank,
        newPlacement: placement
      });
      
      return {
        id: competitor.id,
        final_rank: finalRank,
        placement: placement
      };
    });
    
    // Update competitors with detailed logging
    const updatePromises = updates.map(async (update) => {
      console.log(`[preserveRankOrder] Sending update for competitor ${update.id}:`, {
        final_rank: update.final_rank,
        placement: update.placement
      });
      
      const result = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          placement: update.placement
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