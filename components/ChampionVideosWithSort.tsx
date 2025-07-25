import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import { shareVideo } from './ShareVideoHelper';

type SortOption = 'recent' | 'score' | 'points' | 'tournament';

interface Video {
  id: string;
  video_url: string;
  uploaded_at: string;
  total_score?: number;
  event_name?: string;
  tournament_name?: string;
  event_id?: string;
  competitor_id?: string;
  placement?: string;
  rank?: number;
  points?: number;
  judge_scores?: { judge_a_score: number; judge_b_score: number; judge_c_score: number; };
}

interface Props {
  championId: string;
}

export default function ChampionVideosWithSort({ championId }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [championId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data: competitorData } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('champion_id', championId);

      if (!competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);
      const { data: videoData } = await supabase
        .from('videos')
        .select(`id, video_url, uploaded_at, event_id, competitor_id, events!inner(name), tournaments!inner(name)`)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (!videoData?.length) {
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

      const formattedVideos = videoData.map(video => {
        const eventScore = eventScores?.find(es => es.event_id === video.event_id && es.tournament_competitor_id === video.competitor_id);
        const rank = eventScore?.final_rank;
        const placementText = rank ? rank <= 3 ? ['🥇 First Place', '🥈 Second Place', '🥉 Third Place'][rank - 1] : `${rank}th Place` : 'No placement';

        return {
          id: video.id,
          video_url: video.video_url,
          uploaded_at: video.uploaded_at,
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          event_name: video.events?.name || 'Event',
          tournament_name: video.tournaments?.name || 'Tournament',
          total_score: eventScore?.total_score,
          rank,
          placement: placementText,
          points: eventScore?.total_score,
          judge_scores: eventScore && eventScore.judge_a_score != null ? {
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

  const sortedVideos = [...videos].sort((a, b) => {
    switch (sortBy) {
      case 'recent': return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      case 'score': return (b.total_score || 0) - (a.total_score || 0);
      case 'points': return (b.points || 0) - (a.points || 0);
      case 'tournament': return (a.tournament_name || '').localeCompare(b.tournament_name || '');
      default: return 0;
    }
  });

  const getSortLabel = () => {
    switch (sortBy) {
      case 'recent': return '🔴 Most Recent';
      case 'score': return '🥇 Best Score';
      case 'points': return '🏆 Most Points';
      case 'tournament': return '📍 Tournament Name';
      default: return '🔴 Most Recent';
    }
  };

  const handleShare = async (video: Video) => {
    setSharing(video.id);
    try {
      if (!video.video_url || !video.event_id) {
        Alert.alert('Share Error', 'Missing video or event information.');
        return;
      }
      await shareVideo({
        videoUrl: video.video_url,
        competitorName: 'Competitor',
        eventName: video.event_name,
        tournamentName: video.tournament_name,
        tournamentClass: '',
        judgeScores: video.judge_scores,
        totalScore: video.total_score,
        rank: video.rank,
        placementText: video.placement,
        points: video.points,
        eventId: video.event_id,
        competitor: { id: video.competitor_id, tournament_competitor_id: video.competitor_id, name: 'Competitor' }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  if (loading) return <View style={styles.container}><Text style={styles.loadingText}>Loading videos...</Text></View>;
  if (videos.length === 0) return <View style={styles.container}><Text style={styles.emptyText}>No videos found</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.sortContainer}>
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortOptions(!showSortOptions)}>
          <Text style={styles.sortText}>{getSortLabel()}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        {showSortOptions && (
          <View style={styles.sortOptions}>
            {(['recent', 'score', 'points', 'tournament'] as SortOption[]).map(option => (
              <TouchableOpacity key={option} style={[styles.sortOption, sortBy === option && styles.activeSortOption]} onPress={() => { setSortBy(option); setShowSortOptions(false); }}>
                <Text style={[styles.sortOptionText, sortBy === option && styles.activeSortText]}>
                  {option === 'recent' ? '🔴 Most Recent' : option === 'score' ? '🥇 Best Score' : option === 'points' ? '🏆 Most Points' : '📍 Tournament Name'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <FlatList
        data={sortedVideos}
        renderItem={({ item }) => (
          <View style={styles.videoCard}>
            <View style={styles.videoHeader}>
              <Ionicons name="videocam" size={20} color="#DC2626" style={styles.videoIcon} />
              <View style={styles.videoInfo}>
                <Text style={styles.eventName}>{item.event_name}</Text>
                <Text style={styles.placement}>{item.placement}</Text>
              </View>
            </View>
            <Text style={styles.tournamentName}>{item.tournament_name}</Text>
            <Text style={styles.date}>{new Date(item.uploaded_at).toLocaleDateString()}</Text>
            {item.total_score && <Text style={styles.score}>{item.total_score}{item.judge_scores ? ` (${Math.round(item.judge_scores.judge_b_score)}, ${Math.round(item.judge_scores.judge_c_score)}, ${Math.round(item.judge_scores.judge_a_score)})` : ''}</Text>}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.watchButton} onPress={() => { setSelectedVideo(item.video_url); setShowPlayer(true); }}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={styles.watchText}>Watch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareButton, (!item.event_id || !item.competitor_id) && styles.disabledButton]} onPress={() => item.event_id && item.competitor_id && handleShare(item)} disabled={sharing === item.id || !item.event_id || !item.competitor_id}>
                <Ionicons name="share-social-outline" size={16} color={sharing === item.id || !item.event_id || !item.competitor_id ? '#999' : '#FFFFFF'} />
                <Text style={[styles.shareText, (sharing === item.id || !item.event_id || !item.competitor_id) && styles.disabledText]}>
                  {sharing === item.id ? 'Sharing...' : (!item.event_id || !item.competitor_id) ? 'No Data' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
      <VideoPlayerModal visible={showPlayer} videoUrl={selectedVideo || ''} onClose={() => { setShowPlayer(false); setSelectedVideo(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', fontStyle: 'italic', marginTop: 20 },
  sortContainer: { position: 'relative', alignItems: 'flex-end', marginBottom: 12 },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  sortText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  sortOptions: { position: 'absolute', top: 40, right: 0, backgroundColor: '#FFFFFF', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4, zIndex: 1000, minWidth: 160 },
  sortOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  activeSortOption: { backgroundColor: '#FEF2F2' },
  sortOptionText: { fontSize: 14, color: '#374151' },
  activeSortText: { color: '#DC2626', fontWeight: '600' },
  videoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  videoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  videoIcon: { marginRight: 8 },
  videoInfo: { flex: 1 },
  eventName: { fontSize: 16, fontWeight: 'bold', color: '#000000', marginBottom: 2 },
  placement: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  tournamentName: { fontSize: 14, color: '#666666', marginBottom: 2 },
  date: { fontSize: 14, color: '#666666', marginBottom: 8 },
  score: { fontSize: 14, color: '#666666', marginBottom: 12 },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  watchButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1 },
  watchText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  shareButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6B7280', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  shareText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', marginLeft: 4 },
  disabledText: { color: '#999' },
  disabledButton: { backgroundColor: '#CCC' },
});