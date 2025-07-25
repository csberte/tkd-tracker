import { supabase, rpcWithErrorHandling } from './supabase';
import { validateUUID } from './utils';

// Centralized Traditional Forms event management using atomic PostgreSQL function
export async function getOrCreateTraditionalFormsEvent(tournamentId: string): Promise<any | null> {
  try {
    console.log(`[getOrCreateTraditionalFormsEvent] Starting for tournament: ${tournamentId}`);
    
    if (!tournamentId || typeof tournamentId !== 'string') {
      console.error('[getOrCreateTraditionalFormsEvent] Invalid or missing tournamentId:', tournamentId);
      throw new Error('Invalid tournament ID');
    }
    
    if (!validateUUID(tournamentId)) {
      console.error('[getOrCreateTraditionalFormsEvent] Invalid tournament ID format:', tournamentId);
      throw new Error('Invalid tournament ID format');
    }
    
    console.log(`[getOrCreateTraditionalFormsEvent] Calling RPC with tournament ID: ${tournamentId}`);
    
    // Use enhanced RPC wrapper with better error handling
    const { data, error } = await rpcWithErrorHandling('atomic_get_or_create_traditional_forms_event', {
      p_tournament_id: tournamentId,
    });
    
    if (error) {
      console.error('[getOrCreateTraditionalFormsEvent] RPC wrapper returned error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('[getOrCreateTraditionalFormsEvent] No data returned from RPC');
      throw new Error('Event not returned from RPC');
    }
    
    const event = data[0];
    console.log(`[getOrCreateTraditionalFormsEvent] SUCCESS - Event:`, event);
    return event;
    
  } catch (error) {
    console.error(`[getOrCreateTraditionalFormsEvent] ERROR - Tournament: ${tournamentId}, Error:`, error);
    throw error;
  }
}

// Get event for tournament (read-only)
export async function getEventForTournament(tournamentId: string): Promise<any | null> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('event_type', 'traditional_forms')
      .single();
    
    if (error) {
      console.error('[getEventForTournament] Error:', error);
      return null;
    }
    
    return event;
  } catch (error) {
    console.error('[getEventForTournament] Unexpected error:', error);
    return null;
  }
}