import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayerModal from './VideoPlayerModal';
import TieBreakerInfoIcon from './TieBreakerInfoIcon';
import { styles } from './TraditionalFormsCompetitorCardStyles';
import { supabase } from '../app/lib/supabase';

interface CompetitorWithScore {
  id: string;
  name: string;
  avatar?: string;
  totalScore: number;
  rank: number;
  final_rank?: number;
  placement?: string;
  isTied?: boolean;
  tieBreakerLabel?: string;
  tie_breaker_status?: string;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
  has_video?: boolean;
  video_url?: string;
  medal?: string;
  points?: number;
  points_earned?: number;
  tournament_competitor_id?: string;
  participant_id?: string;
  total_score?: number;
}

interface TraditionalFormsCompetitorCardProps {
  competitor: CompetitorWithScore;
  index: number;
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: () => void;
  handleTiebreakerSelect: (competitor: CompetitorWithScore) => void;
  openEditModal?: (competitor: CompetitorWithScore) => void;
  videoStatusMap: Record<string, boolean>;
  eventId: string;
  isHighlighted?: boolean;
  isSelected?: boolean;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = ['#D32F2F', '#000000', '#757575', '#FFFFFF'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getTextColor(backgroundColor: string): string {
  return backgroundColor === '#FFFFFF' || backgroundColor === '#757575' ? '#000000' : '#FFFFFF';
}

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#007AFF';
    case 3: return '#007AFF';
    default: return '#666666';
  }
};

const getRankEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

