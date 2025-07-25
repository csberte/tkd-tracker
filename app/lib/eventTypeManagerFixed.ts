import { supabase } from './supabase';
import { validateUUID } from './utils';

// Event type constants
export const EVENT_TYPES = {
  TRADITIONAL_FORMS: 'traditional_forms',
  CREATIVE_FORMS: 'creative_forms',
  EXTREME_FORMS: 'extreme_forms'
};

// Helper function to get name from event type
function getNameFromType(type: string) {
  switch (type) {
    case "creative_forms": return "Creative Forms";
    case "extreme_forms": return "Extreme Forms";
    case "traditional_forms": return "Traditional Forms";
    default: return "Unnamed Event";
  }
}

// Get or create event for specific event type
export async function getOrCreateEventByType(tournamentId: string, eventType: string): Promise<any | null> {
  try {
    console.log(`[getOrCreateEventByType] Starting for tournament: ${tournamentId}, type: ${eventType}`);
    
    if (!tournamentId || typeof tournamentId !== 'string') {
      console.error('[getOrCreateEventByType] Invalid or missing tournamentId:', tournamentId);
      throw new Error('Invalid tournament ID');
    }
    
    if (!validateUUID(tournamentId)) {
      console.error('[getOrCreateEventByType] Invalid tournament ID format:', tournamentId);
      throw new Error('Invalid tournament ID format');
    }
    
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      console.error('[getOrCreateEventByType] Invalid event type:', eventType);
      throw new Error('Invalid event type');
    }
    
    // Check for existing event
    const { data: existingEvent, error } = await supabase
      .from("events")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("event_type", eventType)
      .maybeSingle();
    
    if (error) {
      console.error('[getOrCreateEventByType] Select error:', error);
    }
    
    if (existingEvent) {
      console.log(`[getOrCreateEventByType] Found existing event:`, existingEvent);
      return existingEvent;
    }
    
    // Create new event if not found
    const name = getNameFromType(eventType);
    
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert([
        {
          tournament_id: tournamentId,
          event_type: eventType,
          name,
          date: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();
    
    if (insertError) {
      console.error('[getOrCreateEventByType] Insert error:', insertError);
      throw insertError;
    }
    
    console.log(`[getOrCreateEventByType] Successfully created new event:`, newEvent);
    return newEvent;
    
  } catch (error) {
    console.error(`[getOrCreateEventByType] ERROR - Tournament: ${tournamentId}, Type: ${eventType}, Error:`, error);
    throw error;
  }
}

// Get event for tournament by type (read-only)
export async function getEventByType(tournamentId: string, eventType: string): Promise<any | null> {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType);
    
    if (error) {
      console.error('[getEventByType] Error:', error);
      return null;
    }
    
    return events && events.length > 0 ? events[0] : null;
  } catch (error) {
    console.error('[getEventByType] Unexpected error:', error);
    return null;
  }
}