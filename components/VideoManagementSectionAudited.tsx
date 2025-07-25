import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../app/lib/supabase';
import VideoActionButtons from './VideoActionButtons';
import VideoPlayerModal from './VideoPlayerModal';
import VideoReplaceConfirmModal from './VideoReplaceConfirmModal';

interface VideoManagementSectionProps {
  competitorId: string; eventId: string; tournamentId: string; scoreId?: string;
  competitorName?: string; eventName?: string; totalScore?: number;
  rank?: number; onVideoStatusChange?: (hasVideo: boolean) => void;
}

export default function VideoManagementSectionAudited({
  competitorId, eventId, tournamentId, scoreId, competitorName, eventName, totalScore, rank, onVideoStatusChange
}: VideoManagementSectionProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  console.log('VideoManagementSectionAudited props:', {
    competitorId, eventId, tournamentId, scoreId, competitorName
  });

  useEffect(() => { loadVideoAndScore(); }, []);

  const loadVideoAndScore = async () => {
    try {
      const { data: scoreData } = await supabase.from('event_scores').select('id, video_url, has_video')
        .eq('tournament_id', tournamentId).eq('event_id', eventId).eq('tournament_competitor_id', competitorId).single();
      if (scoreData) {
        setVideoUrl(scoreData.video_url); setHasVideo(scoreData.has_video || false);
        console.log('✅ Loaded video data:', { scoreId: scoreData.id, hasVideo: scoreData.has_video });
      }
    } catch (error) { 
      console.error('❌ Error loading video:', error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVideoUpload = async (uri: string) => {
    if (!eventId) {
      console.error('❌ Missing eventId for video upload');
      Alert.alert('Error', 'Event ID is required for video upload');
      return { success: false };
    }
    
    console.log('🎥 Uploading video with eventId:', eventId);
    
    try {
      console.log('🔍 Verifying event exists in database...');
      const { data: eventExists, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (eventError || !eventExists) {
        console.error('❌ Event not found in database:', eventId);
        console.error('❌ Event validation error:', eventError);
        Alert.alert('Error', 'Event not found in database. Cannot upload video.');
        return { success: false };
      }
      
      console.log('✅ Event exists in database:', eventExists.id);
      
      const fileName = `${competitorId}_${eventId}_${Date.now()}.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_videos')
        .upload(fileName, {
          uri,
          type: 'video/mp4',
          name: fileName
        } as any);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('event_videos').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase.from('event_scores')
        .update({ video_url: publicUrl, has_video: true })
        .eq('id', scoreId);
      
      if (updateError) throw updateError;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const videoPayload = {
        competitor_id: competitorId,
        tournament_id: tournamentId,
        event_id: eventId,
        video_url: publicUrl,
        uploaded_by: user?.id,
        total_score: totalScore || 0,
        placement: rank || null,
        competitor_name: competitorName || 'Unknown',
        metadata: {
          event_name: eventName || 'Traditional Forms',
          competitor_name: competitorName || 'Unknown',
          score_id: scoreId
        }
      };

      console.log('🎥 Video payload for insert:', videoPayload);
      console.log('🔄 Attempting video insert to database...');
      
      const { error: videoInsertError } = await supabase.from('videos').insert(videoPayload);
      
      if (videoInsertError) {
        console.error('❌ Database insert failed:', videoInsertError);
        Alert.alert('Database Error', `Failed to save video record: ${videoInsertError.message}`);
        return { success: false };
      }
      
      console.log('✅ Video insert successful');
      
      setHasVideo(true); setVideoUrl(publicUrl);
      onVideoStatusChange?.(true);
      Alert.alert('Success', 'Video uploaded successfully');
      return { success: true };
    } catch (error) { 
      console.error('❌ Upload error:', error);
      Alert.alert('Error', `Failed to upload video: ${error.message || 'Unknown error'}`); 
      return { success: false };
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

  const handleDeleteVideo = async () => {
    if (!hasVideo || !videoUrl) return;
    
    try {
      const fileName = videoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('event_videos').remove([fileName]);
      }
      await supabase.from('videos').delete().eq('video_url', videoUrl);
      await supabase.from('event_scores').update({ video_url: null, has_video: false }).eq('id', scoreId);
      
      setHasVideo(false); setVideoUrl(null);
      onVideoStatusChange?.(false);
      Alert.alert('Success', 'Video deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete video');
    }
  };

  if (loading) return (<View style={styles.section}><Text style={styles.sectionTitle}>Video Management</Text><Text style={styles.loadingText}>Loading...</Text></View>);
  if (!totalScore || totalScore <= 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Video Management (Audited)</Text>
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
        eventId={eventId}
        rank={rank}
        totalScore={totalScore}
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