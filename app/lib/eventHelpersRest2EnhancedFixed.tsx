import { supabase } from './supabase';
import { ensureEventParticipant, createEvent } from './supabaseHelpers';
import { updateFinalRanks } from './eventHelpersRest';
import { validateUUID, isProblematicUUID } from './utils';
import { printEventIdTrace } from './debugHelpers';
import { retryFetchWithBackoff } from './scoreConfirmationHelpers';

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

export async function ensureEventExists(tournamentId: string, eventType: string): Promise<string> {
  try {
    console.log('🔍 [ensureEventExists] Checking for existing event:', { tournamentId, eventType });
    
    const { data: existingEvent, error: findError } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType)
      .maybeSingle();
    
    if (findError) {
      console.error('❌ [ensureEventExists] Error finding event:', findError);
      throw findError;
    }
    
    if (existingEvent) {
      console.log('✅ [ensureEventExists] Found existing event:', existingEvent.id);
      return existingEvent.id;
    }
    
    console.log('🆕 [ensureEventExists] Creating new event');
    const eventId = await createEvent(tournamentId, eventType);
    
    if (!eventId || !validateUUID(eventId)) {
      console.error('❌ [ensureEventExists] Invalid event ID returned from createEvent:', eventId);
      throw new Error(`Invalid event ID returned: ${eventId}`);
    }
    
    console.log('✅ [ensureEventExists] Created new event:', eventId);
    return eventId;
  } catch (error) {
    console.error('❌ [ensureEventExists] Failed:', error.message);
    throw error;
  }
}

export async function fetchEventCompetitorsWithScoresEnhancedFixed(eventId: string): Promise<CompetitorWithScore[]> {
  try {
    console.log('🔍 [fetchEventCompetitorsWithScoresEnhancedFixed] Starting with eventId:', eventId);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScoresEnhancedFixed - START');
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('❌ [fetchEventCompetitorsWithScoresEnhancedFixed] Invalid eventId:', eventId);
      printEventIdTrace(eventId, 'fetchEventCompetitorsWithScoresEnhancedFixed - INVALID_EVENT_ID');
      return [];
    }
    
    const fetchOperation = async (): Promise<CompetitorWithScore[]> => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, tournament_id')
        .eq('id', eventId)
        .maybeSingle();
      
      if (eventError || !event) {
        console.error('❌ [fetchEventCompetitorsWithScoresEnhancedFixed] Event not found:', eventId);
        return [];
      }
      
      const { data: scores, error: scoresError } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId);
      
      if (scoresError) {
        console.error('❌ [fetchEventCompetitorsWithScoresEnhancedFixed] Scores fetch failed:', scoresError);
        throw scoresError;
      }
      
      if (!scores || scores.length === 0) {
        console.log('ℹ️ [fetchEventCompetitorsWithScoresEnhancedFixed] No scores found');
        return [];
      }
      
      const competitors: CompetitorWithScore[] = [];
      
      for (const score of scores) {
        const { data: competitorData, error: competitorError } = await supabase
          .from('tournament_competitors')
          .select('id, name, avatar, source_type')
          .eq('id', score.tournament_competitor_id)
          .maybeSingle();
        
        if (competitorError || !competitorData) {
          console.warn('⚠️ [fetchEventCompetitorsWithScoresEnhancedFixed] Competitor not found for score:', score.id);
          continue;
        }
        
        competitors.push({
          id: score.id,
          tournament_competitor_id: competitorData.id,
          name: competitorData.name,
          avatar: competitorData.avatar,
          source_type: competitorData.source_type,
          totalScore: score.total_score || 0,
          rank: score.rank || 0,
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
      
      return competitors;
    };
    
    const competitors = await retryFetchWithBackoff(
      fetchOperation,
      {
        maxAttempts: 3,
        delayMs: 100,
        minResults: 0
      }
    );
    
    console.log(`✅ Displayed ${competitors.length} competitor cards`);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScoresEnhancedFixed - SUCCESS', { competitorsCount: competitors.length });
    return competitors;
  } catch (error) {
    console.error('❌ [fetchEventCompetitorsWithScoresEnhancedFixed] Failed:', error.message || 'Unknown error');
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScoresEnhancedFixed - ERROR', { error: error.message });
    return [];
  }
}

export async function fetchAvailableCompetitors(tournamentId: string, eventId: string): Promise<any[]> {
  try {
    console.log('🔍 [fetchAvailableCompetitors] Starting with:', { tournamentId, eventId });
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      console.error('❌ [fetchAvailableCompetitors] Invalid tournamentId:', tournamentId);
      return [];
    }
    
    if (!eventId || !validateUUID(eventId)) {
      console.error('❌ [fetchAvailableCompetitors] Invalid eventId:', eventId);
      return [];
    }
    
    // Get all tournament competitors
    const { data: allCompetitors, error: competitorsError } = await supabase
      .from('tournament_competitors')
      .select('id, name, avatar, source_type')
      .eq('tournament_id', tournamentId);
    
    if (competitorsError) {
      console.error('❌ [fetchAvailableCompetitors] Failed to fetch competitors:', competitorsError);
      return [];
    }
    
    if (!allCompetitors || allCompetitors.length === 0) {
      console.log('ℹ️ [fetchAvailableCompetitors] No competitors found in tournament');
      return [];
    }
    
    // Get competitors who already have scores in this event
    const { data: scoredCompetitors, error: scoresError } = await supabase
      .from('event_scores')
      .select('tournament_competitor_id')
      .eq('event_id', eventId);
    
    if (scoresError) {
      console.error('❌ [fetchAvailableCompetitors] Failed to fetch scores:', scoresError);
      return [];
    }
    
    const scoredIds = new Set(scoredCompetitors?.map(s => s.tournament_competitor_id) || []);
    
    // Filter out competitors who already have scores
    const availableCompetitors = allCompetitors.filter(competitor => 
      !scoredIds.has(competitor.id)
    );
    
    console.log(`✅ [fetchAvailableCompetitors] Found ${availableCompetitors.length} available competitors`);
    return availableCompetitors;
  } catch (error) {
    console.error('❌ [fetchAvailableCompetitors] Failed:', error.message || 'Unknown error');
    return [];
  }
}