import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/AuthProvider';
import { getUserVideosEnhanced } from '../lib/videoHelpersEnhanced';
import AnimatedTabScreen from '../../components/AnimatedTabScreen';
import VideoPlayerModal from '../../components/VideoPlayerModal';
import VideoSortDropdown from '../../components/VideoSortDropdown';
import VideoFilterDropdownsFixed from '../../components/VideoFilterDropdownsFixed';
import VideoActionButtonsFixed from '../../components/VideoActionButtonsFixed';
import { 
  VideoData, 
  Competitor, 
  SortOption, 
  sortVideos, 
  filterVideos, 
  getUniqueCompetitors, 
  getEventTypeFromEventName 
} from '../lib/videoSortAndFilterFixed';

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

export default function VideosTabFixed() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [competitorFilter, setCompetitorFilter] = useState('all');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const videoData = await getUserVideosEnhanced(user.id);
      
      const formattedVideos: VideoData[] = videoData.map(video => ({
        id: video.id,
        competitor_name: video.competitor_name || 'Unknown',
        event_name: video.events?.name || 'Unknown Event',
        event_type: getEventTypeFromEventName(video.events?.name || ''),
        tournament_name: video.tournaments?.name || 'Unknown Tournament',
        tournament_date: video.tournaments?.date || video.created_at,
        tournament_location: video.tournaments?.location || 'TBD',
        placement: video.placement || 0,
        total_score: video.total_score || 0,
        video_url: video.video_url,
        created_at: video.created_at,
        competitor_id: video.competitor_id || video.id,
        event_id: video.event_id
      })).filter(video => video.video_url);

      setVideos(formattedVideos);
      setCompetitors(getUniqueCompetitors(formattedVideos));
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedVideos = React.useMemo(() => {
    const filtered = filterVideos(videos, eventTypeFilter, competitorFilter);
    return sortVideos(filtered, sortBy);
  }, [videos, sortBy, eventTypeFilter, competitorFilter]);

  return (
    <AnimatedTabScreen direction="left">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Videos</Text>
          <VideoSortDropdown
            sortBy={sortBy}
            onSortChange={setSortBy}
            showModal={showSortModal}
            setShowModal={setShowSortModal}
          />
        </View>

        <VideoFilterDropdownsFixed
          eventTypeFilter={eventTypeFilter}
          competitorFilter={competitorFilter}
          competitors={competitors}
          onEventTypeChange={setEventTypeFilter}
          onCompetitorChange={setCompetitorFilter}
          showEventTypeModal={showEventTypeModal}
          showCompetitorModal={showCompetitorModal}
          setShowEventTypeModal={setShowEventTypeModal}
          setShowCompetitorModal={setShowCompetitorModal}
        />

        <ScrollView style={styles.videoList}>
          {loading ? (
            <Text style={styles.loadingText}>Loading videos...</Text>
          ) : filteredAndSortedVideos.length > 0 ? (
            filteredAndSortedVideos.map((video) => (
              <View key={video.id} style={styles.videoCard}>
                <View style={styles.cardContent}>
                  <View style={styles.leftContent}>
                    <View style={styles.headerRow}>
                      <View style={styles.placementSection}>
                        <Text style={styles.placementEmoji}>{getPlacementEmoji(video.placement)}</Text>
                        <Text style={styles.placementText}>{getPlacementText(video.placement)}</Text>
                      </View>
                    </View>

                    <View style={styles.infoSection}>
                      <Text style={styles.eventName}>🏆 {video.event_name}</Text>
                      <Text style={styles.competitorName}>{video.competitor_name}</Text>
                      <Text style={styles.tournamentInfo}>
                        📅 {video.tournament_name} — {new Date(video.tournament_date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.locationInfo}>
                        📍 Location: {video.tournament_location}
                      </Text>
                      <Text style={styles.scoreInfo}>
                        ⭐ Score: {Math.round(video.total_score)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rightContent}>
                    <VideoActionButtonsFixed
                      video={video}
                      onWatch={() => setSelectedVideo(video.video_url)}
                      sharing={sharing === video.id}
                    />
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noVideosText}>
              {videos.length === 0 ? 'No videos uploaded yet' : 'No videos match current filters'}
            </Text>
          )}
        </ScrollView>

        <VideoPlayerModal
          visible={!!selectedVideo}
          videoUrl={selectedVideo || ''}
          onClose={() => setSelectedVideo(null)}
        />
      </View>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  videoList: { flex: 1 },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 6,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerRow: {
    marginBottom: 12,
  },
  placementSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placementEmoji: { fontSize: 20, marginRight: 8 },
  placementText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  infoSection: {},
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
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 50,
  },
  noVideosText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 50,
  },
});