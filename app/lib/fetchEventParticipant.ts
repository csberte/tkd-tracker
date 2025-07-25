import { supabase } from './supabase';

// Fetch event participant by event_id and tournament_competitor_id
export async function fetchEventParticipant(eventId: string, tournamentCompetitorId: string) {
  try {
    console.log('[fetchEventParticipant] Fetching participant for:', { eventId, tournamentCompetitorId });
    
    const { data, error } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', tournamentCompetitorId)
      .maybeSingle();
    
    if (error) {
      console.error('[fetchEventParticipant] Error:', error);
      throw error;
    }
    
    if (!data) {
      console.error('[fetchEventParticipant] No participant found');
      throw new Error('Event participant not found');
    }
    
    console.log('[fetchEventParticipant] Found participant:', data.id);
    return data;
  } catch (error) {
    console.error('[fetchEventParticipant] Failed:', error);
    throw error;
  }
}