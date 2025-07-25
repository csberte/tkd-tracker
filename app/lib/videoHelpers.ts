import { supabase } from './supabase';

interface VideoLookupParams {
  event_id: string;
  competitor_id: string;
  tournament_id: string;
}

interface VideoResult {
  hasVideo: boolean;
  videoUrl: string | null;
  videoId: string | null;
}

/**
 * Enhanced video lookup function that tries multiple matching strategies
 * to find videos for a given event/competitor/tournament combination
 */
export async function findVideoForEvent(params: VideoLookupParams): Promise<VideoResult> {
  const { event_id, competitor_id, tournament_id } = params;

  // CRITICAL FIX: Validate all IDs are real UUIDs, not temp placeholders
  if (!event_id || event_id.startsWith('temp-')) {
    console.error('Invalid event_id in findVideoForEvent:', event_id);
    return { hasVideo: false, videoUrl: null, videoId: null };
  }
  
  if (!competitor_id || competitor_id.startsWith('temp-')) {
    console.error('Invalid competitor_id in findVideoForEvent:', competitor_id);
    return { hasVideo: false, videoUrl: null, videoId: null };
  }
  
  if (!tournament_id || tournament_id.startsWith('temp-')) {
    console.error('Invalid tournament_id in findVideoForEvent:', tournament_id);
    return { hasVideo: false, videoUrl: null, videoId: null };
  }

  try {
    // Strategy 1: Look for video using event_score_id (most reliable)
    const { data: scoreData } = await supabase
      .from('event_scores')
      .select('id')
      .eq('event_id', event_id)
      .eq('competitor_id', competitor_id)
      .single();

    if (scoreData) {
      const { data: videoByScore } = await supabase
        .from('videos')
        .select('id, video_url')
        .eq('event_score_id', scoreData.id)
        .single();

      if (videoByScore) {
        return {
          hasVideo: true,
          videoUrl: videoByScore.video_url,
          videoId: videoByScore.id
        };
      }
    }

    // Strategy 2: Look for video using event_participant_id
    const { data: participantData } = await supabase
      .from('event_participants')
      .select('id')
      .eq('tournament_competitor_id', competitor_id)
      .eq('tournament_event_id', event_id)
      .single();

    if (participantData) {
      const { data: videoByParticipant } = await supabase
        .from('videos')
        .select('id, video_url')
        .eq('event_participant_id', participantData.id)
        .single();

      if (videoByParticipant) {
        return {
          hasVideo: true,
          videoUrl: videoByParticipant.video_url,
          videoId: videoByParticipant.id
        };
      }
    }

    // Strategy 3: Fallback to direct field matching
    const { data: videoByFields } = await supabase
      .from('videos')
      .select('id, video_url')
      .eq('event_id', event_id)
      .eq('competitor_id', competitor_id)
      .eq('tournament_id', tournament_id)
      .single();

    if (videoByFields) {
      return {
        hasVideo: true,
        videoUrl: videoByFields.video_url,
        videoId: videoByFields.id
      };
    }

    // No video found
    return {
      hasVideo: false,
      videoUrl: null,
      videoId: null
    };

  } catch (error) {
    console.error('Error finding video for event:', error);
    return {
      hasVideo: false,
      videoUrl: null,
      videoId: null
    };
  }
}

/**
 * Get all videos for a user with proper relationship linking
 */
export async function getUserVideos(userId: string) {
  // CRITICAL FIX: Validate userId is not a temp ID
  if (!userId || userId.startsWith('temp-')) {
    console.error('Invalid userId in getUserVideos:', userId);
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        competitor_name,
        video_url,
        event_score_id,
        competitor_id,
        event_id,
        tournament_id,
        total_score,
        placement,
        metadata,
        created_at,
        event_participants!inner(
          competitors!inner(name),
          tournament_events!inner(
            events!inner(name),
            tournaments!inner(name, date, location, user_id)
          )
        )
      `)
      .eq('event_participants.tournament_events.tournaments.user_id', userId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error loading user videos:', error);
    return [];
  }
}

/**
 * Update video record to ensure proper linking
 */
export async function updateVideoLinking(videoId: string, eventScoreId: string) {
  // CRITICAL FIX: Validate IDs are real UUIDs, not temp placeholders
  if (!videoId || videoId.startsWith('temp-')) {
    console.error('Invalid videoId in updateVideoLinking:', videoId);
    return false;
  }
  
  if (!eventScoreId || eventScoreId.startsWith('temp-')) {
    console.error('Invalid eventScoreId in updateVideoLinking:', eventScoreId);
    return false;
  }

  try {
    const { error } = await supabase
      .from('videos')
      .update({ event_score_id: eventScoreId })
      .eq('id', videoId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating video linking:', error);
    return false;
  }
}