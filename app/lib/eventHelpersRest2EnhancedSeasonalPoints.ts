import { supabase } from './supabase';
import { calculateSeasonalPoints } from './seasonalPointsFixed';

export async function getAllParticipantsInEvent(eventId: string) {
  try {
    const { data: participantsData, error } = await supabase
      .from('event_participants')
      .select(`
        *,
        tournament_competitor:tournament_competitors!event_participants_tournament_competitor_id_fkey(
          id,
          name,
          avatar,
          source_type,
          school
        )
      `)
      .eq('event_id', eventId);
    
    if (error) {
      console.error('[getAllParticipantsInEvent] Error loading participants:', error);
      return [];
    }
    
    // Now get scores for each participant
    const participantIds = (participantsData || []).map(p => p.id);
    
    let scoresData = [];
    if (participantIds.length > 0) {
      const { data: scores, error: scoresError } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .in('event_participant_id', participantIds);
      
      if (scoresError) {
        console.error('[getAllParticipantsInEvent] Error loading scores:', scoresError);
      } else {
        scoresData = scores || [];
      }
    }
    
    // Transform and merge the data
    const transformedData = (participantsData || []).map(participant => {
      const score = scoresData.find(s => s.event_participant_id === participant.id) || {};
      
      return {
        ...participant,
        tournament_competitor: participant.tournament_competitor,
        tournament_competitor_id: participant.tournament_competitor_id,
        // Score data from event_scores
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        totalScore: score.total_score || 0,
        rank: score.final_rank || score.rank || 0,
        final_rank: score.final_rank,
        points_earned: score.points_earned || score.points || 0, // Use points_earned field
        placement: score.placement,
        medal: score.medal,
        has_video: score.has_video || false,
        video_url: score.video_url,
        tie_breaker_status: score.tie_breaker_status,
        isTied: score.tie_breaker_status === 'tied'
      };
    });
    
    return transformedData;
  } catch (error) {
    console.error('[getAllParticipantsInEvent] Unexpected error:', error);
    return [];
  }
}

export async function updateFinalRanks(eventId: string) {
  try {
    // Get all scores for this event
    const { data: scores, error } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (error) {
      console.error('[updateFinalRanks] Error fetching scores:', error);
      return;
    }
    
    if (!scores || scores.length === 0) {
      return;
    }
    
    // Get tournament info for points calculation
    const { data: eventData, error: eventError } = await supabase
      .from('tournament_events')
      .select(`
        *,
        tournament:tournaments!tournament_events_tournament_id_fkey(
          id,
          name,
          class
        )
      `)
      .eq('event_id', eventId)
      .single();
    
    if (eventError) {
      console.error('[updateFinalRanks] Error fetching event/tournament:', eventError);
      return;
    }
    
    const tournamentClass = eventData?.tournament?.class || 'C';
    const totalCompetitors = scores.length;
    
    // Calculate ranks and points using the confirmed seasonal points system
    const updates = scores.map((score, index) => {
      const rank = index + 1;
      const points = calculateSeasonalPoints(rank, tournamentClass, totalCompetitors);
      
      let medal = null;
      if (rank === 1) medal = 'gold';
      else if (rank === 2) medal = 'silver';
      else if (rank === 3) medal = 'bronze';
      
      return {
        id: score.id,
        final_rank: rank,
        points_earned: points,
        medal: medal,
        placement: rank
      };
    });
    
    // Update all scores with correct points_earned values
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('event_scores')
        .update({
          final_rank: update.final_rank,
          points_earned: update.points_earned,
          medal: update.medal,
          placement: update.placement
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`[updateFinalRanks] Error updating score ${update.id}:`, updateError);
      }
    }
    
  } catch (error) {
    console.error('[updateFinalRanks] Unexpected error:', error);
  }
}

export async function getAllEventScores(eventId: string) {
  try {
    const { data: scoresData, error } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    if (error) {
      console.error('[getAllEventScores] Error:', error);
      return [];
    }
    
    return scoresData || [];
  } catch (error) {
    console.error('[getAllEventScores] Unexpected error:', error);
    return [];
  }
}