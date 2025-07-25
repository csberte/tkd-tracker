import { supabase } from './supabase';
import { calculateTournamentPoints } from './tournamentPoints';

function getPlacementFromRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

export async function updateFinalRanks(
  eventId: string, 
  allCompetitors: any[], 
  tiebreakerWinners: Map<string, string[]>,
  tournamentClass: 'AAA' | 'AA' | 'A' | 'B' | 'C' = 'A'
) {
  console.log('[updateFinalRanks] Starting update for event:', eventId);
  console.log('[updateFinalRanks] Total competitors:', allCompetitors.length);
  console.log('[updateFinalRanks] Tiebreaker winners:', Array.from(tiebreakerWinners.entries()));
  
  if (!eventId || !allCompetitors) {
    console.error('[updateFinalRanks] Missing required parameters');
    return;
  }

  try {
    // Get total competitors for points calculation
    const { data: totalCompetitorsData, error: totalError } = await supabase
      .from('event_participants')
      .select('tournament_competitor_id')
      .eq('event_id', eventId);
      
    if (totalError) {
      console.error('[updateFinalRanks] Error getting total competitors:', totalError);
      throw totalError;
    }
    
    const totalCompetitors = totalCompetitorsData?.length || allCompetitors.length;
    console.log('[updateFinalRanks] Total competitors in event:', totalCompetitors);

    // Update selected tiebreaker winners with proper rank assignment
    for (const [groupKey, selectedIds] of tiebreakerWinners.entries()) {
      // Find the tied rank for this group
      const tiedRankStart = parseInt(groupKey.split('-')[0]) || 1;
      
      console.log(`[updateFinalRanks] Processing tiebreaker group: ${groupKey}, starting rank: ${tiedRankStart}`);
      
      // Find all competitors in this tied group (not just those with 'tied' status)
      const tiedGroup = allCompetitors.filter(c => {
        const currentRank = c.final_rank || c.current_rank;
        return currentRank === tiedRankStart && 
               (c.tie_breaker_status === 'tied' || 
                c.tie_breaker_status === 'untouched' ||
                selectedIds.includes(c.tournament_competitor_id));
      });
      
      console.log(`[updateFinalRanks] Found ${tiedGroup.length} competitors in tied group at rank ${tiedRankStart}`);
      
      // Separate selected and unselected competitors
      const selected = tiedGroup.filter(c => selectedIds.includes(c.tournament_competitor_id));
      const unselected = tiedGroup.filter(c => !selectedIds.includes(c.tournament_competitor_id));
      
      console.log(`[updateFinalRanks] Selected: ${selected.length}, Unselected: ${unselected.length}`);
      
      // Update selected competitors with consecutive ranks starting from tiedRankStart
      for (let index = 0; index < selectedIds.length; index++) {
        const winnerId = selectedIds[index];
        const winner = selected.find(c => c.tournament_competitor_id === winnerId);
        
        if (!winner) {
          console.warn(`[updateFinalRanks] Winner not found: ${winnerId}`);
          continue;
        }

        const newFinalRank = tiedRankStart + index;
        const newPlacement = getPlacementFromRank(newFinalRank);
        const newPoints = calculateTournamentPoints(
          newFinalRank,
          tournamentClass,
          totalCompetitors
        );

        console.log('🏅 Updating tiebreaker result:', {
          id: winner.tournament_competitor_id,
          name: winner.name,
          tie_breaker_status: winner.tie_breaker_status,
          final_rank: newFinalRank,
          placement: newPlacement
        });

        console.log("[Final Supabase Update]", {
          id: winner.tournament_competitor_id,
          final_rank: newFinalRank,
          placement: newPlacement,
          points_earned: newPoints
        });

        const { error } = await supabase
          .from('event_scores')
          .update({
            final_rank: newFinalRank,
            placement: newPlacement,
            points_earned: newPoints,
            tie_breaker_status: 'resolved'
          })
          .eq('competitor_id', winnerId)
          .eq('event_id', eventId);
          
        if (error) {
          console.error(`[updateFinalRanks] Error updating winner ${winner.name}:`, error);
        } else {
          console.log(`[updateFinalRanks] Successfully updated winner ${winner.name}`);
        }
      }
      
      // Update unselected competitors - demote them to ranks after all selected
      for (let i = 0; i < unselected.length; i++) {
        const loser = unselected[i];
        const newFinalRank = tiedRankStart + selectedIds.length + i;
        const newPlacement = getPlacementFromRank(newFinalRank);
        const newPoints = calculateTournamentPoints(
          newFinalRank,
          tournamentClass,
          totalCompetitors
        );
        
        console.log('🏅 Updating tiebreaker result:', {
          id: loser.tournament_competitor_id,
          name: loser.name,
          tie_breaker_status: loser.tie_breaker_status,
          final_rank: newFinalRank,
          placement: newPlacement
        });
        
        console.log("[Final Supabase Update]", {
          id: loser.tournament_competitor_id,
          final_rank: newFinalRank,
          placement: newPlacement,
          points_earned: newPoints
        });
        
        const { error } = await supabase
          .from('event_scores')
          .update({
            final_rank: newFinalRank,
            placement: newPlacement,
            points_earned: newPoints,
            tie_breaker_status: 'resolved'
          })
          .eq('competitor_id', loser.tournament_competitor_id)
          .eq('event_id', eventId);
          
        if (error) {
          console.error(`[updateFinalRanks] Error updating loser ${loser.name}:`, error);
        } else {
          console.log(`[updateFinalRanks] Successfully updated loser ${loser.name}`);
        }
      }
    }
    
    console.log('[updateFinalRanks] All updates completed successfully');
    
  } catch (error) {
    console.error('[updateFinalRanks] Processing failed:', error);
    throw error;
  }
}