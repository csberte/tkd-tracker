import { supabase } from './supabase';
import { ensureEventExists, fetchEventCompetitorsWithScores, autoLinkCompetitorsToEvent } from './eventHelpersRest2Enhanced';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2Enhanced';
import { logEventId } from './eventIdLogger';
import { createEventIdGuard } from './eventIdGuard';

// Enhanced event initializer with race condition protection and duplicate prevention
export async function initializeEventAndLoadCompetitorsEnhanced(
  tournamentId: string,
  eventType: string = 'traditional_forms',
  setCurrentEventId?: (id: string) => void,
  router?: any
): Promise<{ eventId: string; competitors: CompetitorWithScore[] }> {
  try {
    console.log("[initializeEventEnhanced] STARTED", { eventType, tournamentId });
    
    logEventId('initializeEventEnhanced - START', 'N/A', { tournamentId, eventType });
    
    console.log('🚀 [initializeEventEnhanced] Starting initialization with duplicate prevention:');
    console.log('  - tournamentId:', tournamentId);
    console.log('  - eventType:', eventType);
    
    // Validate tournament ID
    if (!tournamentId || !validateUUID(tournamentId) || isProblematicUUID(tournamentId)) {
      console.error('❌ [initializeEventEnhanced] Invalid tournamentId:', tournamentId);
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    // Step 1: Ensure event exists with proper duplicate handling
    console.log('🔍 [initializeEventEnhanced] Ensuring event exists...');
    const eventId = await ensureEventExists(tournamentId, eventType);
    
    console.log("[initializeEventEnhanced] Event ID returned:", eventId);
    
    // Step 2: Validate returned eventId
    if (!eventId || !validateUUID(eventId)) {
      console.error('❌ [initializeEventEnhanced] Invalid event ID returned:', eventId);
      throw new Error(`Invalid event ID returned: ${eventId}`);
    }
    
    if (isProblematicUUID(eventId)) {
      console.error('❌ [initializeEventEnhanced] Problematic event ID returned:', eventId);
      throw new Error(`Problematic event ID returned: ${eventId}`);
    }
    
    logEventId('initializeEventEnhanced - EVENT_CONFIRMED', eventId, { tournamentId, eventType });
    
    // Step 3: Apply event ID guard
    console.log('🛡️ [initializeEventEnhanced] Applying event ID guard...');
    
    if (setCurrentEventId && router) {
      await createEventIdGuard(eventId, setCurrentEventId, router);
      console.log('✅ [initializeEventEnhanced] Event ID guard applied successfully');
    } else {
      // Manual validation if no guard parameters provided
      const { data: event, error } = await supabase
        .from('events')
        .select('id, tournament_id')
        .eq('id', eventId)
        .maybeSingle();
      
      if (error || !event) {
        throw new Error(`Event validation failed: ${eventId}`);
      }
      
      if (setCurrentEventId) {
        setCurrentEventId(eventId);
        logEventId('initializeEventEnhanced - STATE_UPDATED', eventId);
      }
    }
    
    // Step 4: Small delay for DB consistency
    console.log('⏳ [initializeEventEnhanced] Waiting for event to be fully ready...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 5: Fetch competitors
    console.log('👥 [initializeEventEnhanced] Fetching competitors for confirmed event...');
    logEventId('initializeEventEnhanced - FETCH_COMPETITORS', eventId);
    
    let competitors = await fetchEventCompetitorsWithScores(eventId);
    
    // Step 6: Auto-link competitors if none found
    if (!competitors || competitors.length === 0) {
      console.log('🔗 [initializeEventEnhanced] No competitors found, auto-linking...');
      console.log("[initializeEventEnhanced] Using existing event");
      logEventId('initializeEventEnhanced - AUTO_LINKING', eventId);
      
      // Validate tournament exists
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('id', tournamentId)
        .maybeSingle();
      
      if (tournamentError || !tournament) {
        console.error('❌ [initializeEventEnhanced] Tournament validation failed:', tournamentError);
        throw new Error(`Tournament not found: ${tournamentId}`);
      }
      
      // Auto-link competitors to the confirmed event
      await autoLinkCompetitorsToEvent(eventId, tournamentId, eventType);
      
      // Retry fetching competitors after linking
      console.log('🔄 [initializeEventEnhanced] Retrying competitor fetch after linking...');
      logEventId('initializeEventEnhanced - RETRY_FETCH', eventId);
      competitors = await fetchEventCompetitorsWithScores(eventId);
    }
    
    logEventId('initializeEventEnhanced - SUCCESS', eventId, { competitorCount: competitors.length });
    
    console.log('✅ [initializeEventEnhanced] Initialization complete:');
    console.log('  - Final confirmed event ID:', eventId);
    console.log('  - Competitors loaded:', competitors.length);
    console.log('  - Event ID guard applied:', !!(setCurrentEventId && router));
    
    return {
      eventId,
      competitors
    };
  } catch (error) {
    logEventId('initializeEventEnhanced - ERROR', 'N/A', { error: error.message });
    console.error('❌ [initializeEventEnhanced] Failed:', error.message || 'Unknown error');
    throw error;
  }
}