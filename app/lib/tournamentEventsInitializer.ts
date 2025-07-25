import { supabase } from './supabase';

/**
 * Ensures tournament_events records exist for all events in a tournament
 * This fixes the foreign key constraint issue for video uploads
 */
export async function initializeTournamentEvents(tournamentId: string) {
  try {
    // Get all events for this tournament
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, event_type, name')
      .eq('tournament_id', tournamentId);
    
    if (eventsError) {
      console.error('[initializeTournamentEvents] Error fetching events:', eventsError);
      return;
    }
    
    if (!events || events.length === 0) {
      return;
    }
    
    // Check which tournament_events already exist
    const { data: existingTournamentEvents } = await supabase
      .from('tournament_events')
      .select('event_id')
      .eq('tournament_id', tournamentId);
    
    const existingEventIds = new Set(existingTournamentEvents?.map(te => te.event_id) || []);
    
    // Create tournament_events records for missing events
    const tournamentEventsToCreate = events
      .filter(event => !existingEventIds.has(event.id))
      .map(event => ({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        event_id: event.id,
        event_type: event.event_type || 'traditional_forms',
        name: event.name || 'Traditional Forms'
      }));
    
    if (tournamentEventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('tournament_events')
        .insert(tournamentEventsToCreate);
      
      if (insertError) {
        console.error('[initializeTournamentEvents] Error creating tournament events:', insertError);
      }
    }
    
  } catch (error) {
    console.error('[initializeTournamentEvents] Unexpected error:', error);
  }
}

/**
 * Backfill tournament_events for all existing tournaments
 * Run this once to fix existing data
 */
export async function backfillAllTournamentEvents() {
  try {
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id');
    
    if (tournamentsError) {
      console.error('[backfillAllTournamentEvents] Error fetching tournaments:', tournamentsError);
      return;
    }
    
    if (!tournaments || tournaments.length === 0) {
      return;
    }
    
    for (const tournament of tournaments) {
      await initializeTournamentEvents(tournament.id);
    }
  } catch (error) {
    console.error('[backfillAllTournamentEvents] Unexpected error:', error);
  }
}