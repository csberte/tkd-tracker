import { supabase } from './supabase';

// Debug helper to trace duplicate event creation
export async function debugEventCreation(tournamentId: string, eventType: string = 'traditional_forms'): Promise<void> {
  try {
    console.log('🔍 [DEBUG] Checking for duplicate events...');
    
    // Query all events for this tournament and event type
    const { data: events, error } = await supabase
      .from('events')
      .select('id, created_at, tournament_id, event_type')
      .eq('tournament_id', tournamentId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ [DEBUG] Error querying events:', error);
      return;
    }
    
    console.log(`🔍 [DEBUG] Found ${events?.length || 0} events for tournament ${tournamentId}:`);
    
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. Event ID: ${event.id}`);
        console.log(`     Created: ${event.created_at}`);
        console.log(`     Type: ${event.event_type}`);
      });
      
      if (events.length > 1) {
        console.log('⚠️ [DEBUG] DUPLICATE EVENTS DETECTED!');
        
        // Check participants for each event
        for (const event of events) {
          const { data: participants } = await supabase
            .from('event_participants')
            .select('id, tournament_competitor_id')
            .eq('event_id', event.id);
          
          console.log(`📊 [DEBUG] Event ${event.id} has ${participants?.length || 0} participants`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error in debugEventCreation:', error);
  }
}

// Check for race conditions in event creation
export async function checkEventCreationRace(tournamentId: string): Promise<boolean> {
  try {
    const { data: events } = await supabase
      .from('events')
      .select('id, created_at')
      .eq('tournament_id', tournamentId)
      .eq('event_type', 'traditional_forms')
      .order('created_at', { ascending: true });
    
    if (!events || events.length <= 1) {
      return false; // No race condition
    }
    
    // Check if events were created within 5 seconds of each other
    const firstEventTime = new Date(events[0].created_at).getTime();
    const secondEventTime = new Date(events[1].created_at).getTime();
    const timeDiff = Math.abs(secondEventTime - firstEventTime);
    
    const isRaceCondition = timeDiff < 5000; // 5 seconds
    
    if (isRaceCondition) {
      console.log('🏁 [DEBUG] RACE CONDITION DETECTED!');
      console.log(`  Time difference: ${timeDiff}ms`);
      console.log(`  First event: ${events[0].id} at ${events[0].created_at}`);
      console.log(`  Second event: ${events[1].id} at ${events[1].created_at}`);
    }
    
    return isRaceCondition;
    
  } catch (error) {
    console.error('❌ [DEBUG] Error checking race condition:', error);
    return false;
  }
}