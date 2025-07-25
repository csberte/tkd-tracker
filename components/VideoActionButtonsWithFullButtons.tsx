import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { VideoData } from '../app/lib/videoSortAndFilterFixed';
import { shareVideoWithPopup } from './ShareVideoHelperWithPopup';

interface VideoActionButtonsWithFullButtonsProps {
  video: VideoData;
  onWatch: () => void;
  sharing: boolean;
}

export default function VideoActionButtonsWithFullButtons({ 
  video, 
  onWatch, 
  sharing 
}: VideoActionButtonsWithFullButtonsProps) {
  const handleShare = async () => {
    if (!video.video_url || !video.event_id) {
      Alert.alert('Share Error', 'Missing video or event information.');
      return;
    }

    try {
      await shareVideoWithPopup({
        videoUrl: video.video_url,
        competitorName: video.competitor_name,
        eventName: video.event_name,
        tournamentName: video.tournament_name,
        totalScore: video.total_score,
        rank: video.placement,
        eventId: video.event_id,
        competitor: {
          id: video.competitor_id,
          tournament_competitor_id: video.competitor_id,
          name: video.competitor_name
        }
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    }
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Download functionality coming soon!');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete', 'Delete functionality coming soon!');
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, styles.redButton]} 
        onPress={onWatch}
      >
        <Text style={styles.buttonText}>Watch Video</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.redButton]} 
        onPress={handleShare}
        disabled={sharing}
      >
        <Text style={[styles.buttonText, sharing && styles.disabledText]}>Share Video</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.redButton]} 
        onPress={handleDownload}
      >
        <Text style={styles.buttonText}>Download</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.deleteButton]} 
        onPress={handleDelete}
      >
        <Text style={styles.deleteButtonText}>Delete Video</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    width: 140,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 40,
  },
  redButton: {
    backgroundColor: '#FF0000',
  },
  deleteButton: {
    backgroundColor: '#333333',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  disabledText: {
    color: '#CCCCCC',
  },
});