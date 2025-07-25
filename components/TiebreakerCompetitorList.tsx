import React from 'react';
import { View, FlatList } from 'react-native';
import TiebreakerCompetitorCard from './TiebreakerCompetitorCard';

interface TiebreakerCompetitorListProps {
  competitors: any[];
  tieBreakerMode: boolean;
  currentTieGroup: any[] | null;
  selectedTieBreakerWinners: string[];
  onPress: (competitor: any) => void;
  onTieBreakerSelect: (competitorId: string) => void;
}

export default function TiebreakerCompetitorList({
  competitors,
  tieBreakerMode,
  currentTieGroup,
  selectedTieBreakerWinners,
  onPress,
  onTieBreakerSelect
}: TiebreakerCompetitorListProps) {
  const sortedCompetitors = [...competitors].sort((a, b) => {
    const aRank = a.final_rank || a.rank || 999;
    const bRank = b.final_rank || b.rank || 999;
    return aRank - bRank;
  });

  const renderCompetitor = ({ item: competitor }) => {
    const competitorId = competitor.id || competitor.tournament_competitor_id;
    const isInTieGroup = tieBreakerMode && currentTieGroup && 
      currentTieGroup.some(c => 
        (c.id === competitorId) || 
        (c.tournament_competitor_id === competitorId)
      );
    const isSelected = selectedTieBreakerWinners.includes(competitorId);

    return (
      <TiebreakerCompetitorCard
        competitor={competitor}
        isInTieGroup={isInTieGroup}
        isSelected={isSelected}
        tieBreakerMode={tieBreakerMode}
        onPress={() => onPress(competitor)}
        onTieBreakerSelect={() => onTieBreakerSelect(competitorId)}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={sortedCompetitors}
        renderItem={renderCompetitor}
        keyExtractor={(item) => item.id || item.tournament_competitor_id || Math.random().toString()}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}