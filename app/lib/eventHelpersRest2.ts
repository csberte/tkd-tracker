import { supabase } from './supabase';
import { ensureEventParticipant, createEvent } from './supabaseHelpers';
import { updateFinalRanks } from './eventHelpersRest';
import { validateUUID, isProblematicUUID } from './utils';
import { printEventIdTrace } from './debugHelpers';

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
    
    // Validate the returned eventId is a proper UUID
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

export async function autoLinkCompetitorsToEvent(eventId: string, tournamentId: string, eventType: string): Promise<void> {
  try {
    console.log('🔗 [autoLinkCompetitorsToEvent] Starting auto-link process');
    
    const { data: competitors, error: competitorsError } = await supabase
      .from('tournament_competitors')
      .select('id')
      .eq('tournament_id', tournamentId);
    
    if (competitorsError) {
      throw competitorsError;
    }
    
    if (!competitors || competitors.length === 0) {
      console.log('ℹ️ [autoLinkCompetitorsToEvent] No competitors found to link');
      return;
    }
    
    for (const competitor of competitors) {
      await ensureEventParticipant(eventId, competitor.id);
    }
    
    console.log('✅ [autoLinkCompetitorsToEvent] Linked', competitors.length, 'competitors');
  } catch (error) {
    console.error('❌ [autoLinkCompetitorsToEvent] Failed:', error.message);
    throw error;
  }
}

export async function fetchEventCompetitorsWithScores(eventId: string): Promise<CompetitorWithScore[]> {
  try {
    console.log('🔍 [fetchEventCompetitorsWithScores] Starting with eventId:', eventId);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - START');
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('❌ [fetchEventCompetitorsWithScores] Invalid eventId:', eventId);
      printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - INVALID_EVENT_ID');
      return [];
    }
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('❌ [fetchEventCompetitorsWithScores] Event not found:', eventId);
      printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - EVENT_NOT_FOUND');
      return [];
    }
    
    console.log('✅ [fetchEventCompetitorsWithScores] Event found:', event);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - EVENT_VALIDATED');
    
    // First, get all scores for this event
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    if (scoresError) {
      console.error('❌ [fetchEventCompetitorsWithScores] Scores fetch error:', scoresError);
      printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - SCORES_FETCH_ERROR');
      return [];
    }
    
    console.log('📊 [fetchEventCompetitorsWithScores] Scores data:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('ℹ️ [fetchEventCompetitorsWithScores] No scores found - returning empty array');
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
        console.warn('⚠️ [fetchEventCompetitorsWithScores] Competitor not found for score:', score.id);
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
    
    console.log('✅ [fetchEventCompetitorsWithScores] Final competitors count:', competitors.length);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - SUCCESS', { competitorsCount: competitors.length });
    return competitors;
  } catch (error) {
    console.error('❌ [fetchEventCompetitorsWithScores] Failed:', error.message || 'Unknown error');
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - ERROR', { error: error.message });
    return [];
  }
}

export async function fetchAvailableCompetitors(tournamentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('tournament_competitors')
      .select('*')
      .eq('tournament_id', tournamentId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch available competitors:', error);
    return [];
  }
}