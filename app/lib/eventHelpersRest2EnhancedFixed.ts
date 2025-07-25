import { supabase } from './supabase';
import { ensureEventParticipant, createEvent } from './supabaseHelpers';
import { updateFinalRanks } from './eventHelpersRest';
import { validateUUID, isProblematicUUID } from './utils';
import { fetchScoresForEvent, sortCompetitorsByRank } from './scoresFetcher';

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
    
    // Validate event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[getAllParticipantsInEvent] Event not found:', eventId);
      return [];
    }
    
    console.log('[getAllParticipantsInEvent] Event validated, fetching scores...');
    
    // Use the new score fetcher with proper join
    const scoresData = await fetchScoresForEvent(eventId);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[getAllParticipantsInEvent] No scores found');
      return [];
    }
    
    // Transform scores data to competitor format
    const competitors: CompetitorWithScore[] = [];
    
    for (const score of scoresData) {
      // Get competitor name from join or fetch separately if needed
      let competitorName = score.tournament_competitor?.name;
      
      if (!competitorName) {
        const { data: competitorData } = await supabase
          .from('tournament_competitors')
          .select('name, avatar, source_type')
          .eq('id', score.tournament_competitor_id)
          .maybeSingle();
        
        competitorName = competitorData?.name || 'Unknown';
      }
      
      competitors.push({
        id: score.id,
        tournament_competitor_id: score.tournament_competitor_id,
        name: competitorName,
        avatar: score.avatar,
        source_type: score.source_type,
        totalScore: score.total_score || 0,
        total_score: score.total_score || 0,
        rank: score.final_rank || score.rank || 0,
        final_rank: score.final_rank,
        placement: score.placement,
        tie_breaker_status: score.tie_breaker_status,
        medal: score.medal,
        points: score.points,
        isTied: false,
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        has_video: score.has_video || false,
        video_url: score.video_url
      });
    }
    
    // Apply the required sorting logic
    const sortedCompetitors = sortCompetitorsByRank(competitors);
    
    console.log('[getAllParticipantsInEvent] Final competitors count:', sortedCompetitors.length);
    return sortedCompetitors;
    
  } catch (error) {
    console.error('[getAllParticipantsInEvent] Failed:', error.message || 'Unknown error');
    return [];
  }
}