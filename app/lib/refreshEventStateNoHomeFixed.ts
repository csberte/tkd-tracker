import { supabase } from './supabase';
import { validateUUID, isProblematicUUID } from './utils';
import { CompetitorWithScore } from './eventHelpersRest2EnhancedFixed';
import { calculateRankingsWithTies } from './eventHelpers';

// Fixed refresh function that shows ALL participants (with or without scores)
export async function refreshEventStateNoHomeFixed(eventId: string): Promise<{ success: boolean; competitors: CompetitorWithScore[]; error?: string }> {
  try {
    console.log('[refreshEventStateNoHomeFixed] 🔄 Starting refresh for:', eventId);
    
    if (!eventId || !validateUUID(eventId) || isProblematicUUID(eventId)) {
      console.error('[refreshEventStateNoHomeFixed] ❌ Invalid event ID:', eventId);
      return { success: false, competitors: [], error: 'Invalid event ID' };
    }
    
    // Validate event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, tournament_id, event_type')
      .eq('id', eventId)
      .maybeSingle();
    
    if (eventError || !event) {
      console.error('[refreshEventStateNoHomeFixed] ❌ Event not found:', eventId);
      return { success: false, competitors: [], error: 'Event not found' };
    }
    
    console.log('[refreshEventStateNoHomeFixed] Event validated:', event.id);
    
    // Get ALL event participants with proper filtering and joins
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
      console.error('[refreshEventStateNoHomeFixed] ❌ Participants fetch error:', participantsError);
      return { success: false, competitors: [], error: participantsError.message };
    }
    
    console.log('[refreshEventStateNoHomeFixed] 📊 Event participants found:', eventParticipants?.length || 0);
    
    if (!eventParticipants || eventParticipants.length === 0) {
      console.log('[refreshEventStateNoHomeFixed] ✅ No participants found - returning empty array');
      return { success: true, competitors: [] };
    }
    
    // Fetch scores with explicit ordering
    const { data: scoresData, error: scoresError } = await supabase
      .from('event_scores')
      .select('*')
      .eq('event_id', event.id)
      .order('total_score', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (scoresError) {
      console.error('[refreshEventStateNoHomeFixed] ❌ Scores fetch error:', scoresError);
      return { success: false, competitors: [], error: scoresError.message };
    }
    
    console.log('[refreshEventStateNoHomeFixed] 📊 Raw scores fetched:', scoresData?.length || 0);
    
    // Build competitors array from ALL participants (with or without scores)
    const competitors: CompetitorWithScore[] = [];
    
    for (const participant of eventParticipants) {
      if (participant.tournament_competitors) {
        const competitorData = participant.tournament_competitors;
        const score = scoresData?.find(s => s.tournament_competitor_id === participant.tournament_competitor_id);
        
        const competitor: CompetitorWithScore = {
          id: score?.id || `temp-${participant.id}`,
          tournament_competitor_id: competitorData.id,
          name: competitorData.name,
          avatar: competitorData.avatar,
          source_type: competitorData.source_type,
          totalScore: score?.total_score || 0,
          rank: score?.rank || 0,
          final_rank: score?.final_rank,
          placement: score?.placement,
          tie_breaker_status: score?.tie_breaker_status,
          medal: score?.medal,
          points: score?.points,
          isTied: false,
          judge_a_score: score?.judge_a_score || 0,
          judge_b_score: score?.judge_b_score || 0,
          judge_c_score: score?.judge_c_score || 0,
          has_video: score?.has_video || false,
          video_url: score?.video_url
        };
        
        competitors.push(competitor);
        console.log('[refreshEventStateNoHomeFixed] ✅ Added competitor:', competitor.name, score ? 'with score' : 'without score');
      }
    }
    
    // Calculate fresh rankings with ties (only for competitors with scores)
    const rankedCompetitors = calculateRankingsWithTies(competitors);
    
    console.log('[refreshEventStateNoHomeFixed] ✅ Final result - competitors:', rankedCompetitors.length);
    console.log('[refreshEventStateNoHomeFixed] 📋 Competitor names:', rankedCompetitors.map(c => c.name));
    
    return { success: true, competitors: rankedCompetitors };
  } catch (error) {
    console.error('[refreshEventStateNoHomeFixed] ❌ Critical error:', error.message);
    return { success: false, competitors: [], error: error.message };
  }
}

export default refreshEventStateNoHomeFixed;