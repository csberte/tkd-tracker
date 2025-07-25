import React from 'react';
import { View, Text } from 'react-native';
import TraditionalFormsCompetitorCardEnhanced from './TraditionalFormsCompetitorCardEnhanced';

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

interface TraditionalFormsCompetitorListEnhancedProps {
  competitors: CompetitorWithScore[];
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: (competitor: CompetitorWithScore) => void;
  onTieBreakerSelect: (competitorId: string) => void;
  eventId: string;
  useSeasonalPoints?: boolean;
}

export default function TraditionalFormsCompetitorListEnhanced({
  competitors,
  tieBreakerActive,
  selectedWinners,
  onPress,
  onTieBreakerSelect,
  eventId,
  useSeasonalPoints = false
}: TraditionalFormsCompetitorListEnhancedProps) {
  console.log('[TraditionalFormsCompetitorListEnhanced] Rendering', competitors.length, 'competitors');
  
  if (!competitors || competitors.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          No competitors added yet.{"\n"}Tap the + button to add competitors.
        </Text>
      </View>
    );
  }

  // Sort competitors by rank (lowest rank number first)
  const sortedCompetitors = [...competitors].sort((a, b) => {
    const rankA = a.final_rank || a.rank || 999;
    const rankB = b.final_rank || b.rank || 999;
    return rankA - rankB;
  });

  // Create video status map
  const videoStatusMap: Record<string, boolean> = {};
  competitors.forEach(competitor => {
    const key = competitor.tournament_competitor_id || competitor.id;
    videoStatusMap[key] = competitor.has_video || false;
  });

  // Determine which competitors are in tie situations for highlighting
  const tieGroups: Record<number, CompetitorWithScore[]> = {};
  sortedCompetitors.forEach(competitor => {
    if (competitor.tie_breaker_status === 'tied') {
      const rank = competitor.final_rank || competitor.rank || 0;
      if (!tieGroups[rank]) tieGroups[rank] = [];
      tieGroups[rank].push(competitor);
    }
  });

  const getIsHighlighted = (competitor: CompetitorWithScore): boolean => {
    if (!tieBreakerActive) return false;
    return competitor.tie_breaker_status === 'tied';
  };

  const getIsSelected = (competitor: CompetitorWithScore): boolean => {
    const competitorId = competitor.tournament_competitor_id || competitor.id;
    return selectedWinners.includes(competitorId);
  };

  return (
    <View style={{ paddingBottom: 20 }}>
      {sortedCompetitors.map((competitor, index) => {
        const isHighlighted = getIsHighlighted(competitor);
        const isSelected = getIsSelected(competitor);
        
        return (
          <TraditionalFormsCompetitorCardEnhanced
            key={competitor.tournament_competitor_id || competitor.id}
            competitor={competitor}
            index={index}
            tieBreakerActive={tieBreakerActive}
            selectedWinners={selectedWinners}
            onPress={() => onPress(competitor)}
            onTieBreakerSelect={() => onTieBreakerSelect(competitor.tournament_competitor_id || competitor.id)}
            videoStatusMap={videoStatusMap}
            eventId={eventId}
            isHighlighted={isHighlighted}
            isSelected={isSelected}
          />
        );
      })}
    </View>
  );
}