import { supabase } from './supabase';
import { ensureEventExists, fetchEventCompetitorsWithScores, autoLinkCompetitorsToEvent } from './eventHelpersRest2';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2';
import { logEventId } from './eventIdLogger';

// Enhanced initializeEventAndLoadCompetitors with comprehensive event ID logging
export async function initializeEventAndLoadCompetitors(
  tournamentId: string,
  eventType: string = 'traditional_forms',
  setCurrentEventId?: (id: string) => void,
  router?: any
): Promise<{ eventId: string; competitors: CompetitorWithScore[] }> {
  try {
    logEventId('initializeEventAndLoadCompetitors - START', 'N/A', { tournamentId, eventType });
    
    console.log('🚀 [initializeEventAndLoadCompetitors] Starting initialization:');
    console.log('  - tournamentId:', tournamentId);
    console.log('  - eventType:', eventType);
    
    // Validate tournament ID
    if (!tournamentId || !validateUUID(tournamentId) || isProblematicUUID(tournamentId)) {
      console.error('❌ [initializeEventAndLoadCompetitors] Invalid tournamentId:', tournamentId);
      throw new Error(`Invalid tournament ID: ${tournamentId}`);
    }
    
    // Step 1: Ensure event exists (with race condition protection)
    console.log('🔍 [initializeEventAndLoadCompetitors] Ensuring event exists...');
    const eventId = await ensureEventExists(tournamentId, eventType);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('❌ [initializeEventAndLoadCompetitors] Invalid eventId returned:', eventId);
      throw new Error(`Invalid event ID returned: ${eventId}`);
    }
    
    logEventId('initializeEventAndLoadCompetitors - EVENT_CONFIRMED', eventId, { tournamentId, eventType });
    
    console.log('✅ [initializeEventAndLoadCompetitors] Event confirmed with valid ID:', eventId);
    
    // Step 2: Update state and navigation with confirmed event ID
    if (setCurrentEventId) {
      console.log('🔄 [initializeEventAndLoadCompetitors] Updating currentEventId state to:', eventId);
      setCurrentEventId(eventId);
      logEventId('initializeEventAndLoadCompetitors - STATE_UPDATED', eventId, { action: 'setCurrentEventId' });
    }
    
    if (router) {
      console.log('🔄 [initializeEventAndLoadCompetitors] Updating router params with eventId:', eventId);
      router.setParams({ eventId });
      logEventId('initializeEventAndLoadCompetitors - ROUTER_UPDATED', eventId, { action: 'router.setParams' });
    }
    
    // Step 3: Only proceed with fetching competitors after event is confirmed present
    console.log('👥 [initializeEventAndLoadCompetitors] Fetching competitors for confirmed event...');
    logEventId('initializeEventAndLoadCompetitors - FETCH_COMPETITORS', eventId);
    
    let competitors = await fetchEventCompetitorsWithScores(eventId);
    
    // Step 4: If no competitors found, auto-link them
    if (!competitors || competitors.length === 0) {
      console.log('🔗 [initializeEventAndLoadCompetitors] No competitors found, auto-linking...');
      logEventId('initializeEventAndLoadCompetitors - AUTO_LINKING', eventId);
      
      // Get tournament info for auto-linking
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentError || !tournament) {
        console.error('❌ [initializeEventAndLoadCompetitors] Tournament validation failed:', tournamentError);
        throw new Error(`Tournament not found: ${tournamentId}`);
      }
      
      // Auto-link competitors to the confirmed event
      await autoLinkCompetitorsToEvent(eventId, tournamentId, eventType);
      
      // Retry fetching competitors after linking
      console.log('🔄 [initializeEventAndLoadCompetitors] Retrying competitor fetch after linking...');
      logEventId('initializeEventAndLoadCompetitors - RETRY_FETCH', eventId);
      competitors = await fetchEventCompetitorsWithScores(eventId);
    }
    
    logEventId('initializeEventAndLoadCompetitors - SUCCESS', eventId, { competitorCount: competitors.length });
    
    console.log('✅ [initializeEventAndLoadCompetitors] Initialization complete:');
    console.log('  - Final confirmed event ID:', eventId);
    console.log('  - Competitors loaded:', competitors.length);
    
    return {
      eventId,
      competitors
    };
  } catch (error) {
    logEventId('initializeEventAndLoadCompetitors - ERROR', 'N/A', { error: error.message });
    console.error('❌ [initializeEventAndLoadCompetitors] Failed:', error.message || 'Unknown error');
    throw error;
  }
}