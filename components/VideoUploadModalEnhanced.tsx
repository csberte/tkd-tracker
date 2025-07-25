import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../app/lib/supabase';
import { insertVideoWithDualSupport } from '../app/lib/videoHelpersEnhanced';

export interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  scoreId: string;
  onUploadComplete: (videoUrl: string) => void;
  onProgress?: (pct: number) => void;
  competitorId?: string;
  competitorName?: string;
  eventId?: string;
  tournamentId?: string;
  eventParticipantId?: string;
}

export default function VideoUploadModalEnhanced({ 
  visible, 
  onClose, 
  scoreId, 
  onUploadComplete, 
  onProgress, 
  competitorId, 
  competitorName, 
  eventId, 
  tournamentId,
  eventParticipantId 
}: VideoUploadModalProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'buffering' | 'uploading' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickVideo = async () => {
    try {
      setUploadStatus('buffering');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || !result.assets.length) {
        setUploadStatus('idle');
        return;
      }

      const video = result.assets[0];
      await uploadVideoToSupabase(video);
    } catch (error) {
      console.error('Error picking video:', error);
      setUploadStatus('idle');
      Alert.alert('Upload Error', error?.message || 'Failed to upload video.');
    }
  };

  const uploadVideoToSupabase = async (video: any) => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      onProgress?.(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Validate required fields
      if (!eventId || !eventParticipantId) {
        Alert.alert('Error', 'Event ID and Event Participant ID are required');
        setUploadStatus('idle');
        return;
      }

      // Get additional data
      let finalCompetitorName = competitorName || 'Unknown Competitor';
      let finalTournamentId = tournamentId;
      let totalScore = 0;
      let placement = null;

      // Get score data if available
      if (scoreId) {
        const { data: scoreData } = await supabase
          .from('event_scores')
          .select('total_score, final_rank')
          .eq('id', scoreId)
          .single();
        
        if (scoreData) {
          totalScore = scoreData.total_score || 0;
          placement = scoreData.final_rank;
        }
      }

      // Upload to storage
      const fileName = video.fileName || 'video.mp4';
      const extension = fileName.toLowerCase().split('.').pop();
      const mimeType = extension === 'mov' ? 'video/quicktime' : 'video/mp4';
      
      const filePath = `${user.id}/${scoreId}/${fileName}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = Math.min(prev + 10, 90);
          onProgress?.(next);
          return next;
        });
      }, 200);
      
      const result = await FileSystem.uploadAsync(
        `https://amoeqxpjmvopngvdcadl.supabase.co/storage/v1/object/videos/${filePath}`,
        video.uri,
        {
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': mimeType,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtb2VxeHBqbXZvcG5ndmRjYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNzQ4NjMsImV4cCI6MjA0OTk1MDg2M30.NG_3xeOGjJdGJJrKiSEoHFKRhRHqvJjmBhGJYYZXuJE'
          },
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      onProgress?.(100);

      if (result.status === 200) {
        const { data: signedUrlData } = await supabase.storage
          .from('videos')
          .createSignedUrl(filePath, 3600);

        if (signedUrlData?.signedUrl) {
          // Use dual insert function
          await insertVideoWithDualSupport({
            event_id: eventId,
            event_participant_id: eventParticipantId,
            video_url: signedUrlData.signedUrl,
            uploaded_by: user.id,
            total_score: totalScore,
            placement: placement,
            competitor_name: finalCompetitorName,
            tournament_id: finalTournamentId,
            metadata: {
              event_name: 'Traditional Forms',
              competitor_name: finalCompetitorName,
              score_id: scoreId
            }
          });
          
          setUploadStatus('success');
          onUploadComplete(signedUrlData.signedUrl);
          Alert.alert('Success', '✅ Upload successful');
          setTimeout(() => {
            onClose();
            setUploadStatus('idle');
            setUploadProgress(0);
          }, 1500);
        }
      } else {
        throw new Error(`Upload failed with status: ${result.status}`);
      }
    } catch (error) {
      console.error('❌ [VideoUpload] Upload error:', error);
      Alert.alert('Error', `Failed to upload video: ${error.message || 'Unknown error'}`);
      setUploadStatus('idle');
      setUploadProgress(0);
      onProgress?.(0);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Video</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={pickVideo} 
            disabled={uploadStatus !== 'idle'}
          >
            {uploadStatus === 'idle' ? (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Select Video</Text>
              </>
            ) : (
              <ActivityIndicator color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          {uploadStatus === 'uploading' && (
            <Text style={styles.progressText}>
              Uploading {uploadProgress.toFixed(0)}%
            </Text>
          )}
          
          <Text style={styles.note}>
            Max file size: 600MB{"\n"}
            Formats: .mp4, .mov
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});