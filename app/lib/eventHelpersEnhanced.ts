import { supabase } from './supabase';
import { calculateSeasonalPoints } from './seasonalPointsFixed';

export async function updateFinalRanks(eventId: string) {
  console.log('[updateFinalRanks] Starting rank update for event:', eventId);
  
  try {
    // Get all scores for this event
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

    // Get tournament info for points calculation
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('tournament_id')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('[updateFinalRanks] Error fetching event:', eventError);
      throw eventError;
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('class')
      .eq('id', event.tournament_id)
      .single();

    if (tournamentError) {
      console.error('[updateFinalRanks] Error fetching tournament:', tournamentError);
      throw tournamentError;
    }

    // Calculate ranks
    let currentRank = 1;
    let previousScore = null;
    let sameScoreCount = 0;
    
    const totalCompetitors = scores.length;
    console.log(`[updateFinalRanks] Processing ${totalCompetitors} competitors`);

    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      
      if (previousScore !== null && score.total_score < previousScore) {
        currentRank = i + 1;
        sameScoreCount = 0;
      } else if (previousScore !== null && score.total_score === previousScore) {
        sameScoreCount++;
      }
      
      // Calculate seasonal points
      const seasonalPoints = calculateSeasonalPoints(
        currentRank,
        tournament.class || 'C',
        totalCompetitors
      );
      
      console.log(`[updateFinalRanks] ${score.tournament_competitor_id}: rank ${currentRank}, points ${seasonalPoints}`);
      
      // Update the score record
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({
          final_rank: currentRank,
          points_earned: seasonalPoints
        })
        .eq('id', score.id);

      if (updateError) {
        console.error('[updateFinalRanks] Error updating score:', updateError);
        throw updateError;
      }
      
      previousScore = score.total_score;
    }
    
    console.log('[updateFinalRanks] Rank update completed successfully');
  } catch (error) {
    console.error('[updateFinalRanks] Error:', error);
    throw error;
  }
}

export async function getAllParticipantsInEvent(eventId: string) {
  console.log('[getAllParticipantsInEvent] Loading participants for event:', eventId);
  
  try {
    const { data: participants, error } = await supabase
      .from('event_participants')
      .select(`
        id,
        event_id,
        tournament_competitor_id,
        tournament_competitors!inner (
          id,
          name,
          avatar,
          competitor_id
        ),
        event_scores (
          id,
          judge_a_score,
          judge_b_score,
          judge_c_score,
          total_score,
          final_rank,
          points_earned,
          has_video,
          video_url
        )
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('[getAllParticipantsInEvent] Error:', error);
      throw error;
    }

    const processedParticipants = (participants || []).map(participant => {
      const competitor = participant.tournament_competitors;
      const score = participant.event_scores?.[0];
      
      return {
        id: participant.id,
        tournament_competitor_id: participant.tournament_competitor_id,
        name: competitor?.name || 'Unknown',
        avatar: competitor?.avatar,
        competitor_id: competitor?.competitor_id,
        judge_a_score: score?.judge_a_score,
        judge_b_score: score?.judge_b_score,
        judge_c_score: score?.judge_c_score,
        totalScore: score?.total_score || 0,
        rank: score?.final_rank || 0,
        final_rank: score?.final_rank || 0,
        points: score?.points_earned || 0,
        has_video: score?.has_video || false,
        video_url: score?.video_url
      };
    });

    console.log(`[getAllParticipantsInEvent] Processed ${processedParticipants.length} participants`);
    return processedParticipants;
  } catch (error) {
    console.error('[getAllParticipantsInEvent] Error:', error);
    throw error;
  }
}