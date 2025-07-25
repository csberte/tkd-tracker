import { supabase } from './supabase';

// Debug function to check event_participant_id linking
export async function debugEventParticipant(eventId: string, competitorId: string) {
  console.log('🔍 [DEBUG] Starting event participant debug...');
  console.log('🔍 [DEBUG] Event ID:', eventId);
  console.log('🔍 [DEBUG] Competitor ID:', competitorId);
  
  try {
    // 1. Check if event_participant exists
    const { data: participant, error: participantError } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', competitorId)
      .maybeSingle();
    
    if (participantError) {
      console.error('❌ [DEBUG] Error fetching participant:', participantError);
      return { success: false, error: participantError };
    }
    
    if (!participant) {
      console.log('⚠️ [DEBUG] No participant found - will need to create one');
      return { success: true, participant: null, scores: [] };
    }
    
    console.log('✅ [DEBUG] Found participant:', participant);
    console.log('✅ [DEBUG] Participant ID:', participant.id);
    
    // 2. Check if any scores exist for this participant
    const { data: scores, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', competitorId);
    
    if (scoresError) {
      console.error('❌ [DEBUG] Error fetching scores:', scoresError);
      return { success: false, error: scoresError };
    }
    
    console.log('🔍 [DEBUG] Found scores:', scores?.length || 0);
    
    if (scores && scores.length > 0) {
      scores.forEach((score, index) => {
        console.log(`🔍 [DEBUG] Score ${index + 1}:`);
        console.log(`  - ID: ${score.id}`);
        console.log(`  - event_participant_id: ${score.event_participant_id}`);
        console.log(`  - tournament_competitor_id: ${score.tournament_competitor_id}`);
        console.log(`  - total_score: ${score.total_score}`);
        
        if (score.event_participant_id === null) {
          console.error('❌ [DEBUG] CRITICAL: event_participant_id is NULL!');
        } else if (score.event_participant_id === participant.id) {
          console.log('✅ [DEBUG] event_participant_id matches participant.id');
        } else {
          console.error('❌ [DEBUG] event_participant_id does NOT match participant.id!');
          console.error(`  Expected: ${participant.id}, Got: ${score.event_participant_id}`);
        }
      });
    }
    
    return {
      success: true,
      participant,
      scores: scores || []
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Unexpected error:', error);
    return { success: false, error };
  }
}

// Debug function to verify score insertion
export async function debugScoreInsertion(payload: any) {
  console.log('🔍 [DEBUG] About to insert score with payload:', payload);
  console.log('🔍 [DEBUG] Payload keys:', Object.keys(payload));
  console.log('🔍 [DEBUG] event_participant_id value:', payload.event_participant_id);
  console.log('🔍 [DEBUG] event_participant_id type:', typeof payload.event_participant_id);
  
  if (payload.event_participant_id === null || payload.event_participant_id === undefined) {
    console.error('❌ [DEBUG] CRITICAL: event_participant_id is null/undefined in payload!');
    return { success: false, error: 'event_participant_id is null/undefined' };
  }
  
  try {
    const { data, error } = await supabase
      .from('event_scores')
      .upsert(payload, {
        onConflict: ['event_id', 'tournament_competitor_id']
      })
      .select();
    
    if (error) {
      console.error('❌ [DEBUG] Error inserting score:', error);
      return { success: false, error };
    }
    
    console.log('✅ [DEBUG] Score inserted successfully:', data);
    
    if (data && data[0]) {
      console.log('✅ [DEBUG] Inserted score event_participant_id:', data[0].event_participant_id);
      
      if (data[0].event_participant_id === null) {
        console.error('❌ [DEBUG] CRITICAL: Inserted score has NULL event_participant_id!');
      } else {
        console.log('✅ [DEBUG] Inserted score has valid event_participant_id');
      }
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ [DEBUG] Unexpected error during insertion:', error);
    return { success: false, error };
  }
}