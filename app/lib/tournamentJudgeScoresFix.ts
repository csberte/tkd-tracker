import { supabase } from './supabase';

/**
 * Fix for tournament judge scores query - uses event_participant_id instead of competitor_id
 */
export async function getJudgeScoresForTournament(tournamentId: string) {
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .select(`
        id,
        event_id,
        event_participant_id,
        judge_a_score,
        judge_b_score,
        judge_c_score,
        total_score,
        final_rank,
        event_participants!inner(
          id,
          tournament_competitor_id,
          tournament_competitors!inner(
            id,
            name
          ),
          tournament_events!inner(
            id,
            tournament_id,
            events!inner(
              id,
              name,
              type
            )
          )
        )
      `)
      .eq('event_participants.tournament_events.tournament_id', tournamentId)
      .order('final_rank', { ascending: true });

    if (error) {
      console.error('Error loading judge scores:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getJudgeScoresForTournament:', error);
    throw error;
  }
}

/**
 * Get judge scores for a specific event participant
 */
export async function getJudgeScoresForEventParticipant(eventId: string, eventParticipantId: string) {
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .select('judge_a_score, judge_b_score, judge_c_score, total_score, final_rank')
      .eq('event_id', eventId)
      .eq('event_participant_id', eventParticipantId)
      .single();

    if (error) {
      console.error('Error loading judge scores for participant:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getJudgeScoresForEventParticipant:', error);
    return null;
  }
}

/**
 * Format judge scores for display
 */
export function formatJudgeScores(scores: {
  judge_a_score: number;
  judge_b_score: number;
  judge_c_score: number;
  total_score: number;
}): string {
  const { judge_a_score, judge_b_score, judge_c_score, total_score } = scores;
  const judgeScores = `(${Math.round(judge_b_score)}, ${Math.round(judge_c_score)}, ${Math.round(judge_a_score)})`;
  return `Judge's Score: ${Math.round(total_score)} ${judgeScores}`;
}