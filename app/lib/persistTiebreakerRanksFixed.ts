import { supabase } from './supabase';
import { normalizeRank } from './rankUtils';

export async function persistTiebreakerRanks(
  eventId: string,
  competitors: any[]
): Promise<boolean> {
  try {
    console.log('[persistTiebreakerRanks] Persisting ranks for event:', eventId);
    console.log('[persistTiebreakerRanks] Competitors to update:', competitors.length);
    
    const updates = competitors.map(competitor => {
      const normalizedRank = normalizeRank(competitor.final_rank || competitor.rank);
      
      return {
        id: competitor.id,
        final_rank: normalizedRank,
        rank: normalizedRank,
        medal: competitor.medal,
        points: competitor.points,
        tie_breaker_status: competitor.tie_breaker_status
      };
    });
    
    // Update all competitors with detailed logging
    const updatePromises = updates.map(async (update) => {
      console.log(`[persistTiebreakerRanks] Updating competitor ${update.id}:`, {
        final_rank: update.final_rank,
        rank: update.rank,
        medal: update.medal,
        points: update.points,
        tie_breaker_status: update.tie_breaker_status
      });
      
      const result = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          rank: update.rank,
          medal: update.medal,
          points: update.points,
          tie_breaker_status: update.tie_breaker_status
        })
        .eq('id', update.id)
        .select();
      
      if (result.error) {
        console.error(`[persistTiebreakerRanks] Failed to update competitor ${update.id}:`, result.error);
      } else {
        console.log(`[persistTiebreakerRanks] Successfully updated competitor ${update.id}:`, result.data);
      }
      
      return result;
    });
    
    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const hasErrors = results.some(result => result.error);
    if (hasErrors) {
      console.error('[persistTiebreakerRanks] Some updates failed');
      return false;
    }
    
    console.log('[persistTiebreakerRanks] Successfully persisted ranks for', competitors.length, 'competitors');
    return true;
  } catch (error) {
    console.error('[persistTiebreakerRanks] Error:', error);
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
    
    if (!sortedCompetitors || sortedCompetitors.length === 0) {
      console.log('[preserveRankOrder] No competitors to process');
      return true;
    }
    
    // Update the display order and final rank based on tiebreaker results
    const updates = sortedCompetitors.map((competitor, index) => {
      const displayRank = index + 1;
      const finalRank = normalizeRank(competitor.final_rank || displayRank);
      
      console.log(`[preserveRankOrder] Preparing update for competitor ${competitor.id}:`, {
        name: competitor.name,
        currentFinalRank: competitor.final_rank,
        newDisplayRank: displayRank,
        newFinalRank: finalRank,
        competitorId: competitor.id
      });
      
      return {
        id: competitor.id,
        display_order: displayRank,
        final_rank: finalRank
      };
    });
    
    // Update competitors with detailed logging and error handling
    const updatePromises = updates.map(async (update) => {
      if (!update.id) {
        console.error('[preserveRankOrder] Missing competitor ID:', update);
        return { error: 'Missing competitor ID' };
      }
      
      console.log(`[preserveRankOrder] Sending update for competitor ${update.id}:`, {
        display_order: update.display_order,
        final_rank: update.final_rank
      });
      
      try {
        const result = await supabase
          .from('event_scores')
          .update({
            display_order: update.display_order,
            final_rank: update.final_rank
          })
          .eq('id', update.id)
          .select();
        
        if (result.error) {
          console.error(`[preserveRankOrder] FAILED to update competitor ${update.id}:`, result.error);
        } else {
          console.log(`[preserveRankOrder] SUCCESS updating competitor ${update.id}:`, result.data);
        }
        
        return result;
      } catch (error) {
        console.error(`[preserveRankOrder] Exception updating competitor ${update.id}:`, error);
        return { error };
      }
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
    console.error('[preserveRankOrder] Error:', error);
    return false;
  }
}