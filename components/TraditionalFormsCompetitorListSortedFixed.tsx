import React from 'react';
import { View, Text } from 'react-native';
import TraditionalFormsCompetitorCard from './TraditionalFormsCompetitorCard';
import { getAllTieGroupsInTop3 } from '../app/lib/tieBreakerHelpersFixed';

interface Props {
  competitors: any[];
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: (competitor: any) => void;
  handleTiebreakerSelect: (competitor: any) => void;
  eventId: string;
  activeTieGroupIndex?: number;
}

export default function TraditionalFormsCompetitorListSortedFixed({
  competitors,
  tieBreakerActive,
  selectedWinners,
  onPress,
  handleTiebreakerSelect,
  eventId,
  activeTieGroupIndex
}: Props) {
  
  if (!competitors || !Array.isArray(competitors)) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>No competitors found</Text>
      </View>
    );
  }

  if (competitors.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>No competitors added yet</Text>
      </View>
    );
  }

  const sortedCompetitors = [...competitors].sort((a, b) => {
    const rankA = a.rank || 999;
    const rankB = b.rank || 999;
    return rankA - rankB;
  });

  const tieGroups = getAllTieGroupsInTop3(sortedCompetitors);
  const activeTieGroup = tieGroups[activeTieGroupIndex || 0] || [];
  
  const highlightedIds = new Set(
    activeTieGroup.map(c => c.tournament_competitor_id || c.id)
  );

  return (
    <View>
      {sortedCompetitors.map((competitor, index) => {
        const competitorData = competitor.tournament_competitor || competitor;
        const competitorId = competitor.tournament_competitor_id || competitorData.id;
        
        const competitorWithScore = {
          ...competitorData,
          id: competitorId,
          tournament_competitor_id: competitorId,
          totalScore: competitor.totalScore || 0,
          total_score: competitor.total_score || competitor.totalScore || 0,
          rank: competitor.rank || 0,
          medal: competitor.medal,
          final_rank_label: competitor.final_rank_label,
          judge_a_score: competitor.judge_a_score,
          judge_b_score: competitor.judge_b_score,
          judge_c_score: competitor.judge_c_score,
          has_video: competitor.has_video || false,
          video_url: competitor.video_url,
          points: competitor.points || 0,
          points_earned: competitor.points_earned || competitor.points || 0,
          tie_breaker_status: competitor.tie_breaker_status,
          isTied: competitor.isTied || false,
          participant_id: competitor.id
        };

        const isHighlighted = tieBreakerActive && highlightedIds.has(competitorId);
        const isSelected = selectedWinners.includes(competitorId);

        return (
          <TraditionalFormsCompetitorCard
            key={`competitor-${competitorId}-${index}`}
            competitor={competitorWithScore}
            index={index}
            tieBreakerActive={tieBreakerActive}
            selectedWinners={selectedWinners}
            onPress={() => onPress(competitorWithScore)}
            handleTiebreakerSelect={handleTiebreakerSelect}
            videoStatusMap={{}}
            eventId={eventId}
            isHighlighted={isHighlighted}
            isSelected={isSelected}
          />
        );
      })}
    </View>
  );
}