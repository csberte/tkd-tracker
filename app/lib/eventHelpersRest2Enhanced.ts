import { supabase } from './supabase';
import { createEvent } from './supabaseHelpers';
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
  points_earned?: number;
}

// Enhanced event existence check with proper duplicate handling
export async function ensureEventExists(tournamentId: string, eventType: string): Promise<string> {
  try {
    console.log('[ensureEventExists] STARTED', { eventType, tournamentId });
    
    // Check for existing event using maybeSingle() to avoid JSON parse errors
    const { data: existingEvents, error: findError } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType);
    
    if (findError) {
      console.error('[ensureEventExists] ❌ Error finding event:', findError);
      throw findError;
    }
    
    // Handle the 3 scenarios explicitly
    if (existingEvents && existingEvents.length === 1) {
      console.log('[ensureEventExists] ✅ Event already exists:', existingEvents[0].id);
      return existingEvents[0].id;
    }
    
    if (existingEvents && existingEvents.length > 1) {
      console.error('[ensureEventExists] ❌ DUPLICATE EVENTS FOUND:', existingEvents);
      throw new Error('Duplicate events found for this tournament and type.');
    }
    
    // No existing event found - create new one
    console.log('[ensureEventExists] 🆕 Creating new event');
    const eventId = await createEvent(tournamentId, eventType);
    
    if (!eventId || !validateUUID(eventId)) {
      console.error('[ensureEventExists] ❌ Invalid event ID returned:', eventId);
      throw new Error(`Invalid event ID returned: ${eventId}`);
    }
    
    console.log('[ensureEventExists] ✅ Created event:', eventId);
    return eventId;
  } catch (error) {
    console.error('[ensureEventExists] ❌ Failed:', error.message);
    throw error;
  }
}

// Auto-link competitors to event
export async function autoLinkCompetitorsToEvent(eventId: string, tournamentId: string, eventType: string): Promise<void> {
  try {
    console.log('[autoLinkCompetitorsToEvent] Starting auto-link process');
    
    const { data: competitors, error: competitorsError } = await supabase
      .from('tournament_competitors')
      .select('id')
      .eq('tournament_id', tournamentId);
    
    if (competitorsError) {
      throw competitorsError;
    }
    
    if (!competitors || competitors.length === 0) {
      console.log('[autoLinkCompetitorsToEvent] No competitors found to link');
      return;
    }
    
    for (const competitor of competitors) {
      // Check if participant already exists
      const { data: existing } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id)
        .maybeSingle();
      
      if (!existing) {
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            tournament_competitor_id: competitor.id,
            event_type: eventType
          });
      }
    }
    
    console.log('[autoLinkCompetitorsToEvent] ✅ Linked', competitors.length, 'competitors');
  } catch (error) {
    console.error('[autoLinkCompetitorsToEvent] ❌ Failed:', error.message);
    throw error;
  }
}

// Get all participants in an event with scores
export async function getAllParticipantsInEvent(eventId: string): Promise<CompetitorWithScore[]> {
  return await fetchEventCompetitorsWithScores(eventId);
}

// Fetch event competitors with scores
export async function fetchEventCompetitorsWithScores(eventId: string): Promise<CompetitorWithScore[]> {
  try {
    console.log('[fetchEventCompetitorsWithScores] Starting with eventId:', eventId);
    printEventIdTrace(eventId, 'fetchEventCompetitorsWithScores - START');
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('[fetchEventCompetitorsWithScores] ❌ Invalid eventId:', eventId);
      return [];
    }
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[fetchEventCompetitorsWithScores] ❌ Event not found:', eventId);
      return [];
    }
    
    console.log('[fetchEventCompetitorsWithScores] ✅ Event found:', event);
    
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    if (scoresError) {
      console.error('[fetchEventCompetitorsWithScores] ❌ Scores fetch error:', scoresError);
      return [];
    }
    
    console.log('[fetchEventCompetitorsWithScores] Scores data:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[fetchEventCompetitorsWithScores] No scores found - returning empty array');
      return [];
    }
    
    const competitors: CompetitorWithScore[] = [];
    
    for (const score of scoresData) {
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id, name, avatar, source_type')
        .eq('id', score.tournament_competitor_id)
        .maybeSingle();
      
      if (competitorError || !competitorData) {
        console.warn('[fetchEventCompetitorsWithScores] ⚠️ Competitor not found for score:', score.id);
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
        points: score.points || 0,
        points_earned: score.points_earned || 0,
        isTied: false,
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        has_video: score.has_video || false,
        video_url: score.video_url
      });
    }
    
    console.log('[fetchEventCompetitorsWithScores] ✅ Final competitors count:', competitors.length);
    return competitors;
  } catch (error) {
    console.error('[fetchEventCompetitorsWithScores] ❌ Failed:', error.message || 'Unknown error');
    return [];
  }
}