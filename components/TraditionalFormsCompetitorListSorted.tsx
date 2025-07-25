import React from 'react';
import { View, Text } from 'react-native';
import TraditionalFormsCompetitorCard from './TraditionalFormsCompetitorCard';
import { getAllTieGroupsInTop3 } from '../app/lib/tieBreakerHelpersFixed';

interface Props {
  competitors: any[];
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: (competitor: any) => void;
  eventId: string;
  activeTieGroupIndex?: number;
  tournamentClass?: string;
}

export default function TraditionalFormsCompetitorListSorted({
  competitors,
  tieBreakerActive,
  selectedWinners,
  onPress,
  eventId,
  activeTieGroupIndex,
  tournamentClass = 'A'
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

  // CRITICAL FIX: Do NOT re-sort the competitors array!
  // The getAllParticipantsInEvent() function already returns properly sorted data
  // by final_rank, so we should preserve that order
  console.log('[TraditionalFormsCompetitorListSorted] Received competitors order:', 
    competitors.map(c => `${c.name}: final_rank=${c.final_rank}, rank=${c.rank}`));
  
  // Use the competitors array as-is, without any sorting
  const displayCompetitors = competitors;

  const tieGroups = getAllTieGroupsInTop3(displayCompetitors);
  const activeTieGroup = tieGroups[activeTieGroupIndex || 0] || [];
  const highlightedIds = new Set(
    activeTieGroup.map(c => c.tournament_competitor_id || c.id)
  );

  const numCompetitors = displayCompetitors.length;

  return (
    <View>
      {displayCompetitors.map((competitor, index) => {
        const competitorData = competitor.tournament_competitor || competitor;
        const competitorId = competitor.tournament_competitor_id || competitorData.id;
        
        const competitorWithScore = {
          ...competitorData,
          id: competitorId,
          tournament_competitor_id: competitorId,
          totalScore: competitor.totalScore || 0,
          total_score: competitor.total_score || competitor.totalScore || 0,
          rank: competitor.final_rank || competitor.rank || 0,
          final_rank: competitor.final_rank || competitor.rank || 0,
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
            handleTiebreakerSelect={() => onPress(competitorWithScore)}
            videoStatusMap={{}}
            eventId={eventId}
            isHighlighted={isHighlighted}
            isSelected={isSelected}
            tournamentClass={tournamentClass}
            numCompetitors={numCompetitors}
          />
        );
      })}
    </View>
  );
}
