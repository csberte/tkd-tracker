import React from 'react';
import { View, Text, FlatList } from 'react-native';
import TraditionalFormsCompetitorCardFinal from './TraditionalFormsCompetitorCardFinal';

interface Props {
  competitors: any[];
  onCompetitorPress?: (competitor: any) => void;
  onVideoPress?: (competitor: any) => void;
}

export default function TraditionalFormsCompetitorListFinal({ competitors, onCompetitorPress, onVideoPress }: Props) {
  console.log(`[TraditionalFormsCompetitorListFinal] Rendering ${competitors.length} competitors`);
  
  if (competitors.length === 0) {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          No competitors found for this event.
        </Text>
      </View>
    );
  }

  const sortedCompetitors = [...competitors].sort((a, b) => {
    const rankA = a.final_rank || a.rank || 999;
    const rankB = b.final_rank || b.rank || 999;
    return rankA - rankB;
  });

  // Transform competitors to ensure points_earned is properly mapped
  const transformedCompetitors = sortedCompetitors.map(competitor => ({
    ...competitor,
    id: competitor.id || competitor.tournament_competitor_id,
    name: competitor.tournament_competitor?.name || competitor.name,
    avatar: competitor.tournament_competitor?.avatar || competitor.avatar,
    totalScore: competitor.totalScore || 0,
    rank: competitor.final_rank || competitor.rank || 0,
    final_rank: competitor.final_rank || competitor.rank || 0,
    points_earned: competitor.points_earned || competitor.points || 0,
    has_video: competitor.has_video || false
  }));

  return (
    <FlatList
      data={transformedCompetitors}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TraditionalFormsCompetitorCardFinal
          competitor={item}
          onPress={() => onCompetitorPress?.(item)}
          onVideoPress={() => onVideoPress?.(item)}
        />
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    />
  );
}