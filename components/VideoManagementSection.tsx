import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import { shareVideo } from './ShareVideoHelper';
import VideoButton from './VideoButton';
import VideoPlayerModal from './VideoPlayerModal';
import VideoReplaceConfirmModal from './VideoReplaceConfirmModal';
import VideoActionButtons from './VideoActionButtons';
import { fetchEventCompetitorsWithScores } from '../app/lib/eventHelpersRest2';

interface VideoManagementSectionProps {
  competitorId: string; eventId: string; tournamentId: string; scoreId?: string;
  competitorName?: string; eventName?: string; judgeScores?: number[]; totalScore?: number;
  rank?: number; onVideoUpdate?: (hasVideo: boolean) => void;
  onVideoStatusChange?: (hasVideo: boolean) => void;
  competitor?: { id?: string; name?: string; firstName?: string; lastName?: string };
  event?: { name?: string; title?: string };
  sortedCompetitors?: { id: string; [key: string]: any }[];
}

export default function VideoManagementSection({
  competitorId, eventId, tournamentId, scoreId, competitorName, eventName, judgeScores, totalScore, rank, onVideoUpdate, onVideoStatusChange, competitor, event, sortedCompetitors
}: VideoManagementSectionProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(scoreId || null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [fullCompetitor, setFullCompetitor] = useState<any>(null);

  useEffect(() => { loadVideoAndScore(); }, []);

  const loadVideoAndScore = async () => {
    try {
      const { data: scoreData } = await supabase.from('event_scores').select('id, video_url, has_video')
        .eq('tournament_id', tournamentId).eq('event_id', eventId).eq('tournament_competitor_id', competitorId).single();
      if (scoreData) {
        setCurrentScoreId(scoreData.id); setVideoUrl(scoreData.video_url); setHasVideo(scoreData.has_video || false);
      }
      
      const competitors = await fetchEventCompetitorsWithScores(eventId);
      const foundCompetitor = competitors.find(c => c.tournament_competitor_id === competitorId);
      setFullCompetitor(foundCompetitor);
    } catch (error) { console.error('Error loading video:', error); } finally { setLoading(false); }
  };

  const updateVideoStatus = async (hasVideoStatus: boolean, url: string | null = null) => {
    setHasVideo(hasVideoStatus); setVideoUrl(url); 
    try { await updateFinalRanks(eventId); } catch (error) { console.error('Error updating ranks:', error); }
    onVideoUpdate?.(hasVideoStatus); onVideoStatusChange?.(hasVideoStatus);
  };

  const handleVideoUpload = async (uri: string) => {
    if (!eventId) {
      console.error('Missing eventId — cannot upload video');
      Alert.alert('Error', 'Event ID is required for video upload');
      return { success: false };
    }
    
    console.log('Uploading video with eventId:', eventId);
    setUploadProgress(0);
    try {
      if (!currentScoreId) {
        const { data: scoreData } = await supabase.from('event_scores')
          .select('id').eq('tournament_id', tournamentId).eq('event_id', eventId)
          .eq('tournament_competitor_id', competitorId).single();
        
        if (!scoreData) throw new Error('No score record found. Please save scores first.');
        setCurrentScoreId(scoreData.id);
      }

      const { data: tournamentCompetitor } = await supabase
        .from('tournament_competitors')
        .select('name, tournament_id')
        .eq('id', competitorId)
        .single();
      
      const finalCompetitorName = tournamentCompetitor?.name || competitorName;
      const finalTournamentId = tournamentCompetitor?.tournament_id || tournamentId;
      
      if (!finalCompetitorName || finalCompetitorName === 'Unknown Competitor') {
        Alert.alert('Error', 'Competitor name is required before uploading a video.');
        return { success: false };
      }

      if (!finalTournamentId) {
        Alert.alert('Error', 'Tournament ID is required before uploading a video.');
        return { success: false };
      }

      const { data: eventExists, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (eventError || !eventExists) {
        console.error('Event validation failed:', eventError);
        Alert.alert('Error', 'Event not found in database. Cannot upload video.');
        return { success: false };
      }

      const { data: eventParticipant } = await supabase.from('event_participants')
        .select('id').eq('tournament_competitor_id', competitorId).eq('event_id', eventId).single();
      
      const eventParticipantId = eventParticipant?.id;

      console.log('Pre-upload validation:', {
        competitor_name: finalCompetitorName,
        tournament_competitor_id: competitorId,
        event_id: eventId,
        tournament_id: finalTournamentId,
        event_participant_id: eventParticipantId,
        event_exists: !!eventExists
      });

      const fileName = `${competitorId}_${eventId}_${Date.now()}.mp4`;
      const progressInterval = setInterval(() => { setUploadProgress(prev => Math.min(prev + 10, 90)); }, 200);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_videos')
        .upload(fileName, {
          uri,
          type: 'video/mp4',
          name: fileName
        } as any);
      
      clearInterval(progressInterval); 
      setUploadProgress(95);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('event_videos').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase.from('event_scores')
        .update({ video_url: publicUrl, has_video: true })
        .eq('id', currentScoreId);
      
      if (updateError) throw updateError;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const videoPayload = {
        competitor_id: competitorId,
        event_participant_id: eventParticipantId,
        tournament_id: finalTournamentId,
        event_id: eventId,
        video_url: publicUrl,
        uploaded_by: user?.id,
        total_score: totalScore || 0,
        placement: rank || null,
        competitor_name: finalCompetitorName,
        metadata: {
          judge_scores: judgeScores || [],
          event_name: eventName || 'Traditional Forms',
          competitor_name: finalCompetitorName,
          score_id: currentScoreId
        }
      };

      console.log('Video payload for insert:', videoPayload);
      
      const { error: videoInsertError } = await supabase.from('videos').insert(videoPayload);
      
      if (videoInsertError) {
        console.error('Database insert failed:', videoInsertError);
        Alert.alert('Database Error', `Failed to save video record: ${videoInsertError.message}`);
        return { success: false };
      }
      
      setUploadProgress(100);
      await updateVideoStatus(true, publicUrl); 
      Alert.alert('Success', 'Video uploaded successfully');
      return { success: true };
    } catch (error) { 
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload video: ${error.message || 'Unknown error'}`); 
      return { success: false };
    } finally { 
      setUploadProgress(0); 
    }
  };

  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });
      
      if (!result.canceled && result.assets[0]) {
        if (hasVideo) {
          setShowReplaceConfirm(true);
          return;
        }
        setIsUploading(true);
        const uploadResult = await handleVideoUpload(result.assets[0].uri);
        if (uploadResult.success) {
          await loadVideoAndScore();
        }
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Failed to select video');
      setIsUploading(false);
    }
  };

  const handleRecord = async (videoUri: string) => {
    try {
      if (hasVideo) {
        setShowReplaceConfirm(true);
        return;
      }
      setIsUploading(true);
      const uploadResult = await handleVideoUpload(videoUri);
      if (uploadResult.success) {
        await loadVideoAndScore();
      }
      setIsUploading(false);
    } catch (error) {
      console.error('Error uploading recorded video:', error);
      Alert.alert('Error', 'Failed to upload recorded video');
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!hasVideo || !videoUrl) return;
    
    try {
      const fileName = videoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('event_videos').remove([fileName]);
      }
      await supabase.from('videos').delete().eq('video_url', videoUrl);
      await supabase.from('event_scores').update({ video_url: null, has_video: false }).eq('id', currentScoreId);
      
      await updateVideoStatus(false, null);
      Alert.alert('Success', 'Video deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete video');
    }
  };

  if (loading) return (<View style={styles.section}><Text style={styles.sectionTitle}>Video Management</Text><Text style={styles.loadingText}>Loading...</Text></View>);
  if (!totalScore || totalScore <= 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Video Management</Text>
      <VideoActionButtons
        hasVideo={hasVideo}
        onUpload={handleUpload}
        onView={() => setShowVideoPlayer(true)}
        onDelete={handleDeleteVideo}
        uploading={isUploading}
        videoUrl={videoUrl || undefined}
        competitorName={competitorName}
        eventName={eventName}
        placement={rank?.toString()}
        score={totalScore?.toString()}
        competitor={fullCompetitor || competitor}
        eventId={eventId}
        uploadProgress={uploadProgress}
        onRecord={handleRecord}
        rank={rank}
        scoreA={fullCompetitor?.judge_a_score}
        scoreB={fullCompetitor?.judge_b_score}
        scoreC={fullCompetitor?.judge_c_score}
        totalScore={fullCompetitor?.total_score || totalScore}
      />
      <VideoPlayerModal visible={showVideoPlayer} videoUrl={videoUrl || ''} onClose={() => setShowVideoPlayer(false)} />
      <VideoReplaceConfirmModal visible={showReplaceConfirm} onClose={() => setShowReplaceConfirm(false)} onConfirm={async () => {
        setShowReplaceConfirm(false);
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 1,
        });
        if (!result.canceled && result.assets[0]) {
          setIsUploading(true);
          if (hasVideo && videoUrl) {
            const fileName = videoUrl.split('/').pop();
            if (fileName) {
              await supabase.storage.from('event_videos').remove([fileName]);
            }
            await supabase.from('videos').delete().eq('video_url', videoUrl);
          }
          const uploadResult = await handleVideoUpload(result.assets[0].uri);
          if (uploadResult.success) {
            await loadVideoAndScore();
          }
          setIsUploading(false);
        }
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 4 },
  loadingText: { fontSize: 16, color: '#666666', textAlign: 'center' }
});