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
  tournament_competitor_id?: string;
}

interface TraditionalFormsCompetitorCardSeasonalPointsProps {
  competitor: CompetitorWithScore;
  index: number;
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: () => void;
  onTieBreakerSelect: () => void;
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

const getRankEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

export default function TraditionalFormsCompetitorCardSeasonalPoints({ 
  competitor, index, tieBreakerActive, selectedWinners, onPress, onTieBreakerSelect,
  videoStatusMap, eventId, isHighlighted = false, isSelected = false
}: TraditionalFormsCompetitorCardSeasonalPointsProps) {
  if (!competitor || !competitor.name) return null;
  
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoUrl, setVideoUrl] = useState(competitor.video_url);
  const [hasVideo, setHasVideo] = useState(competitor.has_video || false);

  useEffect(() => { checkVideoStatus(); }, [competitor.id, videoStatusMap]);

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

  const safeCompetitor = { ...competitor, totalScore: competitor.totalScore || 0,
    rank: competitor.final_rank || competitor.rank || 0, name: competitor.name || 'Unknown' };

  // Check if competitor has been scored - look for actual score values
  const hasBeenScored = competitor.judge_a_score !== undefined && competitor.judge_b_score !== undefined && 
    competitor.judge_c_score !== undefined && competitor.judge_a_score !== null && 
    competitor.judge_b_score !== null && competitor.judge_c_score !== null && 
    (competitor.judge_a_score > 0 || competitor.judge_b_score > 0 || competitor.judge_c_score > 0);

  console.log(`[TraditionalFormsCompetitorCardSeasonalPoints] ${competitor.name} - hasBeenScored:`, hasBeenScored);
  console.log(`[TraditionalFormsCompetitorCardSeasonalPoints] ${competitor.name} - scores:`, {
    a: competitor.judge_a_score,
    b: competitor.judge_b_score,
    c: competitor.judge_c_score,
    total: competitor.totalScore,
    points: competitor.points
  });

  const displayRank = competitor.final_rank || competitor.rank || 0;
  const rankEmoji = competitor.medal || getRankEmoji(displayRank);
  const iconColor = hasVideo ? '#D32F2F' : '#BDBDBD';
  const seasonalPoints = competitor.points || 0; // Use seasonal points from points_earned field
  const isPodiumFinisher = displayRank <= 3 && displayRank > 0;
  const isRankFourOrBelow = displayRank >= 4;
  const initials = getInitials(safeCompetitor.name);
  const avatarBackgroundColor = getColorFromName(safeCompetitor.name);
  const textColor = getTextColor(avatarBackgroundColor);

  const getCardBackgroundColor = () => {
    if (isHighlighted && tieBreakerActive) return isSelected ? '#FFCDD2' : '#FFF9C4';
    return '#fff';
  };

  const getBorderStyle = () => {
    if (isHighlighted && tieBreakerActive) return { borderColor: isSelected ? '#F44336' : '#FFC107', borderWidth: 2 };
    return {};
  };

  const handleCardPress = () => {
    console.log('🎯 TraditionalFormsCompetitorCardSeasonalPoints - handleCardPress called');
    console.log('🎯 Competitor:', competitor.name);
    console.log('🎯 Tournament Competitor ID:', competitor.tournament_competitor_id || competitor.id);
    console.log('🎯 TieBreakerActive:', tieBreakerActive);
    console.log('🎯 IsHighlighted:', isHighlighted);
    
    if (tieBreakerActive && isHighlighted) {
      console.log('🎯 Calling onTieBreakerSelect');
      onTieBreakerSelect();
    } else if (!tieBreakerActive) {
      console.log('🎯 Calling onPress (openScoreModal)');
      onPress();
    }
  };

  const getOpacity = () => tieBreakerActive && !isHighlighted ? 0.5 : 1;

  return (
    <View style={{ opacity: getOpacity(), marginHorizontal: 16 }}>
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: getCardBackgroundColor() }, getBorderStyle(),
          isRankFourOrBelow && styles.compactCard]} 
        onPress={handleCardPress} 
        activeOpacity={0.7}
        disabled={tieBreakerActive && !isHighlighted}
      >
        {competitor.tie_breaker_status && (
          <View style={styles.tieBreakerIconContainer}>
            <TieBreakerInfoIcon status={competitor.tie_breaker_status} />
          </View>
        )}
        <View style={styles.rankSection}>
          {rankEmoji && hasBeenScored ? (
            <View style={styles.medalContainer}>
              <Text style={[styles.rankEmoji, isPodiumFinisher && styles.podiumEmoji]}>{rankEmoji}</Text>
            </View>
          ) : null}
          <View style={styles.rankRow}>
            {hasBeenScored && displayRank > 0 ? (
              <Text style={[styles.rankText, isPodiumFinisher && styles.podiumRankText]}>#{displayRank}</Text>
            ) : (
              <Text style={[styles.rankText, { color: '#999', fontStyle: 'italic' }]}>—</Text>
            )}
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
                  <Text style={styles.stackedLabel}>Judge</Text>
                  <Text style={styles.stackedLabel}>Score</Text>
                  {hasBeenScored ? (
                    <Text style={styles.columnValue}>{safeCompetitor.totalScore.toFixed(1)}</Text>
                  ) : (
                    <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.medalistScoreRow}>
                <View style={styles.pointsColumn}>
                  <Text style={styles.stackedLabel}>Points</Text>
                  <Text style={styles.stackedLabel}>Earned</Text>
                  {hasBeenScored ? (
                    <Text style={[styles.columnValue, { color: '#D32F2F', fontWeight: 'bold' }]}>{seasonalPoints}</Text>
                  ) : (
                    <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                  )}
                </View>
                <View style={styles.scoreColumn}>
                  <Text style={styles.stackedLabel}>Judge</Text>
                  <Text style={styles.stackedLabel}>Score</Text>
                  {hasBeenScored ? (
                    <Text style={styles.columnValue}>{safeCompetitor.totalScore.toFixed(1)}</Text>
                  ) : (
                    <Text style={[styles.columnValue, { color: '#999', fontStyle: 'italic' }]}>—</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actionSection}>
          <Ionicons name="videocam" size={20} color={iconColor} />
        </View>
      </TouchableOpacity>
      <VideoPlayerModal visible={showVideoPlayer} videoUrl={videoUrl || ''} onClose={() => setShowVideoPlayer(false)} />
    </View>
  );
}