import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareVideoWithClipboard } from './ShareVideoHelperFixed';
import VideoUploadModalFixed from './VideoUploadModalFixed';
import VideoReplaceConfirmModal from './VideoReplaceConfirmModal';

interface VideoActionButtonsProps {
  competitor: any;
  eventId: string;
  eventName?: string;
  tournamentName?: string;
  tournamentClass?: string;
  onVideoUploaded?: () => void;
  style?: any;
}

export default function VideoActionButtonsWithClipboardFix({
  competitor,
  eventId,
  eventName,
  tournamentName,
  tournamentClass,
  onVideoUploaded,
  style
}: VideoActionButtonsProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const hasVideo = competitor?.video_url;
  const competitorName = competitor?.name || `${competitor?.first_name || ''} ${competitor?.last_name || ''}`.trim();

  const handleVideoPress = () => {
    if (hasVideo) {
      setShowReplaceModal(true);
    } else {
      setShowUploadModal(true);
    }
  };

  const handleSharePress = async () => {
    if (!hasVideo) {
      Alert.alert('No Video', 'Please upload a video first before sharing.');
      return;
    }

    if (!competitor?.total_score || competitor.total_score === 0) {
      Alert.alert('No Score', 'Please score this competitor first before sharing.');
      return;
    }

    setIsSharing(true);
    try {
      await shareVideoWithClipboard({
        videoUri: competitor.video_url,
        competitor,
        eventId,
        eventName,
        tournamentName,
        tournamentClass,
        name: competitorName
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Error', 'Failed to share video. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleVideoUploaded = () => {
    setShowUploadModal(false);
    setShowReplaceModal(false);
    if (onVideoUploaded) {
      onVideoUploaded();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.button, hasVideo ? styles.videoButton : styles.uploadButton]} 
        onPress={handleVideoPress}
      >
        <Ionicons 
          name={hasVideo ? "videocam" : "videocam-outline"} 
          size={16} 
          color="white" 
        />
        <Text style={styles.buttonText}>
          {hasVideo ? 'Video' : 'Upload'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.shareButton, (!hasVideo || isSharing) && styles.disabledButton]} 
        onPress={handleSharePress}
        disabled={!hasVideo || isSharing}
      >
        <Ionicons 
          name="share-outline" 
          size={16} 
          color={(!hasVideo || isSharing) ? '#999' : 'white'} 
        />
        <Text style={[styles.buttonText, (!hasVideo || isSharing) && styles.disabledText]}>
          {isSharing ? 'Sharing...' : 'Share'}
        </Text>
      </TouchableOpacity>

      <VideoUploadModalFixed
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        competitor={competitor}
        eventId={eventId}
        onVideoUploaded={handleVideoUploaded}
      />

      <VideoReplaceConfirmModal
        visible={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        onConfirm={() => {
          setShowReplaceModal(false);
          setShowUploadModal(true);
        }}
        competitorName={competitorName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  videoButton: {
    backgroundColor: '#34C759',
  },
  shareButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
});