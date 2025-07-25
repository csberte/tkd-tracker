import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';
import { calculateRankingsWithTies } from './eventHelpers';

// Refresh function with NO Home navigation fallbacks
export async function refreshEventStateNoHome(eventId: string): Promise<{ success: boolean; competitors: CompetitorWithScore[]; error?: string }> {
  try {
    console.log('[refreshEventStateNoHome] 🔄 Starting refresh for:', eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('[refreshEventStateNoHome] ❌ Invalid event ID:', eventId);
      return { success: false, competitors: [], error: 'Invalid event ID' };
    }
    
    // Validate event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id, event_type')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[refreshEventStateNoHome] ❌ Event not found:', eventId);
      return { success: false, competitors: [], error: 'Event not found' };
    }
    
    console.log('[DEBUG] Event validated:', event.id);
    
    // DEBUG STEP 1: Get ALL event participants first
    const { data, error } = await supabase
      .from('event_participants')
      .select('*');
    console.log('[DEBUG] ALL event participants:', data);
    
    // Get event participants with proper filtering and joins - using event.id consistently
    const { data: eventParticipants, error: participantsError } = await supabase
      .from('event_participants')
      .select(`
        *,
        tournament_competitors(
          id,
          name,
          avatar,
          source_type
        )
      `)
      .eq('event_id', event.id)
      .eq('tournament_id', event.tournament_id)
      .eq('event_type', 'traditional_forms');
    
    if (participantsError) {
      console.error('[refreshEventStateNoHome] ❌ Participants fetch error:', participantsError);
      return { success: false, competitors: [], error: participantsError.message };
    }
    
    console.log('[refreshEventStateNoHome] 📊 Event participants found:', eventParticipants?.length || 0);
    
    if (!eventParticipants || eventParticipants.length === 0) {
      console.log('[refreshEventStateNoHome] ✅ No participants found - returning empty array');
      return { success: true, competitors: [] };
    }
    
    // Fetch scores with explicit ordering - using event.id consistently
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', event.id)
      .order('total_score', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (scoresError) {
      console.error('[refreshEventStateNoHome] ❌ Scores fetch error:', scoresError);
      return { success: false, competitors: [], error: scoresError.message };
    }
    
    console.log('[refreshEventStateNoHome] 📊 Raw scores fetched:', scoresData?.length || 0);
    
    if (!scoresData || scoresData.length === 0) {
      console.log('[refreshEventStateNoHome] ✅ No scores found - returning empty array');
      return { success: true, competitors: [] };
    }
    
    // Build competitors array from participants with scores
    const competitors: CompetitorWithScore[] = [];
    
    for (const participant of eventParticipants) {
      const score = scoresData.find(s => s.tournament_competitor_id === participant.tournament_competitor_id);
      
      if (score && participant.tournament_competitors) {
        const competitorData = participant.tournament_competitors;
        
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
        console.log('[refreshEventStateNoHome] ✅ Added competitor:', competitor.name);
      }
    }
    
    // Calculate fresh rankings with ties
    const rankedCompetitors = calculateRankingsWithTies(competitors);
    
    console.log('[refreshEventStateNoHome] ✅ Final result - competitors:', rankedCompetitors.length);
    console.log('[refreshEventStateNoHome] 📋 Competitor names:', rankedCompetitors.map(c => c.name));
    
    return { success: true, competitors: rankedCompetitors };
  } catch (error) {
    console.error('[refreshEventStateNoHome] ❌ Critical error:', error.message);
    // CRITICAL: NO HOME NAVIGATION - return error for screen to handle
    return { success: false, competitors: [], error: error.message };
  }
}

export default refreshEventStateNoHome;