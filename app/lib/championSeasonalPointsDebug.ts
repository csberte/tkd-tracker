import { supabase } from './supabase';

// Debug function to test the specific champion mentioned in the issue
export async function debugChampionSeasonalPoints(championId: string = '5ad4baad-2ade-495d-bdc8-ebb8723eda4a') {
  console.log('🔍 [DEBUG] Starting comprehensive debug for champion:', championId);
  
  try {
    // Step 1: Check if champion exists
    const { data: championData, error: championError } = await supabase
      .from('champions')
      .select('*')
      .eq('id', championId);
    
    console.log('🔍 [DEBUG] Step 1 - Champion exists:', {
      found: championData?.length || 0,
      error: championError,
      data: championData
    });
    
    // Step 2: Check tournament_competitors for this champion
    const { data: tcData, error: tcError } = await supabase
      .from('tournament_competitors')
      .select('*')
      .eq('source_id', championId)
      .eq('source_type', 'champion');
    
    console.log('🔍 [DEBUG] Step 2 - Tournament competitors:', {
      found: tcData?.length || 0,
      error: tcError,
      tcIds: tcData?.map(tc => tc.id)
    });
    
    if (!tcData || tcData.length === 0) {
      console.log('❌ [DEBUG] No tournament_competitors found - this is likely the issue!');
      return { error: 'No tournament_competitors found for champion' };
    }
    
    const tcIds = tcData.map(tc => tc.id);
    
    // Step 3: Check event_scores for these tournament_competitor_ids
    const { data: rawScores, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .in('tournament_competitor_id', tcIds);
    
    console.log('🔍 [DEBUG] Step 3 - Raw event scores:', {
      found: rawScores?.length || 0,
      error: scoresError,
      sampleScore: rawScores?.[0]
    });
    
    // Step 4: Check event_scores with events joined
    const { data: scoresWithEvents, error: eventsError } = await supabase
      .from('event_scores')
      .select(`
        *,
        events (*)
      `)
      .in('tournament_competitor_id', tcIds);
    
    console.log('🔍 [DEBUG] Step 4 - Scores with events:', {
      found: scoresWithEvents?.length || 0,
      error: eventsError,
      sampleWithEvent: scoresWithEvents?.[0]
    });
    
    // Step 5: Check full join with tournaments
    const { data: fullJoin, error: fullError } = await supabase
      .from('event_scores')
      .select(`
        *,
        events (
          *,
          tournaments (*)
        )
      `)
      .in('tournament_competitor_id', tcIds);
    
    console.log('🔍 [DEBUG] Step 5 - Full join with tournaments:', {
      found: fullJoin?.length || 0,
      error: fullError,
      sampleFullJoin: fullJoin?.[0]
    });
    
    // Step 6: Check for finalized scores only
    const { data: finalizedScores, error: finalizedError } = await supabase
      .from('event_scores')
      .select(`
        *,
        events (
          *,
          tournaments (*)
        )
      `)
      .in('tournament_competitor_id', tcIds)
      .not('final_rank', 'is', null);
    
    console.log('🔍 [DEBUG] Step 6 - Finalized scores only:', {
      found: finalizedScores?.length || 0,
      error: finalizedError,
      ranks: finalizedScores?.map(s => s.final_rank)
    });
    
    return {
      championExists: championData?.length > 0,
      tournamentCompetitors: tcData?.length || 0,
      rawScores: rawScores?.length || 0,
      scoresWithEvents: scoresWithEvents?.length || 0,
      fullJoinScores: fullJoin?.length || 0,
      finalizedScores: finalizedScores?.length || 0,
      tcIds,
      sampleData: {
        champion: championData?.[0],
        tournamentCompetitor: tcData?.[0],
        rawScore: rawScores?.[0],
        finalizedScore: finalizedScores?.[0]
      }
    };
    
  } catch (error) {
    console.error('🔥 [DEBUG] Unexpected error:', error);
    return { error: error.message };
  }
}