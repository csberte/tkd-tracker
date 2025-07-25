import { supabase } from './supabase';
import { validateUUID } from './utils';
import { getRealEventId } from './eventIdValidatorFixed';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';

// Ultimate event initializer that fixes null name constraint issue
export async function initializeEventAndLoadCompetitors(
  tournamentId: string,
  eventType: string = 'traditional_forms',
  setCurrentEventId?: (id: string) => void
): Promise<{ eventId: string; competitors: CompetitorWithScore[] }> {
  try {
    console.log('[initializeEventUltimate] 🚀 Starting initialization with REAL event IDs only');
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    // Step 1: Get real event ID from database
    let eventId = await getRealEventId(tournamentId, eventType);
    
    // Step 2: If no event exists, create one with proper name field
    if (!eventId) {
      console.log('[initializeEventUltimate] 🆕 Creating new event for tournament:', tournamentId);
      
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
          console.log('[initializeEventUltimate] 🔄 Duplicate detected, refetching real event ID...');
          eventId = await getRealEventId(tournamentId, eventType);
          
          if (!eventId) {
            throw new Error('Failed to create or find event after duplicate key error');
          }
        } else {
          throw createError;
        }
      } else {
        eventId = newEvent.id;
        console.log('[initializeEventUltimate] ✅ Created new event with REAL ID:', eventId);
      }
    }
    
    // Step 3: Validate the event ID is real and exists
    if (!eventId || !validateUUID(eventId)) {
      throw new Error(`Invalid event ID after initialization: ${eventId}`);
    }
    
    // Step 4: Double-check event exists in database
    const { data: eventCheck, error: checkError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .single();
    
    if (checkError || !eventCheck) {
      throw new Error(`Event ID ${eventId} does not exist in database`);
    }
    
    console.log('[initializeEventUltimate] ✅ Event validated in database:', eventCheck.id);
    
    if (setCurrentEventId) {
      setCurrentEventId(eventId);
    }
    
    // Step 5: Fetch competitors using the validated event ID
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId);
    
    let competitors: CompetitorWithScore[] = [];
    
    if (scoresError) {
      console.error('[initializeEventUltimate] ❌ Error fetching scores:', scoresError);
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
    
    console.log('[initializeEventUltimate] ✅ Initialization complete with REAL event ID:', {
      eventId,
      competitorCount: competitors.length
    });
    
    return { eventId, competitors };
  } catch (error) {
    console.error('[initializeEventUltimate] ❌ Critical error:', error.message);
    throw error;
  }
}