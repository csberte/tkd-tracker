import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { shareVideoWithPopup } from './ShareVideoHelperWithPopup';
import { supabase } from '../app/lib/supabase';

interface VideoActionButtonsProps {
  hasVideo: boolean;
  onUpload: () => void;
  onView: () => void;
  onDelete: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  uploading?: boolean;
  sharing?: boolean;
  downloading?: boolean;
  deleting?: boolean;
  videoUrl?: string;
  competitorName?: string;
  eventName?: string;
  placement?: string;
  score?: string;
  competitor?: any;
  eventId?: string;
  uploadProgress?: number;
  onRecord?: (videoUri: string) => void;
  rank?: number;
  scoreA?: number;
  scoreB?: number;
  scoreC?: number;
  totalScore?: number;
}

export default function VideoActionButtons({
  hasVideo, onUpload, onView, onDelete, onDownload, onShare,
  uploading = false, sharing = false, downloading = false, deleting = false,
  videoUrl, competitorName, eventName, placement, score, competitor, eventId,
  uploadProgress = 0, onRecord, rank, scoreA, scoreB, scoreC, totalScore
}: VideoActionButtonsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [shareProgress, setShareProgress] = useState(0);

  const handleDownload = async () => {
    if (!videoUrl) {
      Alert.alert('Error', 'No video URL available');
      return;
    }
    
    try {
      const fileUri = FileSystem.documentDirectory + `video_${Date.now()}.mp4`;
      const { uri } = await FileSystem.downloadAsync(videoUrl, fileUri);
      Alert.alert('Success', 'Video downloaded to app storage');
    } catch (error) {
      Alert.alert('Error', 'Failed to download video');
    }
  };

  const handleShare = async () => {
    if (!videoUrl) {
      Alert.alert('Error', 'No video URL available');
      return;
    }
    
    // Enhanced validation for competitor object
    console.log('🔍 [VideoActionButtons] Received competitor object:', competitor);
    
    if (!competitor) {
      console.error('❌ [VideoActionButtons] Competitor object is null or undefined');
      Alert.alert('Error', 'Competitor information is missing. Cannot share video.');
      return;
    }
    
    if (!competitor.tournament_competitor_id && !competitor.id) {
      console.error('❌ [VideoActionButtons] Competitor missing both tournament_competitor_id and id:', competitor);
      Alert.alert('Error', 'Competitor ID is missing. Cannot share video.');
      return;
    }
    
    if (!eventId) {
      console.error('❌ [VideoActionButtons] Event ID is missing');
      Alert.alert('Error', 'Event ID is missing. Cannot share video.');
      return;
    }
    
    setIsSharing(true);
    setShareProgress(0);
    
    try {
      setShareProgress(25);
      
      // Ensure tournament_competitor_id is always passed with fallback
      const validCompetitor = {
        ...competitor,
        tournament_competitor_id: competitor?.tournament_competitor_id ?? competitor?.id,
      };
      
      console.log('✅ [VideoActionButtons] Passing validated competitor to shareVideoWithPopup:', {
        name: validCompetitor.name,
        tournament_competitor_id: validCompetitor.tournament_competitor_id,
        id: validCompetitor.id
      });
      
      await shareVideoWithPopup({
        videoUrl,
        competitorName: competitorName || competitor?.name || 'Unknown',
        eventName: eventName || 'Traditional Forms',
        placement,
        score,
        rank,
        eventId,
        competitor: validCompetitor,
        onProgressUpdate: (progress) => {
          setShareProgress(50 + (progress * 0.5));
        }
      });
      
      setShareProgress(100);
      
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setTimeout(() => {
        setIsSharing(false);
        setShareProgress(0);
      }, 500);
    }
  };

  const handleRecord = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to record videos.');
        return;
      }

      setRecording(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });
      
      if (!result.canceled && result.assets[0]) {
        onRecord?.(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.buttonFullWidth, styles.watchButton, !hasVideo && styles.disabledButton]}
        onPress={onView} disabled={!hasVideo}>
        <Text style={[styles.buttonText, !hasVideo && styles.disabledText]}>▶️ Watch Video</Text>
      </TouchableOpacity>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.buttonFullWidth, styles.recordButton, recording && styles.disabledButton]}
          onPress={handleRecord} disabled={recording}>
          <Text style={[styles.buttonText, recording && styles.disabledText]}>
            {recording ? 'Recording...' : '📹 Record Video'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.buttonFullWidth, styles.uploadButton, uploading && styles.disabledButton]}
          onPress={onUpload} disabled={uploading}>
          <Text style={[styles.buttonText, uploading && styles.disabledText]}>
            {uploading ? `Uploading... ${uploadProgress}%` : '⬆️ Upload Video'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.buttonFullWidth, styles.deleteButton, (!hasVideo || deleting) && styles.disabledButton]}
          onPress={onDelete} disabled={!hasVideo || deleting}>
          <Text style={[styles.buttonText, (!hasVideo || deleting) && styles.disabledText]}>
            {deleting ? 'Deleting...' : '✖ Delete Video'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.buttonFullWidth, styles.downloadButton, (!hasVideo || downloading) && styles.disabledButton]}
          onPress={onDownload || handleDownload} disabled={!hasVideo || downloading}>
          <Text style={[styles.buttonText, (!hasVideo || downloading) && styles.disabledText]}>
            {downloading ? 'Downloading...' : '⬇ Download Video'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.buttonFullWidth, 
          styles.shareButton, 
          (!hasVideo || sharing || isSharing) && styles.disabledButton
        ]}
        onPress={onShare || handleShare} 
        disabled={!hasVideo || sharing || isSharing}
      >
        <View style={styles.shareButtonContent}>
          {isSharing && (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
          )}
          <Text style={[styles.buttonText, (!hasVideo || sharing || isSharing) && styles.disabledText]}>
            {isSharing ? `Sharing... ${Math.round(shareProgress)}%` : '↗ Share Video'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingHorizontal: 0 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  buttonFullWidth: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 25, minHeight: 48
  },
  watchButton: { backgroundColor: '#EF4444' },
  recordButton: { backgroundColor: '#DC2626' },
  uploadButton: { backgroundColor: '#DC2626' },
  deleteButton: { backgroundColor: '#000000' },
  downloadButton: { backgroundColor: '#000000' },
  shareButton: { backgroundColor: '#DC2626' },
  disabledButton: { backgroundColor: '#F3F4F6' },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', flexWrap: 'wrap' },
  disabledText: { color: '#999' },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
});