import { supabase } from './supabase';
import { calculateSeasonalPoints } from './pointsCalculator';
import { sanitizeFinalRank } from './rankSanitizer';

export async function updateFinalRanks(
  eventId: string, 
  allCompetitors?: any[], 
  tiebreakerWinners?: Map<string, string[]>,
  tournamentClass: 'AAA' | 'AA' | 'A' | 'B' | 'C' = 'A'
) {
  console.log("📦 updateFinalRanks() triggered for eventId:", eventId);
  console.log("📍 CALL STACK:", new Error().stack);
  
  try {
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
    
    const tournamentClassFinal = tournament?.tournament_class || 'C';
    console.log('🏆 Tournament class:', tournamentClassFinal);
    
    // Handle tiebreaker results if provided
    if (tiebreakerWinners && allCompetitors) {
      console.log('[updateFinalRanks] Processing tiebreaker results');
      
      const totalCompetitors = allCompetitors.length;
      
      // Update tiebreaker winners with proper rank assignment
      for (const [groupKey, selectedIds] of tiebreakerWinners.entries()) {
        const tiedRankStart = parseInt(groupKey.split('-')[0]) || 1;
        
        const tiedGroup = allCompetitors.filter(c => {
          const currentRank = c.final_rank || c.current_rank;
          return currentRank === tiedRankStart && 
                 (c.tie_breaker_status === 'tied' || 
                  c.tie_breaker_status === 'untouched' ||
                  selectedIds.includes(c.tournament_competitor_id));
        });
        
        const selected = tiedGroup.filter(c => selectedIds.includes(c.tournament_competitor_id));
        const unselected = tiedGroup.filter(c => !selectedIds.includes(c.tournament_competitor_id));
        
        // Update selected competitors with consecutive ranks
        for (let index = 0; index < selectedIds.length; index++) {
          const winnerId = selectedIds[index];
          const winner = selected.find(c => c.tournament_competitor_id === winnerId);
          
          if (!winner) continue;

          const newFinalRank = tiedRankStart + index;
          // CRITICAL: Use calculateSeasonalPoints with correct tournament class
          const newPoints = calculateSeasonalPoints(
            newFinalRank,
            tournamentClassFinal,
            totalCompetitors
          );

          console.log(`🎯 TIEBREAKER RESULT: eventId=${eventId}, tournamentClass=${tournamentClassFinal}, competitor=${winner.name}, finalRank=${newFinalRank}, pointsEarned=${newPoints}`);

          // Update both final_rank AND placement together
          const { error } = await supabase
            .from('event_scores')
            .update({
              final_rank: newFinalRank,
              placement: newFinalRank,
              points_earned: newPoints,
              tie_breaker_status: 'resolved'
            })
            .eq('competitor_id', winnerId)
            .eq('event_id', eventId);
            
          if (error) {
            console.error(`[updateFinalRanks] Error updating winner ${winner.name}:`, error);
          }
        }
        
        // Update unselected competitors - demote them
        for (let i = 0; i < unselected.length; i++) {
          const loser = unselected[i];
          const newFinalRank = tiedRankStart + selectedIds.length + i;
          // CRITICAL: Use calculateSeasonalPoints with correct tournament class
          const newPoints = calculateSeasonalPoints(
            newFinalRank,
            tournamentClassFinal,
            totalCompetitors
          );
          
          console.log(`🎯 TIEBREAKER RESULT: eventId=${eventId}, tournamentClass=${tournamentClassFinal}, competitor=${loser.name}, finalRank=${newFinalRank}, pointsEarned=${newPoints}`);
          
          // Update both final_rank AND placement together
          const { error } = await supabase
            .from('event_scores')
            .update({
              final_rank: newFinalRank,
              placement: newFinalRank,
              points_earned: newPoints,
              tie_breaker_status: 'resolved'
            })
            .eq('competitor_id', loser.tournament_competitor_id)
            .eq('event_id', eventId);
            
          if (error) {
            console.error(`[updateFinalRanks] Error updating loser ${loser.name}:`, error);
          }
        }
      }
      
      return; // Exit early for tiebreaker processing
    }
    
    // Original logic for regular rank updates
    const { data: eventParticipants, error: participantsError } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId);
    
    if (participantsError) {
      console.error('[updateFinalRanks] Error fetching participants:', participantsError);
      return;
    }
    
    const tiebreakerMap = new Map();
    eventParticipants.forEach(p => {
      tiebreakerMap.set(p.competitor_id, p.tie_breaker_state);
    });
    
    const { data: scores, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (scoresError || !scores || scores.length === 0) {
      console.error('[updateFinalRanks] Error fetching scores:', scoresError);
      return;
    }
    
    // Sort by final_rank if it exists, otherwise by total_score
    const sortedScores = [...scores].sort((a, b) => {
      if (a.final_rank && b.final_rank) {
        return a.final_rank - b.final_rank;
      }
      if (a.final_rank && !b.final_rank) return -1;
      if (!a.final_rank && b.final_rank) return 1;
      return (b.total_score || 0) - (a.total_score || 0);
    });
    
    // Update ranks and points
    for (let i = 0; i < sortedScores.length; i++) {
      const competitor = sortedScores[i];
      const tiebreakerStatus = tiebreakerMap.get(competitor.competitor_id);
      
      // Skip if tiebreaker is resolved
      if (tiebreakerStatus === 'resolved') {
        continue;
      }
      
      const new_final_rank = competitor.final_rank || (i + 1);
      // CRITICAL: Use calculateSeasonalPoints with correct tournament class
      const points = calculateSeasonalPoints(new_final_rank, tournamentClassFinal, sortedScores.length);
      const cleanedRank = sanitizeFinalRank(new_final_rank);
      
      console.log(`🎯 REGULAR UPDATE: eventId=${eventId}, tournamentClass=${tournamentClassFinal}, competitor=${competitor.name || 'Unknown'}, finalRank=${cleanedRank}, pointsEarned=${points}`);
      
      // Always update both final_rank AND placement together
      const updateData: any = {
        final_rank: cleanedRank,
        placement: cleanedRank,
        rank: cleanedRank,
        points: points,
        points_earned: points
      };
      
      const { error: updateError } = await supabase
        .from('event_scores')
        .update(updateData)
        .eq('id', competitor.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${competitor.name}:`, updateError);
      }
    }
  } catch (error) {
    console.error('[updateFinalRanks] Unexpected error:', error);
  }
}