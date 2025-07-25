import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import VideoSortDropdown from './VideoSortDropdown';
import VideoFilterDropdowns from './VideoFilterDropdowns';
import { shareVideoFixed } from './ShareVideoHelperFixed';
import { styles } from './ChampionVideosWithSortAndFilterStyles';
import { sortVideos, filterVideos, getEventTypeFromEventName } from '../app/lib/videoSortAndFilter';

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
  event_type?: string;
  created_at?: string;
  judge_scores?: {
    judge_a_score: number;
    judge_b_score: number;
    judge_c_score: number;
  };
}

interface ChampionVideosWithSortAndFilterFixedProps {
  championId: string;
}

export default function ChampionVideosWithSortAndFilterFixed({ championId }: ChampionVideosWithSortAndFilterFixedProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'tournament' | 'event' | 'competitor'>('date');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [championId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // ✅ Step 1: Query tournament_competitors by source_id
      const { data: competitorData, error: competitorError } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('source_id', championId);

      if (competitorError || !competitorData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const competitorIds = competitorData.map(c => c.id);
      console.log('Found tournament competitor IDs for videos:', competitorIds);

      // ✅ Step 2: Query videos using tournament_competitor_ids
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          id,
          video_url,
          uploaded_at,
          created_at,
          event_id,
          competitor_id,
          events!inner(id, name, tournament_id),
          tournaments!inner(id, name, date, class)
        `)
        .in('competitor_id', competitorIds)
        .not('video_url', 'is', null);

      if (videoError || !videoData?.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const { data: tournamentCompetitors } = await supabase
        .from('tournament_competitors')
        .select('id, name')
        .in('id', competitorIds);

      const eventIds = videoData.map(v => v.event_id).filter(Boolean);
      
      // ✅ Step 3: Get event_scores using tournament_competitor_ids
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
          created_at: video.created_at || video.uploaded_at,
          event_id: video.event_id,
          competitor_id: video.competitor_id,
          event_name: video.events?.name || 'Event',
          event_type: getEventTypeFromEventName(video.events?.name || ''),
          tournament_name: video.tournaments?.name || 'Tournament',
          tournament_class: video.tournaments?.class || '',
          tournament_date: video.tournaments?.date,
          competitor_name: competitorInfo?.name || 'Unknown',
          total_score: eventScore?.total_score,
          rank,
          placement: placementText,
          placementText,
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

  const filteredAndSortedVideos = React.useMemo(() => {
    const filtered = filterVideos(videos, eventTypeFilter, 'all');
    return sortVideos(filtered, sortBy);
  }, [videos, sortBy, eventTypeFilter]);

  const handleShare = async (video: Video) => {
    setSharing(video.id);
    
    try {
      if (!video.video_url) {
        Alert.alert('Error', 'No video URL available');
        return;
      }
      
      if (!video.event_id) {
        Alert.alert('Share Error', 'Missing event information.');
        return;
      }
      
      await shareVideoFixed({
        videoUrl: video.video_url,
        competitorName: video.competitor_name || 'Unknown',
        eventName: video.event_name || 'Event',
        tournamentName: video.tournament_name || 'Tournament',
        tournamentClass: video.tournament_class || '',
        judgeScores: video.judge_scores,
        totalScore: video.total_score,
        rank: video.rank,
        placementText: video.placementText,
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

  const renderVideo = ({ item }: { item: Video }) => {
    const canShare = item.event_id && item.competitor_id;
    
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
        <TouchableOpacity
          style={styles.eventTypeButton}
          onPress={() => setShowEventTypeModal(!showEventTypeModal)}
        >
          <Text style={styles.eventTypeText}>Event Type</Text>
          <Ionicons 
            name={showEventTypeModal ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      {showEventTypeModal && (
        <View style={styles.eventTypeDropdown}>
          {[
            { value: 'all', label: 'All' },
            { value: 'traditional_forms', label: 'Traditional Forms' },
            { value: 'creative_forms', label: 'Creative Forms' },
            { value: 'extreme_forms', label: 'Extreme Forms' },
            { value: 'traditional_weapons', label: 'Traditional Weapons' },
            { value: 'creative_weapons', label: 'Creative Weapons' },
            { value: 'extreme_weapons', label: 'Extreme Weapons' },
            { value: 'traditional_sparring', label: 'Traditional Sparring' },
            { value: 'combat_sparring', label: 'Combat Sparring' },
          ].map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.dropdownOption,
                eventTypeFilter === type.value && styles.selectedOption
              ]}
              onPress={() => {
                setEventTypeFilter(type.value);
                setShowEventTypeModal(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                eventTypeFilter === type.value && styles.selectedText
              ]}>
                {type.label}
              </Text>
              {eventTypeFilter === type.value && (
                <Ionicons name="checkmark" size={16} color="#FF0000" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filteredAndSortedVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos found for this champion</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedVideos}
          renderItem={renderVideo}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
      
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