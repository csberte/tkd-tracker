import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { getRankEmoji, normalizeRank, getPlacementText } from '../app/lib/rankUtils';

export async function shareVideoWithClipboard({
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

    const competitorNameFinal = name || competitorName || competitor?.name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
    const eventTitle = eventName || event?.title || event?.name || 'Event';
    
    if (!eventId || !competitor) {
      Alert.alert('Share Error', 'Missing event or competitor information.');
      return;
    }
    
    const validId = competitor.tournament_competitor_id || competitor.id;
    
    if (!validId) {
      Alert.alert('Share Error', 'Cannot retrieve competitor scores - missing competitor ID.');
      return;
    }
    
    // Fetch judge scores from database
    const { data, error } = await supabase
      .from('event_scores')
      .select('judge_a_score, judge_b_score, judge_c_score, total_score, final_rank')
      .eq('event_id', eventId)
      .eq('tournament_competitor_id', validId)
      .single();
    
    if (error || !data) {
      Alert.alert('Share Error', 'Failed to fetch judge scores from database.');
      return;
    }
    
    if (data.judge_a_score == null || data.judge_b_score == null || data.judge_c_score == null) {
      Alert.alert('Share Error', 'Individual judge scores are required but missing.');
      return;
    }
    
    const total = data.total_score || (data.judge_a_score + data.judge_b_score + data.judge_c_score);
    const scoreLine = `Score: ${total} (${data.judge_b_score}, ${data.judge_c_score}, ${data.judge_a_score})`;
    
    // Use normalized rank (integer) for placement
    const competitorRank = normalizeRank(data.final_rank || competitor?.final_rank || rank);
    
    // Generate placement text with both emoji and text
    let placementDisplay = '';
    if (competitorRank && competitorRank <= 3) {
      const emoji = getRankEmoji(competitorRank);
      const placementText = getPlacementText(competitorRank);
      placementDisplay = `${emoji} ${placementText}`;
    } else {
      placementDisplay = 'No Placement';
    }
    
    const shareText = `🥋 ${competitorNameFinal} – ${eventTitle}\n${scoreLine}\n${placementDisplay}\nScored. Tracked. Shared.\nwww.TKDTracker.com`;
    
    // Copy message to clipboard
    await Clipboard.setStringAsync(shareText);
    
    // Wait for iOS compatibility
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Share video without message field for iOS compatibility
    await shareVideoNow(uri, onProgressUpdate);
    
  } catch (err) {
    console.error('Share error:', err);
    Alert.alert('Share Error', 'Failed to share video. Please try again.');
  }
}

async function shareVideoNow(supabaseUrl: string, onProgressUpdate?: (progress: number) => void) {
  try {
    const localUri = FileSystem.documentDirectory + `sharedvideo_${Date.now()}.mp4`;
    
    const downloadResult = await FileSystem.downloadAsync(supabaseUrl, localUri);
    
    const info = await FileSystem.getInfoAsync(localUri);
    
    if (!info.exists || info.size === 0) {
      throw new Error('Downloaded file is invalid');
    }
    
    const finalUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
    
    // iOS-safe sharing - no message field
    await Sharing.shareAsync(finalUri);
    
  } catch (shareError) {
    console.error('shareVideoNow error:', shareError);
    Alert.alert('Share Error', 'There was a problem sharing the video. Please try again.');
  }
}