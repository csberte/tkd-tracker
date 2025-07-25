import { supabase } from './supabase';
import { validateUUID } from './utils';
import { getOrCreateEvent } from './eventInitializerFixed';

// Core event validation functions to prevent phantom event IDs
export async function validateEventExists(eventId: string): Promise<{ valid: boolean; event?: any; error?: string }> {
  try {
    if (!eventId || !validateUUID(eventId)) {
      return { valid: false, error: 'Invalid UUID format' };
    }
    
    const { data: event, error } = await supabase
      .from('events')
      .select('id, tournament_id, event_type, name, date, user_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (error) {
      console.error('[validateEventExists] Database error:', error);
      return { valid: false, error: error.message };
    }
    
    if (!event) {
      console.error('[validateEventExists] Event not found:', eventId);
      return { valid: false, error: 'Event not found in database' };
    }
    
    // Validate event has required fields
    if (!event.event_type || !event.user_id) {
      console.error('[validateEventExists] Event missing required fields:', event);
      return { valid: false, error: 'Event missing required fields' };
    }
    
    return { valid: true, event };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Main function to get or create valid event ID with proper event_type filtering
export async function getOrCreateValidEventId(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    console.log(`[getOrCreateValidEventId] Starting for tournament: ${tournamentId}, event type: ${eventType}`);
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      console.error('[getOrCreateValidEventId] Invalid tournament ID');
      return null;
    }
    
    // Use the fixed getOrCreateEvent function
    const eventId = await getOrCreateEvent(tournamentId, eventType);
    
    if (!eventId) {
      console.error('[getOrCreateValidEventId] Failed to get or create event');
      return null;
    }
    
    // Validate the event exists and has proper data
    const validation = await validateEventExists(eventId);
    if (!validation.valid) {
      console.error('[getOrCreateValidEventId] Event validation failed:', validation.error);
      return null;
    }
    
    console.log(`[getOrCreateValidEventId] ✅ Using event ID: ${eventId} (${validation.event.event_type})`);
    return eventId;
    
  } catch (error) {
    console.error('[getOrCreateValidEventId] Error:', error);
    return null;
  }
}

// Get event with specific filtering for Traditional Forms
export async function getTraditionalFormsEvent(tournamentId: string): Promise<any | null> {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('event_type', 'traditional_forms')
      .not('user_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('[getTraditionalFormsEvent] Database error:', error);
      return null;
    }
    
    if (!events || events.length === 0) {
      console.log('[getTraditionalFormsEvent] No Traditional Forms event found');
      return null;
    }
    
    const event = events[0];
    console.log(`[getTraditionalFormsEvent] Using event ID: ${event.id} (${event.event_type})`);
    return event;
    
  } catch (error) {
    console.error('[getTraditionalFormsEvent] Error:', error);
    return null;
  }
}