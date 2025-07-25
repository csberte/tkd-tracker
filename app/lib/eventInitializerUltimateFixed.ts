import { supabase } from './supabase';
import { validateUUID } from './utils';
import { getRealEventId } from './eventIdValidatorFixed';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';

export async function initializeEventAndLoadCompetitorsFixed(
  tournamentId: string,
  eventType: string = 'traditional_forms',
  setCurrentEventId?: (id: string) => void
): Promise<{ eventId: string; competitors: CompetitorWithScore[] }> {
  try {
    console.log('[initializeEventUltimateFixed] Starting initialization');
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    let eventId = await getRealEventId(tournamentId, eventType);
    
    if (!eventId) {
      console.log('[initializeEventUltimateFixed] Creating new event');
      
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          tournament_id: tournamentId,
          event_type: eventType.trim().toLowerCase(),
          name: `${eventType} Event`,
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (createError) {
        if (createError.message && createError.message.includes('duplicate key')) {
          console.log('[initializeEventUltimateFixed] Duplicate detected, refetching');
          eventId = await getRealEventId(tournamentId, eventType);
          
          if (!eventId) {
            throw new Error('Failed to create or find event after duplicate key error');
          }
        } else {
          throw createError;
        }
      } else {
        eventId = newEvent.id;
        console.log('[initializeEventUltimateFixed] Created new event:', eventId);
      }
    }
    
    if (!eventId || !validateUUID(eventId)) {
      throw new Error(`Invalid event ID after initialization: ${eventId}`);
    }
    
    const { data: eventCheck, error: checkError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .single();
    
    if (checkError || !eventCheck) {
      throw new Error(`Event ID ${eventId} does not exist in database`);
    }
    
    console.log('[initializeEventUltimateFixed] Event validated:', eventCheck.id);
    
    if (setCurrentEventId) {
      setCurrentEventId(eventId);
    }
    
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    let competitors: CompetitorWithScore[] = [];
    
    if (scoresError) {
      console.error('[initializeEventUltimateFixed] Error fetching scores:', scoresError);
    } else if (scoresData && scoresData.length > 0) {
      console.log('[initializeEventUltimateFixed] Found scores:', scoresData.length);
      
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
        } else {
          console.warn('[initializeEventUltimateFixed] Competitor not found for score:', score.id);
        }
      }
    }
    
    console.log('[initializeEventUltimateFixed] Initialization complete:', {
      eventId,
      competitorCount: competitors.length
    });
    
    return { eventId, competitors };
  } catch (error) {
    console.error('[initializeEventUltimateFixed] Critical error:', error.message);
    throw error;
  }
}