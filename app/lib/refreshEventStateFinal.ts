import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';
import { calculateRankingsWithTies } from './eventHelpers';

// Final refresh function with guaranteed competitor return and immediate state update
export async function refreshEventStateFinal(eventId: string): Promise<{ success: boolean; competitors: CompetitorWithScore[]; error?: string }> {
  try {
    console.log('[refreshEventStateFinal] 🔄 Starting refresh for:', eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('[refreshEventStateFinal] ❌ Invalid event ID:', eventId);
      return { success: false, competitors: [], error: 'Invalid event ID' };
    }
    
    // Validate event exists first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[refreshEventStateFinal] ❌ Event not found:', eventId);
      return { success: false, competitors: [], error: 'Event not found' };
    }
    
    console.log('[refreshEventStateFinal] ✅ Event validated:', event.id);
    
    // Force fresh fetch with explicit ordering
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', eventId)
      .order('total_score', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (scoresError) {
      console.error('[refreshEventStateFinal] ❌ Scores fetch error:', scoresError);
      return { success: false, competitors: [], error: scoresError.message };
    }
    
    console.log('[refreshEventStateFinal] 📊 Raw scores fetched:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[refreshEventStateFinal] ✅ No scores found - returning empty array');
      return { success: true, competitors: [] };
    }
    
    // Build competitors array with fresh data
    const competitors: CompetitorWithScore[] = [];
    
    for (const score of scoresData) {
      console.log('[refreshEventStateFinal] Processing score for competitor:', score.tournament_competitor_id);
      
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id, name, avatar, source_type')
        .eq('id', score.tournament_competitor_id)
        .maybeSingle();
      
      if (competitorError || !competitorData) {
        console.warn('[refreshEventStateFinal] ⚠️ Competitor not found for score:', score.id);
        continue;
      }
      
      const competitor: CompetitorWithScore = {
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
      };
      
      competitors.push(competitor);
      console.log('[refreshEventStateFinal] ✅ Added competitor:', competitor.name);
    }
    
    // Calculate fresh rankings with ties
    const rankedCompetitors = calculateRankingsWithTies(competitors);
    
    console.log('[refreshEventStateFinal] ✅ Final result - competitors:', rankedCompetitors.length);
    console.log('[refreshEventStateFinal] 📋 Competitor names:', rankedCompetitors.map(c => c.name));
    
    return { success: true, competitors: rankedCompetitors };
  } catch (error) {
    console.error('[refreshEventStateFinal] ❌ Critical error:', error.message);
    return { success: false, competitors: [], error: error.message };
  }
}

// Export as default for backward compatibility
export default refreshEventStateFinal;
