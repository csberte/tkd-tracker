import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import { shareVideoFixed } from './ShareVideoHelperFixed';
import { styles } from './ChampionVideosWithSortAndFilterStyles';

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
  rank?: number;
  points?: number;
  judge_scores?: {
    judge_a_score: number;
    judge_b_score: number;
    judge_c_score: number;
  };
}

interface CompetitorVideosWithSortAndFilterProps {
  competitorId: string;
}

export default function CompetitorVideosWithSortAndFilter({ competitorId }: CompetitorVideosWithSortAndFilterProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [competitorId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .eq('source_id', competitorId);

      if (competitorError || !competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          uploaded_at,
          event_id,
          competitor_id,
          events!inner(id, name, tournament_id),
          tournaments!inner(id, name, date)
        `)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (videoError || !videoData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const eventIds = videoData.map(v => v.event_id).filter(Boolean);
      const { data: eventScores } = await supabase
        .from('event_scores')
        .select('event_id, tournament_competitor_id, final_rank, total_score, judge_a_score, judge_b_score, judge_c_score')
        .in('event_id', eventIds)
        .in('tournament_competitor_id', competitorIds);

      const formattedVideos = (videoData ?? []).map(video => {
        const eventScore = (eventScores ?? []).find(es => 
          es.event_id === video.event_id && 
          es.tournament_competitor_id === video.competitor_id
        );

        const competitorInfo = competitorData.find(tc => tc.id === video.competitor_id);
        
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
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          event_name: video.events?.name || 'Event',
          tournament_name: video.tournaments?.name || 'Tournament',
          tournament_date: video.tournaments?.date,
          competitor_name: competitorInfo?.name || 'Unknown',
          total_score: eventScore?.total_score,
          rank,
          placement: placementText,
          points: eventScore?.total_score,
          judge_scores: eventScore && eventScore.judge_a_score != null && eventScore.judge_b_score != null && eventScore.judge_c_score != null ? {
            judge_a_score: eventScore.judge_a_score,
            judge_b_score: eventScore.judge_b_score,
            judge_c_score: eventScore.judge_c_score
          } : undefined
        };
      });

      setVideos(formattedVideos);
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
      
      await shareVideoFixed({
        videoUrl: video.video_url,
        competitorName: video.competitor_name || 'Unknown',
        eventName: video.event_name || 'Event',
        tournamentName: video.tournament_name || 'Tournament',
        tournamentClass: '',
        judgeScores: video.judge_scores,
        totalScore: video.total_score,
        rank: video.rank,
        placementText: video.placement,
        points: video.points,
        eventId: video.event_id,
        competitor: {
          id: video.competitor_id,
          tournament_competitor_id: video.competitor_id,
          name: video.competitor_name || 'Unknown'
        }
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  const handleDownload = async (video: Video) => {
    setDownloading(video.id);
    Alert.alert('Download', 'Video download functionality coming soon');
    setDownloading(null);
  };

  const handleDelete = async (video: Video) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(video) }
      ]
    );
  };

  const confirmDelete = async (video: Video) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);
      
      if (error) {
        Alert.alert('Error', 'Failed to delete video');
      } else {
        Alert.alert('Success', 'Video deleted successfully');
        loadVideos();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete video');
    }
  };

  const renderVideo = ({ item }: { item: Video }) => {
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
            <Text style={{fontWeight: 'bold'}}>{item.total_score}</Text>
            {item.judge_scores ? ` (${Math.round(item.judge_scores.judge_a_score)} / ${Math.round(item.judge_scores.judge_b_score)} / ${Math.round(item.judge_scores.judge_c_score)})` : ''}
            {item.points ? ` • ${item.points} points` : ''}
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
            <Text style={styles.watchText}>▶️ Watch</Text>
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare(item)}
              disabled={sharing === item.id}
            >
              <Text style={[styles.shareText, sharing === item.id && styles.disabledText]}>
                {sharing === item.id ? 'Sharing...' : '📤 Share'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleDownload(item)}
              disabled={downloading === item.id}
            >
              <Text style={[styles.shareText, downloading === item.id && styles.disabledText]}>
                {downloading === item.id ? 'Downloading...' : '📥 Download'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.shareButton, {backgroundColor: '#DC2626'}]}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.shareText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No videos found for this competitor</Text>
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