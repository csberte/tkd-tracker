import { supabase } from './supabase';
import { calculateRankingsWithTies } from './allHelpers';

export async function fetchAllScoresForEvent(eventId: string) {
  const { data, error } = await supabase
    .from('event_scores')
    .select('*')
    .eq('event_id', eventId)
    .order('total_score', { ascending: false });

  if (error) {
    console.error('[Debug] Failed to fetch all scores:', error.message);
    return [];
  }

  console.log('[Debug] All Scores:', data);
  return data;
}

export async function recalculateFinalRanks(eventId: string) {
  const { data, error } = await supabase
    .from('event_scores')
    .select('*')
    .eq('event_id', eventId);

  if (error || !data) {
    console.error('[Recalc] Failed to load scores:', error?.message);
    return;
  }

  const updated = calculateRankingsWithTies(data);

  for (const s of updated) {
    await supabase
      .from('event_scores')
      .update({ final_rank: s.final_rank, points_earned: s.points_earned })
      .eq('id', s.id);
  }

  console.log('[Recalc] Final ranks recalculated manually.');
}

// Keep existing functions for compatibility
export async function showAllScoresForEvent(eventId: string) {
  console.log('🔍 [DebugHelpers] Fetching ALL scores for event:', eventId);
  
  try {
    const { data: scores, error } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [DebugHelpers] Error fetching scores:', error);
      return [];
    }
    
    console.log(`📊 [DebugHelpers] Found ${scores?.length || 0} total scores (including null ranks):`);
    
    if (scores && scores.length > 0) {
      scores.forEach((score, index) => {
        console.log(`   ${index + 1}. ID: ${score.id}`);
        console.log(`      Competitor: ${score.competitor_id}`);
        console.log(`      Total Score: ${score.total_score}`);
        console.log(`      Final Rank: ${score.final_rank || 'NULL'}`);
        console.log(`      Points Earned: ${score.points_earned || 'NULL'}`);
        console.log(`      Created: ${score.created_at}`);
        console.log('      ---');
      });
    } else {
      console.log('   No scores found for this event');
    }
    
    return scores || [];
    
  } catch (error) {
    console.error('❌ [DebugHelpers] Unexpected error:', error);
    return [];
  }
}

export async function investigateEventRanks(eventId: string) {
  console.log('🔬 [DebugHelpers] Starting comprehensive rank investigation for event:', eventId);
  
  try {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    
    if (eventError || !event) {
      console.log('❌ [DebugHelpers] Event not found:', eventError);
      return;
    }
    
    console.log('✅ [DebugHelpers] Event found:', event.name);
    
    const scores = await showAllScoresForEvent(eventId);
    
    const rankedScores = scores.filter(s => s.final_rank !== null);
    const unrankedScores = scores.filter(s => s.final_rank === null);
    
    console.log(`📈 [DebugHelpers] Rank Analysis:`);
    console.log(`   Total Scores: ${scores.length}`);
    console.log(`   Ranked Scores: ${rankedScores.length}`);
    console.log(`   Unranked Scores: ${unrankedScores.length}`);
    
    if (unrankedScores.length > 0) {
      console.log('⚠️ [DebugHelpers] Found unranked scores - this is the problem!');
      console.log('   These scores need final_rank and points_earned calculated');
    }
    
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('tournament_class')
      .eq('id', event.tournament_id)
      .single();
    
    if (tournament) {
      console.log(`🏆 [DebugHelpers] Tournament class: ${tournament.tournament_class}`);
    }
    
    return {
      event,
      scores,
      rankedCount: rankedScores.length,
      unrankedCount: unrankedScores.length,
      tournamentClass: tournament?.tournament_class
    };
    
  } catch (error) {
    console.error('❌ [DebugHelpers] Investigation failed:', error);
  }
}