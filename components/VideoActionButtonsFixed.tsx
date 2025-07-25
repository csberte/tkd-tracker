import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoData } from '../app/lib/videoSortAndFilter';
import { shareVideoWithPopup } from './ShareVideoHelperWithPopup';

interface VideoActionButtonsFixedProps {
  video: VideoData;
  onWatch: () => void;
  sharing: boolean;
}

export default function VideoActionButtonsFixed({ 
  video, 
  onWatch, 
  sharing 
}: VideoActionButtonsFixedProps) {
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
        style={[styles.button, styles.watchButton]} 
        onPress={onWatch}
      >
        <Ionicons name="play-circle" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleShare}
        disabled={sharing}
      >
        <Ionicons 
          name="share-outline" 
          size={20} 
          color={sharing ? "#999" : "#666"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleDownload}
      >
        <Ionicons name="download-outline" size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleDelete}
      >
        <Ionicons name="trash-outline" size={20} color="#FF0000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  watchButton: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
});