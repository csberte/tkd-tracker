import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { sortByFinalRank, getDisplayRank, getMedalForRank } from './rankingConsistencyFix';

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
  total_score?: number;
}

export async function getAllParticipantsInEvent(eventId: string): Promise<CompetitorWithScore[]> {
  try {
    console.log('[getAllParticipantsInEvent] Starting with eventId:', eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('[getAllParticipantsInEvent] Invalid eventId:', eventId);
      return [];
    }
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[getAllParticipantsInEvent] Event not found:', eventId);
      return [];
    }
    
    // CRITICAL: Fetch both final_rank and placement for consistent ranking
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*, final_rank, rank, placement, medal')
      .eq('event_id', eventId);
    
    if (scoresError) {
      console.error('[getAllParticipantsInEvent] Scores fetch error:', scoresError);
      return [];
    }
    
    console.log('[getAllParticipantsInEvent] Found scores:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[getAllParticipantsInEvent] No scores found');
      return [];
    }
    
    // For each score, get the competitor details
    const competitors: CompetitorWithScore[] = [];
    
    for (const score of scoresData) {
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id, name, avatar, source_type')
        .eq('id', score.tournament_competitor_id)
        .maybeSingle();
      
      if (competitorError || !competitorData) {
        console.warn('[getAllParticipantsInEvent] Competitor not found for score:', score.id);
        continue;
      }
      
      // Use display rank logic for consistent ranking
      const displayRank = getDisplayRank(score);
      const medalEmoji = score.medal || getMedalForRank(displayRank);
      
      competitors.push({
        id: score.id,
        tournament_competitor_id: competitorData.id,
        name: competitorData.name,
        avatar: competitorData.avatar,
        source_type: competitorData.source_type,
        totalScore: score.total_score || 0,
        total_score: score.total_score || 0,
        rank: score.rank || 0,
        final_rank: score.final_rank || score.rank || 0,
        placement: score.placement,
        tie_breaker_status: score.tie_breaker_status,
        medal: medalEmoji,
        points: score.points,
        isTied: false,
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        has_video: score.has_video || false,
        video_url: score.video_url
      });
    }
    
    // CRITICAL FIX: Sort using final_rank consistently
    const sortedCompetitors = sortByFinalRank(competitors);
    
    console.log('[getAllParticipantsInEvent] Final competitors count:', sortedCompetitors.length);
    console.log('[getAllParticipantsInEvent] Sorted order:', sortedCompetitors.map(c => `${c.name}: final_rank=${c.final_rank}, rank=${c.rank}`));
    return sortedCompetitors;
  } catch (error) {
    console.error('[getAllParticipantsInEvent] Failed:', error.message || 'Unknown error');
    return [];
  }
}