import { supabase } from './supabase';
import { validateUUID } from './utils';

// Core event validation functions to prevent phantom event IDs
export async function validateEventExists(eventId: string): Promise<{ valid: boolean; event?: any; error?: string }> {
  try {
    if (!eventId || !validateUUID(eventId)) {
      return { valid: false, error: 'Invalid UUID format' };
    }
    
    const { data: event, error } = await supabase
      .from('events')
      .select('id, tournament_id, event_type, name, date')
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
    
    return { valid: true, event };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Get real event ID from database only
export async function getRealEventFromDB(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType.trim().toLowerCase())
      .limit(1);
    
    if (error || !events || events.length === 0) {
      return null;
    }
    
    return events[0].id;
  } catch (error) {
    console.error('[getRealEventFromDB] Error:', error);
    return null;
  }
}

// Create event with all required fields - FIXED template literal
export async function createValidEvent(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    const eventName = eventType === 'traditional_forms' ? 'Traditional Forms' : 
                     eventType === 'creative_forms' ? 'Creative Forms' : 
                     eventType === 'extreme_forms' ? 'Extreme Forms' : 
                     'Traditional Forms';
    
    console.log('[createValidEvent] Creating event with name:', eventName);
    
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        tournament_id: tournamentId,
        event_type: eventType.trim().toLowerCase(),
        name: eventName,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[createValidEvent] Insert error:', error);
      
      if (error.message && error.message.includes('duplicate key')) {
        // Try to get existing event
        return await getRealEventFromDB(tournamentId, eventType);
      }
      throw error;
    }
    
    console.log('[createValidEvent] ✅ Event created successfully:', newEvent.id);
    return newEvent.id;
  } catch (error) {
    console.error('[createValidEvent] Error:', error);
    return null;
  }
}

// Main function to get or create valid event ID
export async function getOrCreateValidEventId(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    // First try to get existing event
    let eventId = await getRealEventFromDB(tournamentId, eventType);
    
    if (eventId) {
      // Validate it exists
      const validation = await validateEventExists(eventId);
      if (validation.valid) {
        console.log('[getOrCreateValidEventId] ✅ Using existing event:', eventId);
        return eventId;
      }
    }
    
    // Create new event if none exists
    console.log('[getOrCreateValidEventId] Creating new event for tournament:', tournamentId);
    eventId = await createValidEvent(tournamentId, eventType);
    
    if (eventId) {
      // Final validation
      const validation = await validateEventExists(eventId);
      if (validation.valid) {
        console.log('[getOrCreateValidEventId] ✅ New event created and validated:', eventId);
        return eventId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[getOrCreateValidEventId] Error:', error);
    return null;
  }
}