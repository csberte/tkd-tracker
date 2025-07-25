import React, { useEffect, useRef } from 'react';
import { Animated, Platform, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface VideoData {
  id: string;
  competitor_name: string;
  event_name: string;
  tournament_name: string;
  tournament_date: string;
  tournament_location: string;
  placement: number;
  total_score: number;
  judge_a_score: number;
  judge_b_score: number;
  judge_c_score: number;
  video_url?: string;
}

interface VideoCardProps {
  video: VideoData;
  index: number;
  showCompetitorName: boolean;
  onVideoPress: () => void;
}

const getPlacementEmoji = (placement: number): string => {
  switch (placement) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '🏅';
  }
};

const getPlacementText = (placement: number): string => {
  if (placement === 1) return '1st Place';
  if (placement === 2) return '2nd Place';
  if (placement === 3) return '3rd Place';
  return `${placement}th Place`;
};

export default function VideoCard({ video, index, showCompetitorName, onVideoPress }: VideoCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const nativeDriverAvailable = Platform.OS !== 'web' && Animated?.__isNative !== false;
    const delay = index * 50;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: nativeDriverAvailable,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: nativeDriverAvailable,
      })
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handleDownload = async () => {
    if (!video.video_url) return;
    
    try {
      const filename = `${video.competitor_name}_${video.event_name}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const { uri } = await FileSystem.downloadAsync(video.video_url, fileUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  };

  const handleShare = async () => {
    if (!video.video_url) return;
    
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(video.video_url);
      }
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const judgeScores = `(${Math.round(video.judge_b_score)}, ${Math.round(video.judge_c_score)}, ${Math.round(video.judge_a_score)})`;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.placementSection}>
            <Text style={styles.placementEmoji}>{getPlacementEmoji(video.placement)}</Text>
            <Text style={styles.placementText}>{getPlacementText(video.placement)}</Text>
          </View>
          
          <TouchableOpacity
            onPress={video.video_url ? onVideoPress : undefined}
            style={styles.videoButton}
            activeOpacity={0.7}
            disabled={!video.video_url}
          >
            <Ionicons
              name="videocam"
              size={24}
              color={video.video_url ? '#FF0000' : '#666666'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.eventName}>🏆 {video.event_name}</Text>
          {showCompetitorName && (
            <Text style={styles.competitorName}>{video.competitor_name}</Text>
          )}
          <Text style={styles.tournamentInfo}>
            📅 {video.tournament_name} — {new Date(video.tournament_date).toLocaleDateString()}
          </Text>
          <Text style={styles.locationInfo}>
            📍 Location: {video.tournament_location || 'TBD'}
          </Text>
          <Text style={styles.scoreInfo}>
            ⭐ Score: {Math.round(video.total_score)} {judgeScores}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="download" size={20} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="share" size={20} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  placementSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placementEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  placementText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  videoButton: {
    padding: 8,
  },
  infoSection: {
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  competitorName: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  tournamentInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  locationInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  scoreInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});