import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { getTieGroups, CompetitorWithScore, hasResolvedTiesInTop3 } from '../app/lib/tieBreaker';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';

interface RedoTieBreakerButtonProps {
  onPress: () => void;
  onPress2?: () => void;
  competitors: CompetitorWithScore[];
  setTiebreakerMode?: (mode: boolean) => void;
  setCurrentTiebreaker?: (competitors: string[]) => void;
  onClearTiebreaker?: (groupIndex: number) => void;
  eventId: string;
}

export default function RedoTieBreakerButton({ 
  onPress, 
  onPress2, 
  competitors, 
  setTiebreakerMode, 
  setCurrentTiebreaker,
  onClearTiebreaker,
  eventId
}: RedoTieBreakerButtonProps) {
  const hasResolvedTies = hasResolvedTiesInTop3(competitors);
  
  if (!hasResolvedTies) {
    return null;
  }

  const byScore: Record<number, CompetitorWithScore[]> = {};
  competitors.forEach(c => {
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
        resolvedTieGroups.push({ rank: currentPosition, competitors: group.map(c => c.id), tiedCompetitors: group });
      }
    }
    currentPosition += group.length;
    if (currentPosition > 3) break;
  }

  const clearTiebreakerStatus = async (tiedGroup: CompetitorWithScore[]) => {
    console.log('[RedoTiebreaker] Clearing tiebreaker status for group:', tiedGroup.map(c => c.name));
    
    try {
      // Clear tie_breaker_status for all competitors in the group
      for (const competitor of tiedGroup) {
        if (competitor.id) {
          const { error } = await supabase
            .from('event_scores')
            .update({ 
              tie_breaker_status: null,
              final_rank: null // Reset final_rank to allow recalculation
            })
            .eq('id', competitor.id);
            
          if (error) {
            console.error('[RedoTiebreaker] Error clearing tiebreaker status:', error);
          }
        }
      }
      
      // Force recalculation of ranks without tiebreaker preservation
      console.log('[RedoTiebreaker] Forcing rank recalculation');
      await updateFinalRanks(eventId, false);
      
    } catch (error) {
      console.error('[RedoTiebreaker] Error in clearTiebreakerStatus:', error);
    }
  };

  const handleRedoPress = async (groupIndex: number) => {
    const tiedGroup = resolvedTieGroups[groupIndex];
    console.log(`Redo Tiebreaker #${groupIndex + 1} pressed`);
    console.log('[Tiebreaker] Entering tiebreaker mode');
    
    try {
      // Clear tiebreaker status first
      await clearTiebreakerStatus(tiedGroup.tiedCompetitors);
      
      // Clear prior tiebreaker selections for the tied group
      if (onClearTiebreaker) {
        await onClearTiebreaker(groupIndex);
      }
      
      // Re-enter tiebreaker mode (with red highlights and disabled modals)
      if (setTiebreakerMode && setCurrentTiebreaker) {
        console.log('[Tiebreaker] Setting tiebreaker mode to true');
        setTiebreakerMode(true);
        setCurrentTiebreaker([...tiedGroup.competitors]);
        console.log('[Tiebreaker] Tiebreaker mode activated with competitors:', tiedGroup.competitors);
      }
      
      // Call the appropriate onPress handler
      if (groupIndex === 0) {
        console.log('[Tiebreaker] Calling onPress for group 1');
        onPress();
      } else if (groupIndex === 1 && onPress2) {
        console.log('[Tiebreaker] Calling onPress2 for group 2');
        onPress2();
      }
      
      console.log('[Tiebreaker] Tiebreaker mode should now be active');
    } catch (error) {
      console.error('[Tiebreaker] Error in redo tiebreaker:', error);
    }
  };

  const renderRedoButton = (groupIndex: number) => {
    let buttonText = 'Redo Tie Breaker';
    if (resolvedTieGroups.length > 1) {
      buttonText = `Redo Tie Breaker #${groupIndex + 1}`;
    }
    
    return (
      <TouchableOpacity 
        key={groupIndex}
        style={styles.buttonContainer}
        onPress={() => handleRedoPress(groupIndex)}
        activeOpacity={0.7}
      >
        <View style={styles.redoButton}>
          <Text style={styles.icon}>🔁</Text>
          <Text style={styles.redoButtonText}>{buttonText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {resolvedTieGroups.length === 1 && renderRedoButton(0)}
      {resolvedTieGroups.length === 2 && (
        <View style={styles.verticalStack}>
          {renderRedoButton(0)}
          {renderRedoButton(1)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalStack: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  buttonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    marginTop: 8,
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 180,
    gap: 8,
    backgroundColor: '#DC3545',
  },
  redoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  icon: {
    fontSize: 16,
  },
});