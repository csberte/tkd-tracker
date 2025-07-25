import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../app/lib/supabase';
import { initializeTournamentEvents } from '../app/lib/tournamentEventsInitializer';
import VideoActionButtons from './VideoActionButtons';
import VideoPlayerModal from './VideoPlayerModal';
import VideoReplaceConfirmModal from './VideoReplaceConfirmModal';

interface VideoManagementSectionUltimateProps {
  competitorId: string;
  eventId: string;
  tournamentId: string;
  scoreId?: string;
  competitorName?: string;
  eventName?: string;
  totalScore?: number;
  rank?: number;
  onVideoStatusChange?: (hasVideo: boolean) => void;
}

export default function VideoManagementSectionUltimate({
  competitorId, eventId, tournamentId, scoreId, competitorName, eventName, totalScore, rank, onVideoStatusChange
}: VideoManagementSectionUltimateProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  useEffect(() => {
    loadVideoAndScore();
  }, []);

  const loadVideoAndScore = async () => {
    try {
      const { data: scoreData } = await supabase
        .from('event_scores')
        .select('id, video_url, has_video')
        .eq('tournament_id', tournamentId)
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .single();
        
      if (scoreData) {
        setVideoUrl(scoreData.video_url);
        setHasVideo(scoreData.has_video || false);
      }
    } catch (error) {
      console.error('Error loading video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (uri: string) => {
    if (!eventId) {
      Alert.alert('Error', 'Event ID is required for video upload');
      return { success: false };
    }
    
    try {
      // Initialize tournament events first
      await initializeTournamentEvents(tournamentId);
      
      // Get the tournament_events record
      const { data: tournamentEvent, error: tournamentEventError } = await supabase
        .from('tournament_events')
        .select('id')
        .eq('event_id', eventId)
        .eq('tournament_id', tournamentId)
        .single();
      
      if (tournamentEventError || !tournamentEvent) {
        console.error('Tournament event not found after initialization:', { eventId, tournamentId });
        return { success: false };
      }
      
      const fileName = `${competitorId}_${eventId}_${Date.now()}.mp4`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_videos')
        .upload(fileName, {
          uri,
          type: 'video/mp4',
          name: fileName
        } as any);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('event_videos')
        .getPublicUrl(fileName);
      
      // Update event_scores with video info
      if (scoreId) {
        const { error: updateError } = await supabase
          .from('event_scores')
          .update({ video_url: publicUrl, has_video: true })
          .eq('id', scoreId);
        
        if (updateError) {
          console.error('Score update error:', updateError);
        }
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert video record using tournament_events.id
      const videoPayload = {
        competitor_id: competitorId,
        tournament_id: tournamentId,
        event_id: tournamentEvent.id,
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

      const { data: videoData, error: videoInsertError } = await supabase
        .from('videos')
        .insert(videoPayload)
        .select();
      
      if (videoInsertError) {
        console.error('Video insert failed:', videoInsertError);
        // Don't show error popup if video uploaded successfully
        return { success: true, videoUrl: publicUrl };
      }
      
      setHasVideo(true);
      setVideoUrl(publicUrl);
      onVideoStatusChange?.(true);
      
      return { success: true, videoUrl: publicUrl };
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
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
      if (scoreId) {
        await supabase.from('event_scores').update({ video_url: null, has_video: false }).eq('id', scoreId);
      }
      
      setHasVideo(false);
      setVideoUrl(null);
      onVideoStatusChange?.(false);
      Alert.alert('Success', 'Video deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete video');
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video Management</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
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
        eventId={eventId}
        rank={rank}
        totalScore={totalScore}
      />
      <VideoPlayerModal
        visible={showVideoPlayer}
        videoUrl={videoUrl || ''}
        onClose={() => setShowVideoPlayer(false)}
      />
      <VideoReplaceConfirmModal
        visible={showReplaceConfirm}
        onClose={() => setShowReplaceConfirm(false)}
        onConfirm={async () => {
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
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});