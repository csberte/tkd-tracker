import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import TieBreakerInfoIcon from './TieBreakerInfoIcon';
import { getPlacementDisplay, calculatePlacement } from './PlacementHelper';
import { shareVideo } from './ShareVideoHelper';

interface Video {
  id: string;
  video_url: string;
  uploaded_at: string;
  total_score?: number;
  competitor_name?: string;
  event_name?: string;
  tournament_name?: string;
  tournament_date?: string;
  judges_scores?: number[];
  event_id?: string;
  competitor_id?: string;
  placement?: string;
  tie_breaker_status?: string;
}

interface CompetitorEventVideosProps {
  competitorId: string;
}

export default function CompetitorEventVideos({ competitorId }: CompetitorEventVideosProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [competitorId]);

  const loadVideos = async () => {
    try {
      const { data: tournamentCompetitors, error: tcError } = await supabase
        .from('tournament_competitors')
        .select('id, name, source_id')
        .eq('source_id', competitorId);

      if (tcError || !tournamentCompetitors?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const tcIds = tournamentCompetitors.map(tc => tc.id);

      const { data: videosData, error } = await supabase
        .from('event_scores')
        .select(`
          id, video_url, total_score, judge_a_score, judge_b_score, judge_c_score,
          updated_at, competitor_id, event_id, tournament_id, has_video, tie_breaker_status
        `)
        .in('competitor_id', tcIds)
        .eq('has_video', true)
        .not('video_url', 'is', null)
        .order('updated_at', { ascending: false });

      if (error || !videosData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const eventIds = [...new Set(videosData.map(v => v.event_id))];
      const tournamentIds = [...new Set(videosData.map(v => v.tournament_id))];

      const [eventsResult, tournamentsResult] = await Promise.all([
        supabase.from('events').select('id, name').in('id', eventIds),
        supabase.from('tournaments').select('id, name, date').in('id', tournamentIds)
      ]);

      const events = eventsResult.data || [];
      const tournaments = tournamentsResult.data || [];

      const formattedVideos = await Promise.all(videosData.map(async (item) => {
        const tc = tournamentCompetitors.find(t => t.id === item.competitor_id);
        const event = events.find(e => e.id === item.event_id);
        const tournament = tournaments.find(t => t.id === item.tournament_id);
        
        const rank = await calculatePlacement(item.event_id, item.competitor_id, supabase);
        const placement = getPlacementDisplay(rank);

        return {
          id: item.id,
          video_url: item.video_url,
          uploaded_at: item.updated_at,
          total_score: item.total_score,
          competitor_name: tc?.name || 'Unknown',
          event_name: event?.name || 'Event',
          tournament_name: tournament?.name || 'Tournament',
          tournament_date: tournament?.date,
          judges_scores: [item.judge_a_score, item.judge_b_score, item.judge_c_score].filter(Boolean),
          event_id: item.event_id,
          competitor_id: item.competitor_id,
          placement,
          tie_breaker_status: item.tie_breaker_status
        };
      }));

      setVideos(formattedVideos);
    } catch (error) {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (video: Video) => {
    setSharing(video.id);
    
    try {
      if (!video.video_url) {
        Alert.alert('Error', 'No video URL available');
        return;
      }
      
      await shareVideo({
        videoUrl: video.video_url,
        competitorName: video.competitor_name,
        eventName: video.event_name,
        placement: video.placement,
        score: video.total_score ? `Score: ${video.total_score}` : 'No score',
        totalScore: video.total_score,
        scoreA: video.judges_scores?.[0],
        scoreB: video.judges_scores?.[1],
        scoreC: video.judges_scores?.[2]
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  const handleDownload = async (video: Video) => {
    setDownloading(video.id);
    
    try {
      if (!video.video_url) {
        Alert.alert('Error', 'No video URL available');
        return;
      }
      
      const timestamp = Date.now();
      const fileName = `tkd-video-${timestamp}.mp4`;
      const localFileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(video.video_url, localFileUri);
      
      const fileInfo = await FileSystem.getInfoAsync(localFileUri);
      
      if (!fileInfo.exists || !fileInfo.size) {
        throw new Error('Downloaded file is empty or does not exist');
      }
      
      Alert.alert('Success', `Video downloaded to device`);
      
    } catch (error) {
      Alert.alert('Error', `Failed to download video`);
    } finally {
      setDownloading(null);
    }
  };

  const renderVideo = ({ item, index }: { item: Video; index: number }) => (
    <View style={[styles.videoCard, index > 0 && styles.videoCardWithDivider]}>
      {item.tie_breaker_status && (
        <View style={styles.tieBreakerIcon}>
          <TieBreakerInfoIcon status={item.tie_breaker_status} />
        </View>
      )}
      <View style={styles.videoInfo}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <Text style={styles.placement}>{item.placement}</Text>
        <Text style={styles.tournamentName}>{item.tournament_name}</Text>
        <Text style={styles.date}>{new Date(item.tournament_date || item.uploaded_at).toLocaleDateString()}</Text>
        {item.total_score && (
          <Text style={styles.score}>
            Score: {item.total_score}
            {item.judges_scores?.length && ` (Judges: ${item.judges_scores.join(', ')})`}
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => {
            setSelectedVideo(item.video_url);
            setShowPlayer(true);
          }}
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.watchText}>Watch</Text>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownload(item)}
            disabled={downloading === item.id}
          >
            <Ionicons 
              name="download-outline" 
              size={16} 
              color={downloading === item.id ? '#999' : '#FFFFFF'} 
            />
            <Text style={[styles.actionText, downloading === item.id && styles.disabledText]}>
              {downloading === item.id ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
            disabled={sharing === item.id}
          >
            <Ionicons 
              name="share-social-outline" 
              size={16} 
              color={sharing === item.id ? '#999' : '#FFFFFF'} 
            />
            <Text style={[styles.actionText, sharing === item.id && styles.disabledText]}>
              {sharing === item.id ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No videos uploaded yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
      <VideoPlayerModal
        visible={showPlayer}
        videoUrl={selectedVideo || ''}
        onClose={() => {
          setShowPlayer(false);
          setSelectedVideo(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  videoCardWithDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  tieBreakerIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  videoInfo: {
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  placement: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  score: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  buttonContainer: {
    alignItems: 'flex-start',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  watchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  disabledText: {
    color: '#999',
  },
});