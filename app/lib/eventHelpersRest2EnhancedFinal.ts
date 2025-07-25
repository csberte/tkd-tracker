import { supabase } from './supabase';

export async function getAllParticipantsInEvent(eventId: string) {
  console.log('[getAllParticipantsInEvent] Loading participants for event:', eventId);
  
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
        ),
        event_scores(
          judge_a_score,
          judge_b_score,
          judge_c_score,
          total_score,
          rank,
          final_rank,
          points,
          placement,
          medal,
          has_video,
          video_url,
          tie_breaker_status
        )
      `)
      .eq('event_id', eventId);
    
    if (error) {
      console.error('[getAllParticipantsInEvent] Error:', error);
      return [];
    }
    
    console.log('[getAllParticipantsInEvent] Raw data:', participantsData);
    
    // Transform the data to flatten the score information
    const transformedData = (participantsData || []).map(participant => {
      const scores = participant.event_scores?.[0] || {};
      
      return {
        ...participant,
        tournament_competitor: participant.tournament_competitor,
        tournament_competitor_id: participant.tournament_competitor_id,
        // Flatten score data
        judge_a_score: scores.judge_a_score,
        judge_b_score: scores.judge_b_score,
        judge_c_score: scores.judge_c_score,
        totalScore: scores.total_score || 0,
        rank: scores.final_rank || scores.rank || 0,
        final_rank: scores.final_rank,
        points: scores.points || 0,
        placement: scores.placement,
        medal: scores.medal,
        has_video: scores.has_video || false,
        video_url: scores.video_url,
        tie_breaker_status: scores.tie_breaker_status,
        isTied: scores.tie_breaker_status === 'tied'
      };
    });
    
    console.log('[getAllParticipantsInEvent] Transformed data:', transformedData);
    console.log('[getAllParticipantsInEvent] Participants count:', transformedData.length);
    
    return transformedData;
  } catch (error) {
    console.error('[getAllParticipantsInEvent] Unexpected error:', error);
    return [];
  }
}

export async function getAllEventScores(eventId: string) {
  console.log('[getAllEventScores] Loading scores for event:', eventId);
  
  try {
    const { data: scoresData, error } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    if (error) {
      console.error('[getAllEventScores] Error:', error);
      return [];
    }
    
    console.log('[getAllEventScores] Scores data:', scoresData);
    return scoresData || [];
  } catch (error) {
    console.error('[getAllEventScores] Unexpected error:', error);
    return [];
  }
}