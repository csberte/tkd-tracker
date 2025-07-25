import { supabase } from './supabase';
import { validateUUID } from './utils';

// Enhanced Traditional Forms event management with detailed error logging
export async function getOrCreateTraditionalFormsEvent(tournamentId: string): Promise<any | null> {
  try {
    console.log('[getOrCreateTraditionalFormsEvent] Starting with tournamentId:', tournamentId);
    
    if (!tournamentId || typeof tournamentId !== 'string') {
      console.error('[getOrCreateTraditionalFormsEvent] Invalid tournamentId:', tournamentId);
      return null;
    }
    
    if (!validateUUID(tournamentId)) {
      console.error('[getOrCreateTraditionalFormsEvent] Invalid UUID format:', tournamentId);
      return null;
    }
    
    // Use atomic PostgreSQL function
    console.log('[getOrCreateTraditionalFormsEvent] Calling RPC function...');
    const { data, error } = await supabase.rpc('atomic_get_or_create_traditional_forms_event', {
      p_tournament_id: tournamentId
    });
    
    if (error) {
      console.error('[getOrCreateTraditionalFormsEvent] RPC error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('[getOrCreateTraditionalFormsEvent] No event returned from RPC');
      return null;
    }
    
    const event = data[0];
    console.log('[getOrCreateTraditionalFormsEvent] Success - Event:', event);
    return event;
    
  } catch (error) {
    console.error('[getOrCreateTraditionalFormsEvent] Unexpected error:', error);
    return null;
  }
}

// Enhanced event loading with detailed error logging
export async function loadTraditionalFormsEvent(eventId: string) {
  try {
    console.log('[loadTraditionalFormsEvent] Starting with eventId:', eventId);
    
    if (!eventId || !validateUUID(eventId)) {
      throw new Error(`Invalid event ID: ${eventId}`);
    }
    
    const results = await Promise.allSettled([
      loadEventDetails(eventId),
      loadEventParticipants(eventId),
      loadEventJudges(eventId),
      loadEventScores(eventId)
    ]);
    
    const [eventResult, participantsResult, judgesResult, scoresResult] = results;
    
    // Log individual results
    console.log('[loadTraditionalFormsEvent] Event details result:', eventResult);
    console.log('[loadTraditionalFormsEvent] Participants result:', participantsResult);
    console.log('[loadTraditionalFormsEvent] Judges result:', judgesResult);
    console.log('[loadTraditionalFormsEvent] Scores result:', scoresResult);
    
    return {
      event: eventResult.status === 'fulfilled' ? eventResult.value : null,
      participants: participantsResult.status === 'fulfilled' ? participantsResult.value : [],
      judges: judgesResult.status === 'fulfilled' ? judgesResult.value : [],
      scores: scoresResult.status === 'fulfilled' ? scoresResult.value : [],
      errors: {
        event: eventResult.status === 'rejected' ? eventResult.reason : null,
        participants: participantsResult.status === 'rejected' ? participantsResult.reason : null,
        judges: judgesResult.status === 'rejected' ? judgesResult.reason : null,
        scores: scoresResult.status === 'rejected' ? scoresResult.reason : null
      }
    };
    
  } catch (error) {
    console.error('[loadTraditionalFormsEvent] Main error:', error);
    throw error;
  }
}

// Individual load functions with error handling
async function loadEventDetails(eventId: string) {
  console.log('[loadEventDetails] Loading event:', eventId);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  
  if (error) {
    console.error('[loadEventDetails] Error:', error);
    throw new Error(`Failed to load event details: ${error.message}`);
  }
  
  console.log('[loadEventDetails] Success:', data);
  return data;
}

async function loadEventParticipants(eventId: string) {
  console.log('[loadEventParticipants] Loading participants for event:', eventId);
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      id,
      tournament_competitor_id,
      tournament_competitors!inner(
        id,
        name,
        school,
        avatar
      )
    `)
    .eq('event_id', eventId);
  
  if (error) {
    console.error('[loadEventParticipants] Error:', error);
    throw new Error(`Failed to load participants: ${error.message}`);
  }
  
  console.log('[loadEventParticipants] Success:', data?.length || 0, 'participants');
  return data || [];
}

async function loadEventJudges(eventId: string) {
  console.log('[loadEventJudges] Loading judges for event:', eventId);
  const { data, error } = await supabase
    .from('event_judges')
    .select('*')
    .eq('event_id', eventId);
  
  if (error) {
    console.error('[loadEventJudges] Error:', error);
    // Don't throw - judges might not exist yet
    return [];
  }
  
  console.log('[loadEventJudges] Success:', data?.length || 0, 'judges');
  return data || [];
}

async function loadEventScores(eventId: string) {
  console.log('[loadEventScores] Loading scores for event:', eventId);
  const { data, error } = await supabase
    .from('event_scores')
    .select('*')
    .eq('event_id', eventId);
  
  if (error) {
    console.error('[loadEventScores] Error:', error);
    // Don't throw - scores might not exist yet
    return [];
  }
  
  console.log('[loadEventScores] Success:', data?.length || 0, 'scores');
  return data || [];
}