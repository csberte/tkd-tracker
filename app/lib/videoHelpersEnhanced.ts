import { supabase } from './supabase';

interface VideoLookupParams {
  event_id: string;
  event_participant_id: string;
}

interface VideoResult {
  hasVideo: boolean;
  videoUrl: string | null;
  videoId: string | null;
}

export async function findVideoForEventParticipant(params: VideoLookupParams): Promise<VideoResult> {
  const { event_id, event_participant_id } = params;

  try {
    const { data: videoData } = await supabase
      .from('videos')
      .select('id, video_url')
      .eq('event_id', event_id)
      .eq('event_participant_id', event_participant_id)
      .single();

    if (videoData && videoData.video_url) {
      return {
        hasVideo: true,
        videoUrl: videoData.video_url,
        videoId: videoData.id
      };
    }

    const { data: scoreData } = await supabase
      .from('event_scores')
      .select('video_url')
      .eq('event_id', event_id)
      .eq('event_participant_id', event_participant_id)
      .single();

    if (scoreData && scoreData.video_url) {
      return {
        hasVideo: true,
        videoUrl: scoreData.video_url,
        videoId: null
      };
    }

    return {
      hasVideo: false,
      videoUrl: null,
      videoId: null
    };

  } catch (error) {
    console.error('Error finding video:', error);
    return {
      hasVideo: false,
      videoUrl: null,
      videoId: null
    };
  }
}

export async function insertVideoWithDualSupport({
  event_id,
  event_participant_id,
  video_url,
  uploaded_by,
  total_score,
  placement,
  competitor_name,
  tournament_id,
  metadata
}: {
  event_id: string;
  event_participant_id: string;
  video_url: string;
  uploaded_by: string;
  total_score?: number;
  placement?: number;
  competitor_name?: string;
  tournament_id?: string;
  metadata?: any;
}) {
  try {
    const { error: videoError } = await supabase
      .from('videos')
      .insert({
        event_id,
        event_participant_id,
        video_url,
        uploaded_by,
        total_score,
        placement,
        competitor_name,
        tournament_id,
        metadata
      });

    if (videoError) {
      console.error('Error inserting video:', videoError);
      throw videoError;
    }

    const { error: scoreError } = await supabase
      .from('event_scores')
      .update({ video_url })
      .eq('event_id', event_id)
      .eq('event_participant_id', event_participant_id);

    if (scoreError) {
      console.warn('Warning: Could not update event_scores.video_url:', scoreError);
    }

    return true;
  } catch (error) {
    console.error('Error in dual video insert:', error);
    throw error;
  }
}

export async function getUserVideosEnhanced(userId: string) {
  try {
    // Get videos filtered by user's tournaments
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        competitor_name,
        video_url,
        event_id,
        event_participant_id,
        tournament_id,
        total_score,
        placement,
        created_at,
        competitor_id,
        events(name),
        tournaments!inner(name, date, location, user_id)
      `)
      .eq('tournaments.user_id', userId)
      .order('created_at', { ascending: false });

    if (videoError) throw videoError;
    
    // Get user's competitors to enrich videos
    const { data: competitorData } = await supabase
      .from('competitors')
      .select('id, name, avatar_url')
      .eq('user_id', userId);

    // Get user's champions to enrich videos
    const { data: championData } = await supabase
      .from('champions')
      .select('id, name, avatar_url')
      .eq('user_id', userId);

    // Combine all competitor data
    const allCompetitors = [...(competitorData || []), ...(championData || [])];
    
    // Enrich video data with competitor info
    const enrichedVideos = (videoData || []).map(video => {
      const competitor = allCompetitors.find(c => c.id === video.competitor_id);
      return {
        ...video,
        competitor_name: competitor?.name || video.competitor_name,
        avatar_url: competitor?.avatar_url
      };
    });
    
    return enrichedVideos;
  } catch (error) {
    console.error('Error loading user videos:', error);
    return [];
  }
}