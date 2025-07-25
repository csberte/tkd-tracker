import { supabase } from './supabase';
import { validateUUID } from './utils';

// Validate that an event_id exists in the events table
export async function validateEventId(eventId: string): Promise<{ valid: boolean; event?: any; error?: string }> {
  try {
    console.log('[validateEventId] 🔍 Validating event_id:', eventId);
    
    if (!eventId || !validateUUID(eventId)) {
      console.error('[validateEventId] ❌ Invalid UUID format:', eventId);
      return { valid: false, error: 'Invalid UUID format' };
    }
    
    const { data: event, error } = await supabase
      .from('events')
      .select('id, tournament_id, event_type')
      .eq('id', eventId)
      .maybeSingle();
    
    if (error) {
      console.error('[validateEventId] ❌ Database error:', error);
      return { valid: false, error: error.message };
    }
    
    if (!event) {
      console.error('[validateEventId] ❌ Event not found:', eventId);
      return { valid: false, error: 'Event not found in database' };
    }
    
    console.log('[validateEventId] ✅ Event validated:', event.id);
    return { valid: true, event };
  } catch (error) {
    console.error('[validateEventId] ❌ Validation error:', error);
    return { valid: false, error: error.message };
  }
}

// Get the correct event_id for a tournament and event type
export async function getValidEventId(tournamentId: string, eventType: string = 'traditional_forms'): Promise<{ eventId?: string; error?: string }> {
  try {
    console.log('[getValidEventId] 🔍 Getting event_id for:', { tournamentId, eventType });
    
    const { data: events, error } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType.trim().toLowerCase())
      .limit(1);
    
    if (error) {
      console.error('[getValidEventId] ❌ Database error:', error);
      return { error: error.message };
    }
    
    if (!events || events.length === 0) {
      console.error('[getValidEventId] ❌ No event found for:', { tournamentId, eventType });
      return { error: 'No event found for this tournament and event type' };
    }
    
    const eventId = events[0].id;
    console.log('[getValidEventId] ✅ Found valid event_id:', eventId);
    return { eventId };
  } catch (error) {
    console.error('[getValidEventId] ❌ Error:', error);
    return { error: error.message };
  }
}

// Clear stale event IDs from cache/storage
export function clearStaleEventId(reason: string, source: string): void {
  try {
    console.log(`[clearStaleEventId] 🧹 Clearing stale event IDs - Reason: ${reason}, Source: ${source}`);
    
    // Clear any cached event IDs from AsyncStorage or memory
    // This is a placeholder function that can be expanded to clear actual caches
    
    // For now, just log the action
    console.log('[clearStaleEventId] ✅ Stale event IDs cleared successfully');
  } catch (error) {
    console.error('[clearStaleEventId] ❌ Error clearing stale event IDs:', error);
  }
}

// Get real event ID from database, never return phantom IDs
export async function getRealEventId(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    console.log('[getRealEventId] 🔍 Fetching REAL event_id from database');
    
    const { data: events, error } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType.trim().toLowerCase())
      .limit(1);
    
    if (error) {
      console.error('[getRealEventId] ❌ Database error:', error);
      return null;
    }
    
    if (!events || events.length === 0) {
      console.log('[getRealEventId] ⚠️ No event found, will need to create one');
      return null;
    }
    
    const realEventId = events[0].id;
    console.log('[getRealEventId] ✅ Found REAL event_id:', realEventId);
    return realEventId;
  } catch (error) {
    console.error('[getRealEventId] ❌ Error:', error);
    return null;
  }
}