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
  tournament_date?: string;
  event_id?: string;
  competitor_id?: string;
  placement?: string;
  judge_scores?: {
    score_a: number;
    score_b: number;
    score_c: number;
  };
}

interface ChampionVideosEnhancedProps {
  championId: string;
}

export default function ChampionVideosEnhanced({ championId }: ChampionVideosEnhancedProps) {
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
      const { data: tournamentCompetitors, error: tcError } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .eq('champion_id', championId);

      if (tcError || !tournamentCompetitors?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const tcIds = tournamentCompetitors.map(tc => tc.id);

      // Query videos table directly for this champion
      const { data: directVideos } = await supabase
        .from('videos')
        .select(`
          id, video_url, uploaded_at, event_id, tournament_competitor_id,
          events!inner(name, event_type),
          tournament_competitors!inner(name, tournament_id,
            tournaments!inner(name, date)
          )
        `)
        .eq('champion_id', championId);

      // Query videos through tournament_competitor_id
      const { data: tcVideos } = await supabase
        .from('videos')
        .select(`
          id, video_url, uploaded_at, event_id, tournament_competitor_id,
          events!inner(name, event_type),
          tournament_competitors!inner(name, tournament_id,
            tournaments!inner(name, date)
          )
        `)
        .in('tournament_competitor_id', tcIds);

      // Combine and deduplicate videos
      const allVideos = [...(directVideos || []), ...(tcVideos || [])];
      const uniqueVideos = allVideos.filter((video, index, self) => 
        index === self.findIndex(v => v.id === video.id)
      );

      if (!uniqueVideos.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get event scores for judge scores and placement
      const eventIds = uniqueVideos.map(v => v.event_id);
      const { data: eventScores } = await supabase
        .from('event_scores')
        .select('event_id, competitor_id, rank, total_score, score_a, score_b, score_c')
        .in('event_id', eventIds)
        .in('competitor_id', tcIds);

      // Format videos with additional data
      const formattedVideos = uniqueVideos.map(video => {
        const eventScore = eventScores?.find(es => 
          es.event_id === video.event_id && 
          es.competitor_id === video.tournament_competitor_id
        );

        const placement = eventScore?.rank ? 
          `${eventScore.rank}${eventScore.rank === 1 ? 'st' : eventScore.rank === 2 ? 'nd' : eventScore.rank === 3 ? 'rd' : 'th'} Place` : 
          'No placement';

        return {
          id: video.id,
          video_url: video.video_url,
          uploaded_at: video.uploaded_at,
          total_score: eventScore?.total_score,
          competitor_name: video.tournament_competitors?.name || 'Unknown',
          event_name: video.events?.name || 'Event',
          tournament_name: video.tournament_competitors?.tournaments?.name || 'Tournament',
          tournament_date: video.tournament_competitors?.tournaments?.date,
          event_id: video.event_id,
          competitor_id: video.tournament_competitor_id,
          placement,
          judge_scores: eventScore ? {
            score_a: eventScore.score_a,
            score_b: eventScore.score_b,
            score_c: eventScore.score_c
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
      
      await shareVideo({
        videoUrl: video.video_url,
        competitorName: video.competitor_name,
        eventName: video.event_name,
        placement: video.placement,
        score: video.total_score ? `Score: ${video.total_score}` : 'No score',
        totalScore: video.total_score,
        scoreA: video.judge_scores?.score_a,
        scoreB: video.judge_scores?.score_b,
        scoreC: video.judge_scores?.score_c
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  const renderVideo = ({ item }: { item: Video }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoInfo}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <Text style={styles.placement}>{item.placement}</Text>
        <Text style={styles.tournamentName}>{item.tournament_name}</Text>
        <Text style={styles.date}>
          {new Date(item.tournament_date || item.uploaded_at).toLocaleDateString()}
        </Text>
        {item.total_score && (
          <Text style={styles.score}>
            Score: {item.total_score}
          </Text>
        )}
        {item.judge_scores && (
          <Text style={styles.judgeScores}>
            B: {Math.round(item.judge_scores.score_b)} • C: {Math.round(item.judge_scores.score_c)} • A: {Math.round(item.judge_scores.score_a)}
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
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => handleShare(item)}
          disabled={sharing === item.id}
        >
          <Ionicons 
            name="share-social-outline" 
            size={16} 
            color={sharing === item.id ? '#999' : '#FFFFFF'} 
          />
          <Text style={[styles.shareText, sharing === item.id && styles.disabledText]}>
            {sharing === item.id ? 'Sharing...' : 'Share'}
          </Text>
        </TouchableOpacity>
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
  judgeScores: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
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
});