import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../app/lib/supabase';

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
}

export default function VideoUploadModalFixed({ visible, onClose, scoreId, onUploadComplete, onProgress, competitorId, competitorName, eventId, tournamentId }: VideoUploadModalProps) {
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

      // ENHANCED VALIDATION: Check all required fields
      const validationErrors = [];
      
      if (!eventId) validationErrors.push('Event ID');
      if (!tournamentId) validationErrors.push('Tournament ID');
      if (!competitorName || competitorName === 'Unknown Competitor') validationErrors.push('Competitor name');
      if (!competitorId) validationErrors.push('Competitor ID');
      
      if (validationErrors.length > 0) {
        Alert.alert(
          'Missing Information',
          `Missing event or tournament details: ${validationErrors.join(', ')}. Please try reloading this screen or contact support.`
        );
        setUploadStatus('idle');
        return;
      }

      // Validate event exists in database
      console.log('🔍 [VideoUpload] Checking if event_id exists:', eventId);
      const { data: eventExists, error: eventCheckError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (eventCheckError || !eventExists) {
        console.error('❌ [VideoUpload] Event not found:', eventCheckError);
        Alert.alert(
          'Configuration Error',
          'Missing event or tournament details. Please try reloading this screen or contact support.'
        );
        setUploadStatus('idle');
        return;
      }
      
      console.log('✅ [VideoUpload] Event exists:', eventExists);

      // Get enhanced competitor data
      let finalCompetitorName = competitorName;
      let finalTournamentId = tournamentId;
      let eventParticipantId = null;
      let totalScore = 0;
      let placement = null;

      // Get competitor name and tournament ID from database
      if (competitorId) {
        const { data: tournamentCompetitor } = await supabase
          .from('tournament_competitors')
          .select('name, tournament_id')
          .eq('id', competitorId)
          .single();
        
        if (tournamentCompetitor) {
          finalCompetitorName = tournamentCompetitor.name;
          finalTournamentId = finalTournamentId || tournamentCompetitor.tournament_id;
        }
      }

      // Get event_participant_id
      if (competitorId && eventId) {
        const { data: eventParticipant } = await supabase
          .from('event_participants')
          .select('id')
          .eq('tournament_competitor_id', competitorId)
          .eq('event_id', eventId)
          .single();
        
        eventParticipantId = eventParticipant?.id;
      }

      // Get score data
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

      // FINAL VALIDATION: Double-check all required fields
      if (!finalCompetitorName || finalCompetitorName === 'Unknown Competitor') {
        Alert.alert(
          'Missing Information',
          'Missing event or tournament details. Please try reloading this screen or contact support.'
        );
        setUploadStatus('idle');
        return;
      }

      if (!finalTournamentId) {
        Alert.alert(
          'Missing Information',
          'Missing event or tournament details. Please try reloading this screen or contact support.'
        );
        setUploadStatus('idle');
        return;
      }

      console.log('🎯 [VideoUpload] Pre-upload validation passed:', {
        competitor_name: finalCompetitorName,
        tournament_competitor_id: competitorId,
        event_id: eventId,
        tournament_id: finalTournamentId,
        event_participant_id: eventParticipantId,
        total_score: totalScore,
        placement: placement
      });

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
          const videoPayload = {
            competitor_id: competitorId,
            event_participant_id: eventParticipantId,
            tournament_id: finalTournamentId,
            event_id: eventId,
            video_url: signedUrlData.signedUrl,
            uploaded_by: user?.id,
            total_score: totalScore,
            placement: placement,
            competitor_name: finalCompetitorName,
            metadata: {
              event_name: 'Traditional Forms',
              competitor_name: finalCompetitorName,
              score_id: scoreId
            }
          };

          console.log('📝 [VideoUpload] Full payload being inserted:', videoPayload);
          
          const { error: videoInsertError } = await supabase
            .from('videos')
            .insert(videoPayload);
          
          if (videoInsertError) {
            console.error('❌ [VideoUpload] Database insert failed:', videoInsertError);
            Alert.alert(
              'Database Error',
              'Missing event or tournament details. Please try reloading this screen or contact support.'
            );
            setUploadStatus('idle');
            return;
          }
          
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
      Alert.alert(
        'Upload Error',
        'Missing event or tournament details. Please try reloading this screen or contact support.'
      );
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