import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';
import { logEventId } from './eventIdLogger';

// Final event initializer - eliminates all navigation fallbacks
export async function initializeEventAndLoadCompetitorsFinal(
  tournamentId: string,
  eventType: string = 'traditional_forms',
  setCurrentEventId?: (id: string) => void,
  router?: any
): Promise<{ eventId: string; competitors: CompetitorWithScore[] }> {
  try {
    console.log('[initializeEventFinal] 🚀 Starting initialization');
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    // Step 1: Check for existing event first
    const { data: existingEvents, error: findError } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType.trim().toLowerCase());
    
    let eventId: string;
    
    if (findError) {
      console.error('[initializeEventFinal] ❌ Error finding event:', findError);
      throw findError;
    }
    
    if (existingEvents && existingEvents.length > 0) {
      eventId = existingEvents[0].id;
      console.log('[initializeEventFinal] ✅ Using existing event:', eventId);
    } else {
      // Step 2: Create new event only if none exists
      console.log('[initializeEventFinal] 🆕 Creating new event');
      
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          tournament_id: tournamentId,
          event_type: eventType.trim().toLowerCase(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (createError) {
        // Handle duplicate constraint error gracefully
        if (createError.message && createError.message.includes('duplicate key')) {
          console.log('[initializeEventFinal] 🔄 Duplicate detected, refetching...');
          
          const { data: retryEvents, error: retryError } = await supabase
            .from('events')
            .select('id')
            .eq('tournament_id', tournamentId)
            .eq('event_type', eventType.trim().toLowerCase())
            .limit(1);
          
          if (!retryError && retryEvents && retryEvents.length > 0) {
            eventId = retryEvents[0].id;
            console.log('[initializeEventFinal] ✅ Found existing after duplicate:', eventId);
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        eventId = newEvent.id;
        console.log('[initializeEventFinal] ✅ Created new event:', eventId);
      }
    }
    
    // Step 3: Validate final event ID
    if (!eventId || !validateUUID(eventId)) {
      throw new Error(`Invalid event ID: ${eventId}`);
    }
    
    // Step 4: Set current event ID (NO NAVIGATION FALLBACK)
    if (setCurrentEventId) {
      setCurrentEventId(eventId);
      logEventId('initializeEventFinal - SET_ID', eventId);
    }
    
    // Step 5: Fetch competitors
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    let competitors: CompetitorWithScore[] = [];
    
    if (scoresError) {
      console.error('[initializeEventFinal] ❌ Error fetching scores:', scoresError);
    } else if (scoresData && scoresData.length > 0) {
      for (const score of scoresData) {
        const { data: competitorData, error: competitorError } = await supabase
          .from('tournament_competitors')
          .select('id, name, avatar, source_type')
          .eq('id', score.tournament_competitor_id)
          .maybeSingle();
        
        if (!competitorError && competitorData) {
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
      }
    }
    
    console.log('[initializeEventFinal] ✅ Initialization complete:', {
      eventId,
      competitorCount: competitors.length
    });
    
    return { eventId, competitors };
  } catch (error) {
    console.error('[initializeEventFinal] ❌ Critical error:', error.message);
    // CRITICAL: NO navigation fallback - let screen handle gracefully
    throw error;
  }
}
