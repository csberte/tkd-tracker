import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoPlayerModal from './VideoPlayerModal';
import VideoSortDropdown from './VideoSortDropdown';
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

interface CollapsibleVideoSectionProps {
  title: string;
  videos: Video[];
  onShare: (video: Video) => void;
  onWatch: (videoUrl: string) => void;
  sharing: string | null;
}

function CollapsibleVideoSection({ title, videos, onShare, onWatch, sharing }: CollapsibleVideoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (videos.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.eventTypeContainer}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.eventTypeTitle}>
          {title.replace('_', ' ')}: {videos.length} video{videos.length !== 1 ? 's' : ''}
        </Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.videosContainer}>
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onShare={onShare}
              onWatch={onWatch}
              sharing={sharing}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface VideoCardProps {
  video: Video;
  onShare: (video: Video) => void;
  onWatch: (videoUrl: string) => void;
  sharing: string | null;
}

function VideoCard({ video, onShare, onWatch, sharing }: VideoCardProps) {
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
          <View style={styles.placementContainer}>
            <Text style={styles.placement}>
              {getMedalEmoji(video.rank)} {video.tournament_name}
            </Text>
            <Text style={styles.placementText}>
              {getPlacementText(video.rank)}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.date}>
        Class {video.tournament_class} – {video.tournament_class === 'C' ? 'Regional' : video.tournament_class === 'A' ? 'Regional' : 'Nationals'} – {new Date(video.tournament_date || video.uploaded_at).toLocaleDateString()}
      </Text>
      
      {video.total_score && (
        <Text style={styles.score}>
          Score: {video.total_score}
          {video.judge_scores ? ` (${Math.round(video.judge_scores.judge_a_score)},${Math.round(video.judge_scores.judge_b_score)},${Math.round(video.judge_scores.judge_c_score)})` : ''}
        </Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => onWatch(video.video_url)}
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.watchText}>Watch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareButton, !canShare && styles.disabledButton]}
          onPress={() => canShare && onShare(video)}
          disabled={sharing === video.id || !canShare}
        >
          <Ionicons 
            name="share-social-outline" 
            size={16} 
            color={sharing === video.id || !canShare ? '#999' : '#FFFFFF'} 
          />
          <Text style={[styles.shareText, (sharing === video.id || !canShare) && styles.disabledText]}>
            {sharing === video.id ? 'Sharing...' : !canShare ? 'No Data' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ChampionVideosUpdatedProps {
  championId: string;
}

export default function ChampionVideosUpdated({ championId }: ChampionVideosUpdatedProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'tournament' | 'event' | 'competitor'>('date');
  const [showSortModal, setShowSortModal] = useState(false);