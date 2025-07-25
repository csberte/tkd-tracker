import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import VideoSortDropdown from './VideoSortDropdown';
import { shareVideoFixed } from './ShareVideoHelperFixed';
import { styles } from './ChampionVideosWithSortAndFilterStyles';
import { sortVideos, getEventTypeFromEventName } from '../app/lib/videoSortAndFilter';

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
  rank?: number;
  event_type?: string;
  judge_scores?: {
    judge_a_score: number;
    judge_b_score: number;
    judge_c_score: number;
  };
}

function VideoCard({ video, onShare, onWatch, sharing }: {
  video: Video;
  onShare: (video: Video) => void;
  onWatch: (videoUrl: string) => void;
  sharing: string | null;
}) {
  const canShare = video.event_id && video.competitor_id;
  
  const getPlacementText = (rank?: number) => {
    if (!rank) return 'No placement';
    if (rank === 1) return 'First Place';
    if (rank === 2) return 'Second Place';
    if (rank === 3) return 'Third Place';
    return `${rank}th Place`;
  };
  
  const getMedalEmoji = (rank?: number) => {
    if (!rank) return '';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
  return (
    <View style={styles.videoCard}>
      <View style={styles.videoHeader}>
        <View style={styles.videoIcon}>
          <Ionicons name="videocam" size={20} color="#DC2626" />
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.eventName}>{video.event_name}</Text>
          <Text style={styles.placement}>
            {getMedalEmoji(video.rank)} {video.tournament_name}
          </Text>
          <Text style={styles.placementText}>
            {getPlacementText(video.rank)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.date}>
        Class {video.tournament_class} – {video.tournament_class === 'C' ? 'Regional' : 'Nationals'} – {new Date(video.tournament_date || video.uploaded_at).toLocaleDateString()}
      </Text>
      
      {video.total_score && (
        <Text style={styles.score}>
          Score: {video.total_score}
          {video.judge_scores ? ` (${video.judge_scores.judge_a_score},${video.judge_scores.judge_b_score},${video.judge_scores.judge_c_score})` : ''}
        </Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.watchButton} onPress={() => onWatch(video.video_url)}>
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.watchText}>Watch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareButton, !canShare && styles.disabledButton]}
          onPress={() => canShare && onShare(video)}
          disabled={sharing === video.id || !canShare}
        >
          <Ionicons name="share-social-outline" size={16} color={sharing === video.id || !canShare ? '#999' : '#FFFFFF'} />
          <Text style={[styles.shareText, (sharing === video.id || !canShare) && styles.disabledText]}>
            {sharing === video.id ? 'Sharing...' : !canShare ? 'No Data' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CollapsibleVideoSection({ title, videos, onShare, onWatch, sharing }: {
  title: string;
  videos: Video[];
  onShare: (video: Video) => void;
  onWatch: (videoUrl: string) => void;
  sharing: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (videos.length === 0) return null;
  
  return (
    <View style={styles.eventTypeContainer}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.eventTypeTitle}>
          {title.replace('_', ' ')}: {videos.length} video{videos.length !== 1 ? 's' : ''}
        </Text>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.videosContainer}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onShare={onShare} onWatch={onWatch} sharing={sharing} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function ChampionVideosUpdatedComplete({ championId }: { championId: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'tournament' | 'event' | 'competitor'>('date');
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [championId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      const { data: competitorData } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('source_id', championId);

      if (!competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);

      const { data: videoData } = await supabase
        .from('videos')
        .select(`
          id, video_url, uploaded_at, event_id, competitor_id,
          events!inner(id, name), tournaments!inner(id, name, date, class)
        `)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (!videoData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const { data: tournamentCompetitors } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .in('id', competitorIds);

      const eventIds = videoData.map(v => v.event_id).filter(Boolean);
      
      const { data: eventScores } = await supabase
        .from('event_scores')
        .select('event_id, tournament_competitor_id, final_rank, total_score, judge_a_score, judge_b_score, judge_c_score')
        .in('event_id', eventIds)
        .in('tournament_competitor_id', competitorIds);

      const formattedVideos = videoData.map(video => {
        const eventScore = eventScores?.find(es => 
          es.event_id === video.event_id && 
          es.tournament_competitor_id === video.competitor_id
        );

        const competitorInfo = tournamentCompetitors?.find(tc => tc.id === video.competitor_id);
        
        return {
          id: video.id,
          video_url: video.video_url,
          uploaded_at: video.uploaded_at,
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          event_name: video.events?.name || 'Event',
          event_type: getEventTypeFromEventName(video.events?.name || ''),
          tournament_name: video.tournaments?.name || 'Tournament',
          tournament_class: video.tournaments?.class || '',
          tournament_date: video.tournaments?.date,
          competitor_name: competitorInfo?.name || 'Unknown',
          total_score: eventScore?.total_score,
          rank: eventScore?.final_rank,
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

  const handleShare = async (video: Video) => {
    setSharing(video.id);
    try {
      await shareVideoFixed({
        videoUrl: video.video_url,
        competitorName: video.competitor_name || 'Unknown',
        eventName: video.event_name || 'Event',
        tournamentName: video.tournament_name || 'Tournament',
        tournamentClass: video.tournament_class || '',
        judgeScores: video.judge_scores,
        totalScore: video.total_score,
        rank: video.rank,
        eventId: video.event_id,
        competitor: {
          id: video.competitor_id,
          tournament_competitor_id: video.competitor_id,
          name: video.competitor_name || 'Unknown'
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
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
        <Text style={styles.emptyText}>No videos found for this champion</Text>
      </View>
    );
  }

  const sortedVideos = sortVideos(videos, sortBy);
  const eventTypeGroups = sortedVideos.reduce((groups, video) => {
    const eventType = video.event_type || 'Unknown Event';
    if (!groups[eventType]) groups[eventType] = [];
    groups[eventType].push(video);
    return groups;
  }, {} as Record<string, Video[]>);

  return (
    <View style={styles.container}>
      <View style={styles.headerFixed}>
        <VideoSortDropdown
          sortBy={sortBy}
          onSortChange={setSortBy}
          showModal={showSortModal}
          setShowModal={setShowSortModal}
        />
        <Text style={styles.headerTitle}>Videos</Text>
        <View style={styles.placeholder} />
      </View>

      {Object.entries(eventTypeGroups).map(([eventType, eventVideos]) => (
        <CollapsibleVideoSection
          key={eventType}
          title={eventType}
          videos={eventVideos}
          onShare={handleShare}
          onWatch={(url) => { setSelectedVideo(url); setShowPlayer(true); }}
          sharing={sharing}
        />
      ))}
      
      <VideoPlayerModal
        visible={showPlayer}
        videoUrl={selectedVideo || ''}
        onClose={() => { setShowPlayer(false); setSelectedVideo(null); }}
      />
    </View>
  );
}