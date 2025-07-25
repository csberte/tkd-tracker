import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompetitorWithScore } from '../app/lib/eventHelpers';
import VideoManagementSectionUltimate from './VideoManagementSectionUltimate';
import { supabase } from '../app/lib/supabase';

interface TraditionalFormsCompetitorCardFinalProps {
  competitor: CompetitorWithScore;
  index: number;
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: () => void;
  onTieBreakerSelect: (competitorId: string) => void;
  videoStatusMap: { [key: string]: boolean };
  eventId: string;
  isHighlighted?: boolean;
  isSelected?: boolean;
}

export default function TraditionalFormsCompetitorCardFinal({
  competitor,
  index,
  tieBreakerActive,
  selectedWinners,
  onPress,
  onTieBreakerSelect,
  videoStatusMap,
  eventId,
  isHighlighted = false,
  isSelected = false
}: TraditionalFormsCompetitorCardFinalProps) {
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    loadScoreId();
  }, [competitor.id, eventId]);

  const loadScoreId = async () => {
    try {
      const competitorId = competitor.tournament_competitor_id || competitor.id;
      
      const { data, error } = await supabase
        .from('event_scores')
        .select('id, has_video')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .single();
      
      if (data) {
        setScoreId(data.id);
        setHasVideo(data.has_video || false);
      }
    } catch (error) {
      console.error('Error loading score ID:', error);
    }
  };

  const hasScore = competitor.judge_a_score !== undefined && 
                   competitor.judge_b_score !== undefined && 
                   competitor.judge_c_score !== undefined;

  const totalScore = hasScore ? 
    (competitor.judge_a_score || 0) + (competitor.judge_b_score || 0) + (competitor.judge_c_score || 0) : 0;

  const getRankDisplay = () => {
    if (!hasScore) return '';
    
    const rank = competitor.rank || competitor.final_rank;
    if (!rank) return '';
    
    const rankNum = typeof rank === 'string' ? parseInt(rank) : rank;
    if (isNaN(rankNum)) return '';
    
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = rankNum % 100;
    return rankNum + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  const getMedalColor = () => {
    const rank = competitor.rank || competitor.final_rank;
    const rankNum = typeof rank === 'string' ? parseInt(rank) : rank;
    
    if (rankNum === 1) return '#FFD700'; // Gold
    if (rankNum === 2) return '#C0C0C0'; // Silver
    if (rankNum === 3) return '#CD7F32'; // Bronze
    return 'transparent';
  };

  const cardStyle = [
    styles.card,
    isHighlighted && styles.highlightedCard,
    isSelected && styles.selectedCard
  ];

  return (
    <View style={cardStyle}>
      <TouchableOpacity style={styles.cardContent} onPress={onPress}>
        <View style={styles.leftSection}>
          <View style={styles.rankContainer}>
            <View style={[styles.medalBadge, { backgroundColor: getMedalColor() }]}>
              <Text style={styles.rankText}>{getRankDisplay()}</Text>
            </View>
          </View>
          
          <View style={styles.competitorInfo}>
            <Text style={styles.competitorName}>{competitor.name}</Text>
            
            {hasScore ? (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Scores:</Text>
                <View style={styles.judgeScores}>
                  <Text style={styles.judgeScore}>A: {competitor.judge_a_score || 0}</Text>
                  <Text style={styles.judgeScore}>B: {competitor.judge_b_score || 0}</Text>
                  <Text style={styles.judgeScore}>C: {competitor.judge_c_score || 0}</Text>
                </View>
                <Text style={styles.totalScore}>Total: {totalScore}</Text>
              </View>
            ) : (
              <Text style={styles.noScoreText}>Tap to add score</Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          {hasVideo && (
            <View style={styles.videoIndicator}>
              <Ionicons name="videocam" size={16} color="#D32F2F" />
            </View>
          )}
          
          {tieBreakerActive && (
            <TouchableOpacity
              style={[
                styles.tieBreakerButton,
                selectedWinners.includes(competitor.id) && styles.tieBreakerButtonSelected
              ]}
              onPress={() => onTieBreakerSelect(competitor.id)}
            >
              <Text style={[
                styles.tieBreakerButtonText,
                selectedWinners.includes(competitor.id) && styles.tieBreakerButtonTextSelected
              ]}>
                {selectedWinners.includes(competitor.id) ? 'Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Ionicons name="chevron-forward" size={20} color="#666666" />
        </View>
      </TouchableOpacity>
      
      {hasScore && scoreId && (
        <VideoManagementSectionUltimate
          competitorId={competitor.tournament_competitor_id || competitor.id}
          eventId={eventId}
          tournamentId={competitor.tournament_id || ''}
          scoreId={scoreId}
          competitorName={competitor.name}
          eventName="Traditional Forms"
          totalScore={totalScore}
          rank={competitor.rank || competitor.final_rank}
          onVideoStatusChange={(status) => setHasVideo(status)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  selectedCard: {
    backgroundColor: '#FFF5F5',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  medalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  competitorInfo: {
    flex: 1,
  },
  competitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  scoreContainer: {
    gap: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  judgeScores: {
    flexDirection: 'row',
    gap: 8,
  },
  judgeScore: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  totalScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  noScoreText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: 'center',
    gap: 8,
  },
  videoIndicator: {
    padding: 4,
  },
  tieBreakerButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tieBreakerButtonSelected: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  tieBreakerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  tieBreakerButtonTextSelected: {
    color: '#FFFFFF',
  },
});