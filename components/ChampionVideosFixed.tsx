import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import { shareVideo } from './ShareVideoHelper';

interface Video {
  id: string;
  video_url: string;
  uploaded_at: string;
  total_score?: number;
  competitor_name?: string;
  event_name?: string;
  tournament_name?: string;
  tournament_class?: string;
  tournament_date?: string;
  event_id?: string;
  competitor_id?: string;
  placement?: string;
  placementText?: string;
  rank?: number;
  points?: number;
  judge_scores?: {
    judge_a_score: number;
    judge_b_score: number;
    judge_c_score: number;
  };
}

interface ChampionVideosFixedProps {
  championId: string;
}

export default function ChampionVideosFixed({ championId }: ChampionVideosFixedProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [championId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // Get tournament competitors for this champion
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('champion_id', championId);

      if (competitorError || !competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);

      // Query videos with all required data
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          uploaded_at,
          event_id,
          competitor_id,
          events!inner(id, name, event_type, tournament_id),
          tournaments!inner(id, name, date, class)
        `)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (videoError || !videoData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get tournament competitors for names
      const { data: tournamentCompetitors } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .in('id', competitorIds);

      // Get event scores with correct column names
      const eventIds = videoData.map(v => v.event_id).filter(Boolean);
      const { data: eventScores } = await supabase
        .from('event_scores')
        .select('event_id, tournament_competitor_id, final_rank, total_score, judge_a_score, judge_b_score, judge_c_score')
        .in('event_id', eventIds)
        .in('tournament_competitor_id', competitorIds);

      // Format videos with all required fields for sharing
      const formattedVideos = (videoData ?? []).map(video => {
        const eventScore = (eventScores ?? []).find(es => 
          es.event_id === video.event_id && 
          es.tournament_competitor_id === video.competitor_id
        );

        const competitorInfo = (tournamentCompetitors ?? []).find(tc => tc.id === video.competitor_id);
        
        const rank = eventScore?.final_rank;
        const placementText = rank ? 
          rank <= 3 ? 
            ['🥇 First Place', '🥈 Second Place', '🥉 Third Place'][rank - 1] : 
            `${rank}th Place` : 
          'No placement';

        return {
          id: video.id,
          video_url: video.video_url,
          uploaded_at: video.uploaded_at,
          eventId: video.event_id, // Required for sharing
          eventName: video.events?.name || 'Event',
          tournamentName: video.tournaments?.name || 'Tournament',
          tournamentClass: video.tournaments?.class || '',
          competitorName: competitorInfo?.name || 'Unknown',
          videoUrl: video.video_url,
          judgeScores: eventScore && eventScore.judge_a_score != null && eventScore.judge_b_score != null && eventScore.judge_c_score != null ? {
            judge_a_score: eventScore.judge_a_score,
            judge_b_score: eventScore.judge_b_score,
            judge_c_score: eventScore.judge_c_score
          } : undefined,
          totalScore: eventScore?.total_score,
          rank,
          placementText,
          points: eventScore?.total_score,
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          placement: placementText,
          total_score: eventScore?.total_score,
          competitor_name: competitorInfo?.name || 'Unknown',
          event_name: video.events?.name || 'Event',
          tournament_name: video.tournaments?.name || 'Tournament',
          tournament_date: video.tournaments?.date,
          judge_scores: eventScore && eventScore.judge_a_score != null && eventScore.judge_b_score != null && eventScore.judge_c_score != null ? {
            judge_a_score: eventScore.judge_a_score,
            judge_b_score: eventScore.judge_b_score,
            judge_c_score: eventScore.judge_c_score
          } : undefined
        };
      });

      setVideos(formattedVideos.sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      ));
    } catch (error) {
      console.error('Error loading videos:', error);
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
      
      if (!video.eventId) {
        Alert.alert('Share Error', 'Missing event information.');
        return;
      }
      
      await shareVideo({
        videoUrl: video.video_url,
        competitorName: video.competitorName,
        eventName: video.eventName,
        tournamentName: video.tournamentName,
        tournamentClass: video.tournamentClass,
        judgeScores: video.judgeScores,
        totalScore: video.totalScore,
        rank: video.rank,
        placementText: video.placementText,
        points: video.points,
        eventId: video.eventId,
        competitor: {
          id: video.competitor_id,
          tournament_competitor_id: video.competitor_id,
          name: video.competitorName
        }
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  const renderVideo = ({ item }: { item: Video }) => {
    const canShare = item.eventId && item.competitor_id;
    
    return (
      <View style={styles.videoCard}>
        <View style={styles.videoHeader}>
          <View style={styles.videoIcon}>
            <Ionicons name="videocam" size={20} color="#DC2626" />
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.eventName}>{item.event_name}</Text>
            <Text style={styles.placement}>{item.placement}</Text>
          </View>
        </View>
        
        <Text style={styles.tournamentName}>{item.tournament_name}</Text>
        <Text style={styles.date}>
          {new Date(item.tournament_date || item.uploaded_at).toLocaleDateString()}
        </Text>
        
        {item.total_score && (
          <Text style={styles.score}>
            {item.total_score}{item.judge_scores ? ` (${Math.round(item.judge_scores.judge_b_score)}, ${Math.round(item.judge_scores.judge_c_score)}, ${Math.round(item.judge_scores.judge_a_score)})` : ''}
          </Text>
        )}
        
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
          <TouchableOpacity
            style={[styles.shareButton, !canShare && styles.disabledButton]}
            onPress={() => canShare && handleShare(item)}
            disabled={sharing === item.id || !canShare}
          >
            <Ionicons 
              name="share-social-outline" 
              size={16} 
              color={sharing === item.id || !canShare ? '#999' : '#FFFFFF'} 
            />
            <Text style={[styles.shareText, (sharing === item.id || !canShare) && styles.disabledText]}>
              {sharing === item.id ? 'Sharing...' : !canShare ? 'No Data' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text style={styles.emptyText}>No videos found for this champion</Text>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoIcon: {
    marginRight: 8,
  },
  videoInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  placement: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  tournamentName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  score: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  watchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  disabledText: {
    color: '#999',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
});