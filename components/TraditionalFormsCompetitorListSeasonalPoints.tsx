import React from 'react';
import { View } from 'react-native';
import TraditionalFormsCompetitorCardSeasonalPoints from './TraditionalFormsCompetitorCardSeasonalPoints';

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

interface TraditionalFormsCompetitorListSeasonalPointsProps {
  competitors: CompetitorWithScore[];
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: (competitor: CompetitorWithScore) => void;
  onTieBreakerSelect: (competitorId: string) => void;
  eventId: string;
  useSeasonalPoints?: boolean;
}

export default function TraditionalFormsCompetitorListSeasonalPoints({
  competitors,
  tieBreakerActive,
  selectedWinners,
  onPress,
  onTieBreakerSelect,
  eventId,
  useSeasonalPoints = false
}: TraditionalFormsCompetitorListSeasonalPointsProps) {
  console.log('[TraditionalFormsCompetitorListSeasonalPoints] Rendering with', competitors.length, 'competitors');
  
  if (!competitors || competitors.length === 0) {
    return null;
  }

  // Sort competitors by rank (lower rank number = higher placement)
  const sortedCompetitors = [...competitors].sort((a, b) => {
    const rankA = a.final_rank || a.rank || 999;
    const rankB = b.final_rank || b.rank || 999;
    
    // If both have no rank (999), sort by total score descending
    if (rankA === 999 && rankB === 999) {
      return (b.totalScore || 0) - (a.totalScore || 0);
    }
    
    // Otherwise sort by rank ascending (1st place first)
    return rankA - rankB;
  });

  console.log('[TraditionalFormsCompetitorListSeasonalPoints] Sorted competitors:', 
    sortedCompetitors.map(c => ({ name: c.name, rank: c.final_rank || c.rank, score: c.totalScore, points: c.points })));

  return (
    <View style={{ paddingBottom: 20 }}>
      {sortedCompetitors.map((competitor, index) => {
        const competitorId = competitor.tournament_competitor_id || competitor.id;
        const isHighlighted = competitor.isTied || false;
        const isSelected = selectedWinners.includes(competitorId);
        
        console.log(`[TraditionalFormsCompetitorListSeasonalPoints] Rendering ${competitor.name}:`, {
          id: competitorId,
          rank: competitor.final_rank || competitor.rank,
          totalScore: competitor.totalScore,
          points: competitor.points,
          isHighlighted,
          isSelected
        });
        
        return (
          <TraditionalFormsCompetitorCardSeasonalPoints
            key={competitorId}
            competitor={competitor}
            index={index}
            tieBreakerActive={tieBreakerActive}
            selectedWinners={selectedWinners}
            onPress={() => onPress(competitor)}
            onTieBreakerSelect={() => onTieBreakerSelect(competitorId)}
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