import React from 'react';
import { View, Text } from 'react-native';
import TraditionalFormsCompetitorCardFixed from './TraditionalFormsCompetitorCardFixed';

interface Props {
  competitors: any[];
  tieBreakerActive: boolean;
  selectedWinners: string[];
  onPress: (competitor: any) => void;
  onTieBreakerSelect: (competitorId: string) => void;
  eventId: string;
}

export default function TraditionalFormsCompetitorList({
  competitors,
  tieBreakerActive,
  selectedWinners,
  onPress,
  onTieBreakerSelect,
  eventId
}: Props) {
  console.log('[TraditionalFormsCompetitorList] Received competitors:', competitors);
  console.log('[TraditionalFormsCompetitorList] Competitors count:', competitors?.length || 0);
  
  // Safety check for competitors array
  if (!competitors || !Array.isArray(competitors)) {
    console.log('[TraditionalFormsCompetitorList] No competitors array found');
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>No competitors found</Text>
      </View>
    );
  }

  if (competitors.length === 0) {
    console.log('[TraditionalFormsCompetitorList] Empty competitors array');
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>No competitors added yet</Text>
      </View>
    );
  }

  return (
    <View>
      {competitors.map((competitor, index) => {
        console.log(`[TraditionalFormsCompetitorList] Processing competitor ${index}:`, competitor);
        
        // Handle the nested tournament_competitor structure from the join
        const competitorData = competitor.tournament_competitor || competitor;
        const competitorId = competitor.tournament_competitor_id || competitorData.id;
        
        console.log(`[TraditionalFormsCompetitorList] Competitor ${index} data:`, competitorData);
        console.log(`[TraditionalFormsCompetitorList] Competitor ${index} ID:`, competitorId);
        
        const competitorWithScore = {
          ...competitorData,
          id: competitorId,
          tournament_competitor_id: competitorId,
          totalScore: competitor.totalScore || 0,
          rank: competitor.rank || 0,
          medal: competitor.medal,
          final_rank_label: competitor.final_rank_label,
          judge_a_score: competitor.judge_a_score,
          judge_b_score: competitor.judge_b_score,
          judge_c_score: competitor.judge_c_score,
          has_video: competitor.has_video || false,
          video_url: competitor.video_url,
          points: competitor.points || 0,
          tie_breaker_status: competitor.tie_breaker_status,
          isTied: competitor.isTied || false,
          participant_id: competitor.id,
          total_score: competitor.totalScore || competitor.total_score || 0
        };

        const isHighlighted = tieBreakerActive && competitor.isTied;
        const isSelected = selectedWinners.includes(competitorId);

        return (
          <TraditionalFormsCompetitorCardFixed
            key={`competitor-${competitorId}-${index}`}
            competitor={competitorWithScore}
            index={index}
            tieBreakerActive={tieBreakerActive}
            selectedWinners={selectedWinners}
            onPress={() => onPress(competitorWithScore)}
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