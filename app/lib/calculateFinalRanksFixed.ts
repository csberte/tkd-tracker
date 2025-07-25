import { supabase } from './supabase';
import { calculateTournamentPoints } from './tournamentPoints';

function getPlacementFromRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

export async function calculateFinalRanks(
  eventId: string,
  allCompetitors: any[],
  tournamentClass: 'AAA' | 'AA' | 'A' | 'B' | 'C' = 'A'
) {
  console.log('[calculateFinalRanks] Starting calculation for event:', eventId);
  
  if (!eventId || !allCompetitors) {
    console.error('[calculateFinalRanks] Missing required parameters');
    return;
  }

  try {
    // Get total competitors for points calculation
    const { data: totalCompetitorsData, error: totalError } = await supabase
      .from('event_participants')
      .select('tournament_competitor_id')
      .eq('event_id', eventId);
      
    if (totalError) {
      console.error('[calculateFinalRanks] Error getting total competitors:', totalError);
      throw totalError;
    }
    
    const totalCompetitors = totalCompetitorsData?.length || allCompetitors.length;
    console.log('[calculateFinalRanks] Total competitors in event:', totalCompetitors);

    // Filter out competitors with resolved tiebreaker status
    const competitorsToRank = allCompetitors.filter(comp => {
      const hasResolvedTiebreaker = comp.tie_breaker_status && 
        (comp.tie_breaker_status.startsWith('selected_') || 
         comp.tie_breaker_status === 'unselected' ||
         comp.tie_breaker_status === 'resolved');
      
      if (hasResolvedTiebreaker) {
        console.log(`[calculateFinalRanks] Skipping ${comp.name} - has resolved tiebreaker:`, comp.tie_breaker_status);
        return false;
      }
      
      return true;
    });

    console.log(`[calculateFinalRanks] Ranking ${competitorsToRank.length} competitors (${allCompetitors.length - competitorsToRank.length} skipped due to resolved tiebreakers)`);

    // Sort by total score descending
    const sortedCompetitors = competitorsToRank.sort((a, b) => {
      const scoreA = a.total_score || a.totalScore || 0;
      const scoreB = b.total_score || b.totalScore || 0;
      return scoreB - scoreA;
    });

    // Calculate ranks
    let currentRank = 1;
    let previousScore = null;
    let sameScoreCount = 0;

    for (let i = 0; i < sortedCompetitors.length; i++) {
      const competitor = sortedCompetitors[i];
      const currentScore = competitor.total_score || competitor.totalScore || 0;
      
      if (previousScore !== null && currentScore !== previousScore) {
        currentRank += sameScoreCount;
        sameScoreCount = 1;
      } else {
        sameScoreCount++;
      }
      
      const finalRank = currentRank;
      const placement = getPlacementFromRank(finalRank);
      const points = calculateTournamentPoints(finalRank, tournamentClass, totalCompetitors);
      
      console.log(`[calculateFinalRanks] Updating ${competitor.name}: rank ${finalRank}, points ${points}`);
      
      const { error } = await supabase
        .from('event_scores')
        .update({
          final_rank: finalRank,
          placement: placement,
          points_earned: points
        })
        .eq('competitor_id', competitor.tournament_competitor_id)
        .eq('event_id', eventId);
        
      if (error) {
        console.error(`[calculateFinalRanks] Error updating ${competitor.name}:`, error);
      }
      
      previousScore = currentScore;
    }
    
    console.log('[calculateFinalRanks] Calculation completed successfully');
    
  } catch (error) {
    console.error('[calculateFinalRanks] Calculation failed:', error);
    throw error;
  }
}