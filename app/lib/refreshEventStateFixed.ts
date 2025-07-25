import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';
import { calculateRankingsWithTies } from './eventHelpers';

// Fixed refreshEventState function that forces fresh data fetch and calculates rankings
export async function refreshEventState(eventId: string): Promise<{ success: boolean; competitors: CompetitorWithScore[]; error?: string }> {
  try {
    console.log('[refreshEventState] 🔄 Refreshing event state for:', eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      return { success: false, competitors: [], error: 'Invalid event ID' };
    }
    
    // Validate event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[refreshEventState] ❌ Event not found:', eventId);
      return { success: false, competitors: [], error: 'Event not found' };
    }
    
    // Force fresh fetch of scores from database
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false });
    
    if (scoresError) {
      console.error('[refreshEventState] ❌ Scores fetch error:', scoresError);
      return { success: false, competitors: [], error: scoresError.message };
    }
    
    console.log('[refreshEventState] 📊 Fresh scores data:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[refreshEventState] ✅ No scores found - returning empty array');
      return { success: true, competitors: [] };
    }
    
    // Build competitors array with fresh data
    const competitors: CompetitorWithScore[] = [];
    
    for (const score of scoresData) {
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id, name, avatar, source_type')
        .eq('id', score.tournament_competitor_id)
        .maybeSingle();
      
      if (competitorError || !competitorData) {
        console.warn('[refreshEventState] ⚠️ Competitor not found for score:', score.id);
        continue;
      }
      
      competitors.push({
        id: score.id,
        tournament_competitor_id: competitorData.id,
        name: competitorData.name,
        avatar: competitorData.avatar,
        source_type: competitorData.source_type,
        totalScore: score.total_score || 0,
        rank: score.rank || 0,
        final_rank: score.final_rank,
        placement: score.placement,
        tie_breaker_status: score.tie_breaker_status,
        medal: score.medal,
        points: score.points,
        isTied: false,
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score,
        has_video: score.has_video || false,
        video_url: score.video_url
      });
    }
    
    // Calculate fresh rankings with ties
    const rankedCompetitors = calculateRankingsWithTies(competitors);
    
    console.log('[refreshEventState] ✅ Refreshed competitors with rankings:', rankedCompetitors.length);
    return { success: true, competitors: rankedCompetitors };
  } catch (error) {
    console.error('[refreshEventState] ❌ Failed:', error.message);
    return { success: false, competitors: [], error: error.message };
  }
}

// Export the function for backward compatibility
export { refreshEventState as default };