export default function TraditionalFormsCompetitorCardFixed({ 
  competitor, index, tieBreakerActive, selectedWinners, onPress,
  handleTiebreakerSelect, openEditModal,
  videoStatusMap, eventId, isHighlighted = false, isSelected = false
}: TraditionalFormsCompetitorCardProps) {
  if (!competitor || !competitor.name) return null;
  
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoUrl, setVideoUrl] = useState(competitor.video_url);
  const [hasVideo, setHasVideo] = useState(competitor.has_video || false);
  const [scoreData, setScoreData] = useState({
    totalScore: competitor.totalScore || competitor.total_score || 0,
    pointsEarned: competitor.points_earned || competitor.points || 0,
    rank: competitor.final_rank || competitor.rank || 0,
    medal: competitor.medal || ''
  });

  useEffect(() => { 
    checkVideoStatus();
    fetchLatestScoreData();
  }, [competitor.id, videoStatusMap, eventId]);

  const fetchLatestScoreData = async () => {
    try {
      const competitorId = competitor.tournament_competitor_id || competitor.id;
      const { data, error } = await supabase
        .from('event_scores')
        .select('total_score, points_earned, points, rank, medal')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .single();
      
      if (data && !error) {
        setScoreData({
          totalScore: data.total_score || 0,
          pointsEarned: data.points_earned || data.points || 0,
          rank: data.rank || 0,
          medal: data.medal || getRankEmoji(data.rank || 0)
        });
      }
    } catch (error) {
      console.error('Error fetching score data:', error);
    }
  };

  const checkVideoStatus = async () => {
    try {
      const { data, error } = await supabase.from('event_scores')
        .select('has_video, video_url').eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.tournament_competitor_id || competitor.id).single();
      if (data && !error) {
        setHasVideo(data.has_video || false); setVideoUrl(data.video_url);
      } else {
        const statusFromMap = videoStatusMap[competitor.id] || videoStatusMap[competitor.tournament_competitor_id || ''];
        if (statusFromMap !== undefined) setHasVideo(statusFromMap);
      }
    } catch (error) {
      const statusFromMap = videoStatusMap[competitor.id] || videoStatusMap[competitor.tournament_competitor_id || ''];
      if (statusFromMap !== undefined) setHasVideo(statusFromMap);
    }
  };

  const safeCompetitor = { ...competitor, name: competitor.name || 'Unknown' };

  const totalScore = competitor.total_score || competitor.totalScore || scoreData.totalScore;
  const hasBeenScored = totalScore !== undefined && totalScore !== null && totalScore > 0;

  if (!hasBeenScored) {
    return null;
  }

  const displayRank = scoreData.rank;
  const rankEmoji = scoreData.medal || getRankEmoji(displayRank);
  const rankColor = getRankColor(displayRank);
  const displayPoints = scoreData.pointsEarned;
  const displayScore = scoreData.totalScore;
  const isPodiumFinisher = displayRank <= 3; 
  const isRankFourOrBelow = displayRank >= 4;
  const initials = getInitials(safeCompetitor.name);
  const avatarBackgroundColor = getColorFromName(safeCompetitor.name);
  const textColor = getTextColor(avatarBackgroundColor);

  // FIXED: Proper press handler that routes correctly
  const handlePress = () => {
    console.log('[CardFixed] Tapped:', competitor.name, 'tieBreakerActive:', tieBreakerActive, 'isHighlighted:', isHighlighted);
    if (tieBreakerActive && isHighlighted) {
      console.log('[CardFixed] Calling handleTiebreakerSelect');
      handleTiebreakerSelect(competitor);
    } else if (!tieBreakerActive) {
      console.log('[CardFixed] Calling openEditModal or onPress');
      if (openEditModal) {
        openEditModal(competitor);
      } else {
        onPress();
      }
    }
  };

  const getCardBackgroundColor = () => {
    if (isHighlighted && tieBreakerActive) return isSelected ? '#FFCDD2' : '#FFF9C4';
    return '#fff';
  };

  const getBorderStyle = () => {
    if (isHighlighted && tieBreakerActive) return { borderColor: isSelected ? '#F44336' : '#FFC107', borderWidth: 2 };
    return {};
  };

  const getOpacity = () => tieBreakerActive && !isHighlighted ? 0.5 : 1;

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: getCardBackgroundColor(), opacity: getOpacity() }, getBorderStyle(),
        isRankFourOrBelow && styles.compactCard]} 
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={tieBreakerActive && !isHighlighted}
    >
      {competitor.tie_breaker_status && (
        <View style={styles.tieBreakerIconContainer}>
          <TieBreakerInfoIcon status={competitor.tie_breaker_status} />
        </View>
      )}
      <View style={styles.rankSection}>
        {rankEmoji ? (
          <View style={styles.medalContainer}>
            <Text style={[styles.rankEmoji, isPodiumFinisher && styles.podiumEmoji]}>{rankEmoji}</Text>
          </View>
        ) : null}
        <View style={styles.rankRow}>
          <Text style={[styles.rankText, { color: rankColor }, isPodiumFinisher && styles.podiumRankText]}>#{displayRank}</Text>
        </View>
      </View>
      <View style={styles.avatarSection}>
        {safeCompetitor.avatar ? (
          <Image source={{ uri: safeCompetitor.avatar }} style={styles.podiumAvatar} />
        ) : (
          <View style={[styles.podiumAvatar, { backgroundColor: avatarBackgroundColor }]}>
            <Text style={[styles.initialsText, { color: textColor }]}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.name} numberOfLines={1}>{safeCompetitor.name}</Text>
        {tieBreakerActive && isHighlighted && (
          <Text style={styles.tieBreakerStatus}>
            {isSelected ? '✓ Selected Winner' : 'Tap to Select'}
          </Text>
        )}
        <View style={[styles.scorePointsBlock, isRankFourOrBelow && styles.compactScoreBlock]}>
          {isRankFourOrBelow ? (
            <View style={styles.rightAlignedScoreRow}>
              <View style={styles.scoreColumn}>
                <Text style={styles.stackedLabel}>Judge's</Text>
                <Text style={styles.stackedLabel}>Score</Text>
                {hasBeenScored || displayScore > 0 ? (
                  <Text style={[styles.columnValue, { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' }]}>{displayScore}</Text>
                ) : (
                  <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.medalistScoreRow}>
              <View style={styles.pointsColumn}>
                <Text style={[styles.stackedLabel, { color: '#666' }]}>Points</Text>
                <Text style={[styles.stackedLabel, { color: '#666' }]}>Earned</Text>
                {hasBeenScored || displayPoints > 0 ? (
                  <Text style={[styles.columnValue, { color: '#666' }]}>{displayPoints}</Text>
                ) : (
                  <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                )}
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.stackedLabel}>Judge's</Text>
                <Text style={styles.stackedLabel}>Score</Text>
                {hasBeenScored || displayScore > 0 ? (
                  <Text style={[styles.columnValue, { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' }]}>{displayScore}</Text>
                ) : (
                  <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
      <View style={styles.actionSection}>
        <Ionicons 
          name="videocam" 
          size={20} 
          color={hasVideo ? 'red' : 'gray'} 
        />
      </View>
      <VideoPlayerModal visible={showVideoPlayer} videoUrl={videoUrl || ''} onClose={() => setShowVideoPlayer(false)} />
    </TouchableOpacity>
  );
}