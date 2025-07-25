import { supabase } from './supabase';
import { validateUUID } from './utils';

// Fixed event initialization that prevents duplicate creation
export async function getOrCreateEvent(tournamentId: string, eventType: string = 'traditional_forms'): Promise<string | null> {
  try {
    console.log(`[getOrCreateEvent] Starting for tournament: ${tournamentId}, event type: ${eventType}`);
    
    if (!tournamentId || !validateUUID(tournamentId)) {
      console.error('[getOrCreateEvent] Invalid tournament ID');
      return null;
    }
    
    // Step 1: Check if event already exists with correct event_type
    const { data: existingEvent, error: queryError } = await supabase
      .from('events')
      .select('id, event_type, user_id, name')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType)
      .maybeSingle();
    
    if (queryError) {
      console.error('[getOrCreateEvent] Query error:', queryError);
      return null;
    }
    
    // Step 2: If event exists and has valid data, return it
    if (existingEvent && existingEvent.user_id) {
      console.log(`[getOrCreateEvent] ✅ Found existing valid event: ${existingEvent.id}`);
      return existingEvent.id;
    }
    
    // Step 3: Get tournament data for event creation
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('name, date, user_id')
      .eq('id', tournamentId)
      .single();
    
    if (tournamentError || !tournament) {
      console.error('[getOrCreateEvent] Tournament not found:', tournamentError);
      return null;
    }
    
    // Step 4: Create new event with all required fields
    const eventName = eventType === 'traditional_forms' ? 'Traditional Forms' : 
                     eventType === 'creative_forms' ? 'Creative Forms' : 
                     eventType === 'extreme_forms' ? 'Extreme Forms' : 
                     'Traditional Forms';
    
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        tournament_id: tournamentId,
        event_type: eventType,
        name: eventName,
        description: `${eventName} competition for ${tournament.name}`,
        date: tournament.date,
        user_id: tournament.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (insertError) {
      // If unique constraint violation, try to get existing event again
      if (insertError.code === '23505') {
        console.log('[getOrCreateEvent] Duplicate detected, fetching existing event');
        const { data: retryEvent } = await supabase
          .from('events')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('event_type', eventType)
          .single();
        
        if (retryEvent) {
          console.log(`[getOrCreateEvent] ✅ Retrieved existing event after conflict: ${retryEvent.id}`);
          return retryEvent.id;
        }
      }
      
      console.error('[getOrCreateEvent] Insert error:', insertError);
      return null;
    }
    
    console.log(`[getOrCreateEvent] ✅ Created new event: ${newEvent.id}`);
    return newEvent.id;
    
  } catch (error) {
    console.error('[getOrCreateEvent] Unexpected error:', error);
    return null;
  }
}

// Clean up any orphaned events (events without proper event_type or user_id)
export async function cleanupOrphanedEvents(tournamentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('tournament_id', tournamentId)
      .or('event_type.is.null,user_id.is.null');
    
    if (error) {
      console.error('[cleanupOrphanedEvents] Error:', error);
    } else {
      console.log('[cleanupOrphanedEvents] Cleaned up orphaned events for tournament:', tournamentId);
    }
  } catch (error) {
    console.error('[cleanupOrphanedEvents] Unexpected error:', error);
  }
}