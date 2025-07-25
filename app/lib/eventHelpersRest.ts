import { supabase } from './supabase';
import { ensureEventParticipant } from './supabaseHelpers';
import { calculateTournamentPoints } from './tournamentPoints';
import { calculateRankings } from './tieBreaker';

export interface CompetitorWithScore {
  id: string;
  tournament_competitor_id?: string;
  name: string;
  avatar?: string;
  source_type?: string;
  totalScore: number;
  rank: number;
  placement?: string;
  isTied?: boolean;
  tie_breaker_status?: string;
  medal?: string;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
  has_video?: boolean;
  video_url?: string;
  final_rank?: number;
  points?: number;
}

function safeCalculateTournamentPoints(rank: any, tournamentClass: any, totalCompetitors: any): number {
  if (
    typeof rank !== 'number' ||
    typeof tournamentClass !== 'string' ||
    typeof totalCompetitors !== 'number'
  ) {
    console.error('[Points Error] Invalid inputs to calculateTournamentPoints:', {
      rank, tournamentClass, totalCompetitors,
    });
    return 0;
  }

  return calculateTournamentPoints(rank, tournamentClass, totalCompetitors);
}

export async function updateFinalRanks(eventId: string, skipRankUpdate = false, originalScores?: any) {
  try {
    console.log('[updateFinalRanks] Starting for eventId:', eventId);
    
    const { data: scores, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (scoresError) {
      console.error('[updateFinalRanks] Error fetching scores:', scoresError);
      throw scoresError;
    }
    
    if (!scores || scores.length === 0) {
      console.log('[updateFinalRanks] No scores found for event:', eventId);
      return;
    }
    
    // Calculate ranks based on total_score descending
    const sortedScores = [...scores].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    
    let currentRank = 1;
    const scoreGroups: { [score: number]: any[] } = {};
    
    // Group by score
    sortedScores.forEach(score => {
      const totalScore = score.total_score || 0;
      if (!scoreGroups[totalScore]) {
        scoreGroups[totalScore] = [];
      }
      scoreGroups[totalScore].push(score);
    });
    
    // Assign ranks
    const sortedScoreValues = Object.keys(scoreGroups).map(Number).sort((a, b) => b - a);
    
    for (const scoreValue of sortedScoreValues) {
      const group = scoreGroups[scoreValue];
      
      // All competitors in same score group get same rank
      for (const score of group) {
        const { error: updateError } = await supabase
          .from('event_scores')
          .update({
            rank: currentRank,
            final_rank: currentRank,
            placement: currentRank <= 3 ? `${currentRank}${currentRank === 1 ? 'st' : currentRank === 2 ? 'nd' : 'rd'}` : `${currentRank}th`,
            medal: currentRank === 1 ? 'gold' : currentRank === 2 ? 'silver' : currentRank === 3 ? 'bronze' : null
          })
          .eq('id', score.id);
        
        if (updateError) {
          console.error('[updateFinalRanks] Error updating score:', updateError);
          throw updateError;
        }
      }
      
      // Next rank skips by group size
      currentRank += group.length;
    }
    
    console.log('[updateFinalRanks] Successfully updated ranks for', sortedScores.length, 'scores');
  } catch (error) {
    console.error('[updateFinalRanks] Failed:', error);
    throw error;
  }
}

export async function fetchAvailableCompetitors(eventId: string, tournamentId: string) {
  if (!eventId || !tournamentId) {
    throw new Error(`[fetchAvailableCompetitors] Invalid params: ${eventId}, ${tournamentId}`);
  }

  console.log('[fetchAvailableCompetitors] Fetching for:', { eventId, tournamentId });

  // Get all competitors who already have scores in this event
  const { data: scoredCompetitors, error: scoresError } = await supabase
    .from('event_scores')
    .select('tournament_competitor_id')
    .eq('event_id', eventId);

  if (scoresError) {
    console.error('[fetchAvailableCompetitors] Error fetching scored competitors:', scoresError);
    throw scoresError;
  }

  const scoredIds = scoredCompetitors?.map(row => row.tournament_competitor_id) || [];
  console.log('[fetchAvailableCompetitors] Scored competitor IDs:', scoredIds);

  // Get all tournament competitors, excluding those who already have scores
  let query = supabase
    .from('tournament_competitors')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (scoredIds.length > 0) {
    query = query.not('id', 'in', `(${scoredIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchAvailableCompetitors] Error fetching available competitors:', error);
    throw error;
  }

  console.log('[fetchAvailableCompetitors] Available competitors found:', data?.length || 0);
  return data || [];
}

// Add competitors to event using the correct event ID
export async function addCompetitorsToEvent(eventId: string, competitorIds: string[], tournamentId: string) {
  try {
    console.log('[addCompetitorsToEvent] Adding competitors to event:', { eventId, competitorIds: competitorIds.length, tournamentId });
    
    if (!eventId || !competitorIds || competitorIds.length === 0) {
      console.warn('[addCompetitorsToEvent] Invalid parameters');
      return;
    }
    
    const insertPromises = competitorIds.map(async (competitorId) => {
      console.log('Inserting competitor with event_id:', eventId);
      
      // Ensure event participant record exists
      await ensureEventParticipant(eventId, competitorId, tournamentId);
      
      return { eventId, competitorId };
    });
    
    await Promise.all(insertPromises);
    console.log('[addCompetitorsToEvent] Successfully added competitors to event');
    
  } catch (error) {
    console.error('[addCompetitorsToEvent] Error adding competitors:', error);
    throw error;
  }
}