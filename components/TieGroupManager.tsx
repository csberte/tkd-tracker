import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { getTieGroups, CompetitorWithScore, hasResolvedTiesInTop3 } from '../app/lib/tieBreaker';
import TieGroupButton from './TieGroupButton';
import RedoTieBreakerButton from './RedoTieBreakerButton';

interface TieGroupManagerProps {
  competitors: CompetitorWithScore[];
  tieGroups?: any[]; // Add optional tieGroups prop for backward compatibility
  onStartTieBreaker: (groupIndex: number) => void;
  onRedoTieBreaker: (groupIndex: number) => void;
  isActive: boolean;
}

export default function TieGroupManager({ 
  competitors, 
  tieGroups = [], // Default to empty array
  onStartTieBreaker, 
  onRedoTieBreaker, 
  isActive 
}: TieGroupManagerProps) {
  // Ensure tieGroups is always an array
  if (!Array.isArray(tieGroups)) {
    console.error('tieGroups is not an array:', tieGroups);
    tieGroups = [];
  }
  
  // Get tie groups from competitors if not provided
  const actualTieGroups = tieGroups.length > 0 ? tieGroups : getTieGroups(competitors || []);
  const hasResolvedTies = hasResolvedTiesInTop3(competitors || []);
  
  console.log('[TieGroupManager] Rendering with:', {
    competitorsCount: competitors?.length || 0,
    tieGroupsCount: actualTieGroups.length,
    hasResolvedTies,
    isActive
  });
  
  // Early return with safety check
  if (!Array.isArray(actualTieGroups)) {
    console.error('[TieGroupManager] actualTieGroups is not an array:', actualTieGroups);
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 12, color: 'red' }}>Error: Invalid tie groups data</Text>
      </View>
    );
  }
  
  // Get resolved tie groups
  const byScore: Record<number, CompetitorWithScore[]> = {};
  (competitors || []).forEach(c => {
    const score = c.totalScore || 0;
    if (!byScore[score]) byScore[score] = [];
    byScore[score].push(c);
  });
  
  const sortedScores = Object.keys(byScore).map(Number).sort((a, b) => b - a);
  const resolvedTieGroups = [];
  let currentPosition = 1;
  
  for (const score of sortedScores) {
    const group = byScore[score];
    if (group.length > 1 && currentPosition <= 3) {
      const hasResolution = group.some(c => c.tie_breaker_status && c.tie_breaker_status.startsWith('selected_'));
      if (hasResolution) {
        resolvedTieGroups.push({ rank: currentPosition, competitors: group.map(c => c.id) });
      }
    }
    currentPosition += group.length;
    if (currentPosition > 3) break;
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 12, color: 'red', marginBottom: 5 }}>
        tieGroups: {actualTieGroups.length} | resolvedTieGroups: {resolvedTieGroups.length}
      </Text>
      
      {/* Show active tie groups */}
      {actualTieGroups.map((group, index) => (
        <TieGroupButton
          key={`active-${index}`}
          groupIndex={index}
          isResolved={false}
          onPress={() => onStartTieBreaker(index)}
          isActive={isActive}
          totalGroups={actualTieGroups.length + resolvedTieGroups.length}
        />
      ))}
      
      {/* Show redo buttons for resolved ties */}
      {hasResolvedTies && (
        <RedoTieBreakerButton
          onPress={() => onStartTieBreaker(0)}
          onPress2={() => onStartTieBreaker(1)}
          competitors={competitors || []}
          setTiebreakerMode={() => {}}
          setCurrentTiebreaker={() => {}}
          onClearTiebreaker={onRedoTieBreaker}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 8
  }
});