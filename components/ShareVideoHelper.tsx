import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import { supabase } from '../app/lib/supabase';

export async function shareVideo({
  videoUrl,
  competitorName,
  eventName,
  placement,
  score,
  videoUri,
  competitor,
  firstName,
  lastName,
  event,
  totalScore,
  rank,
  name,
  scores,
  sortedCompetitors,
  onProgressUpdate,
  eventId,
  showClipboardModal,
  tournamentName,
  tournamentClass,
  judgeScores,
  placementText,
  points,
}: {
  videoUrl?: string;
  competitorName?: string;
  eventName?: string;
  placement?: string;
  score?: string;
  videoUri?: string;
  competitor?: any;
  firstName?: string;
  lastName?: string;
  event?: { title?: string; name?: string };
  totalScore?: number;
  rank?: number;
  name?: string;
  scores?: number[];
  sortedCompetitors?: { id: string; final_rank?: number; [key: string]: any }[];
  onProgressUpdate?: (progress: number) => void;
  eventId?: string;
  showClipboardModal?: () => Promise<void>;
  tournamentName?: string;
  tournamentClass?: string;
  judgeScores?: {
    judge_a_score: number;
    judge_b_score: number;
    judge_c_score: number;
  };
  placementText?: string;
  points?: number;
}) {
  try {
    const uri = videoUrl || videoUri;

    if (!uri) {
      Alert.alert('Share error', 'No video file is available for sharing.');
      return;
    }

    console.log('📱 [ShareVideo] Starting share process with URI:', uri);
    
    const competitorNameFinal = name || competitorName || competitor?.name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
    const eventTitle = eventName || event?.title || event?.name || 'Traditional Forms';
    
    // Graceful handling of missing eventId
    if (!eventId) {
      console.warn('⚠️ [ShareVideo] Missing eventId, cannot fetch fresh scores from database');
      Alert.alert('Share Error', 'Missing event information.');
      return;
    }
    
    if (!competitor || (!competitor.tournament_competitor_id && !competitor.id)) {
      console.warn('⚠️ [ShareVideo] Missing competitor or competitor ID');
      Alert.alert('Share Error', 'Missing competitor information.');
      return;
    }
    
    const validId = competitor.tournament_competitor_id || competitor.id;
    console.log('✅ [ShareVideo] Using validId for Supabase query:', validId);
    
    if (!validId) {
      console.warn('⚠️ [ShareVideo] validId is undefined, cannot proceed with database query');
      Alert.alert('Share Error', 'Cannot retrieve competitor scores - missing competitor ID.');
      return;
    }
    
    // Fetch fresh scores from database using correct column names
    try {
      const { data, error } = await supabase
        .from('event_scores')
        .select('judge_a_score, judge_b_score, judge_c_score, total_score, final_rank')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', validId)
        .single();
      
      console.log('🔍 [ShareVideo] Supabase query result:', {
        validId,
        eventId,
        data,
        error: error?.message
      });
      
      if (error) {
        console.error('❌ [ShareVideo] Database error:', error);
        Alert.alert('Share Error', 'Failed to fetch judge scores from database.');
        return;
      }
      
      if (!data) {
        console.error('❌ [ShareVideo] No score data found for competitor');
        Alert.alert('Share Error', 'No score data found for this competitor.');
        return;
      }
      
      // Validate that all judge scores are present
      if (data.judge_a_score == null || data.judge_b_score == null || data.judge_c_score == null) {
        console.error('❌ [ShareVideo] Missing individual judge scores:', {
          judge_a: data.judge_a_score,
          judge_b: data.judge_b_score,
          judge_c: data.judge_c_score
        });
        Alert.alert('Share Error', 'Individual judge scores are required but missing.');
        return;
      }
      
      // Calculate total and format score line with B, C, A order
      const total = data.total_score || (data.judge_a_score + data.judge_b_score + data.judge_c_score);
      const scoreLine = `Score: ${total} (${data.judge_b_score}, ${data.judge_c_score}, ${data.judge_a_score})`;
      console.log('✅ [ShareVideo] Using required format (B, C, A order):', scoreLine);
      
      // Determine placement
      const competitorRank = data.final_rank || competitor?.final_rank || rank;
      const rankEmojis = {
        1: '🥇',
        2: '🥈', 
        3: '🥉'
      };
      const placementDisplay = (competitorRank && competitorRank <= 3) ? rankEmojis[competitorRank] : 'No Placement';
      
      // Create final clipboard message in the required format
      const shareText = `🥋 ${competitorNameFinal} – ${eventTitle}\n${scoreLine}\n${placementDisplay}\nScored. Tracked. Shared.\nwww.TKDTracker.com`;
      
      console.log('📋 [ShareVideo] Final share text:', shareText);
      
      // Set clipboard message
      await Clipboard.setStringAsync(shareText);
      
      // Add 250ms delay before calling Sharing.shareAsync()
      await new Promise((resolve) => setTimeout(resolve, 250));
      
      // Then call share function
      await shareVideoNow(uri, onProgressUpdate);
      
    } catch (dbError) {
      console.error('❌ [ShareVideo] Database operation failed:', dbError);
      Alert.alert('Share Error', 'Failed to retrieve judge scores. Please try again.');
      return;
    }

  } catch (err) {
    console.error('[ShareVideo] Share error:', err);
    Alert.alert('Share Error', 'Failed to share video. Please try again.');
  }
}

async function shareVideoNow(supabaseUrl: string, onProgressUpdate?: (progress: number) => void) {
  try {
    console.log('🚀 [ShareVideo] Starting shareVideoNow with URL:', supabaseUrl);
    
    const localUri = FileSystem.documentDirectory + `sharedvideo_${Date.now()}.mp4`;
    console.log('📥 [ShareVideo] Downloading to:', localUri);
    
    const downloadResult = await FileSystem.downloadAsync(supabaseUrl, localUri);
    console.log('📥 [ShareVideo] Download result:', downloadResult);
    
    const info = await FileSystem.getInfoAsync(localUri);
    
    console.log('📤 [ShareVideo] File info:', { uri: localUri, exists: info.exists, size: info.size });
    
    if (!info.exists) {
      throw new Error('Downloaded file does not exist');
    }
    
    if (info.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    const finalUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
    console.log('📤 [ShareVideo] Final URI for sharing:', finalUri);
    
    await Sharing.shareAsync(finalUri);
    
    console.log('✅ [ShareVideo] Video shared successfully');
    
  } catch (shareError) {
    console.error('[ShareVideo] shareVideoNow error:', shareError);
    Alert.alert('Share Error', 'There was a problem sharing the video. Please try again.');
  }
}