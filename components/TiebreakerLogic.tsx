import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getAllTieGroupsInTop3, processTiebreakerResults } from '../app/lib/tieBreakerHelpers';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';

interface TiebreakerLogicProps {
  eventId: string;
  competitors: any[];
  onDataRefresh: () => void;
}

export default function TiebreakerLogic({ eventId, competitors, onDataRefresh }: TiebreakerLogicProps) {
  const [tieBreakerMode, setTieBreakerMode] = useState(false);
  const [currentTieGroup, setCurrentTieGroup] = useState(null);
  const [currentTieGroupIndex, setCurrentTieGroupIndex] = useState(0);
  const [selectedTieBreakerWinners, setSelectedTieBreakerWinners] = useState([]);
  const [resolvedTieGroups, setResolvedTieGroups] = useState([]);

  const tieGroups = getAllTieGroupsInTop3(competitors);
  const hasMultipleTies = tieGroups.length > 1;

  // Check which tie groups are resolved
  useEffect(() => {
    const resolved = tieGroups.map(group => 
      group.every(c => c.tie_breaker_status && c.tie_breaker_status !== '')
    );
    setResolvedTieGroups(resolved);
  }, [competitors]);

  const handleStartTieBreaker = (tieGroupIndex = 0) => {
    const group = tieGroups[tieGroupIndex];
    if (!group) return;
    
    setCurrentTieGroup(group);
    setCurrentTieGroupIndex(tieGroupIndex);
    setTieBreakerMode(true);
    setSelectedTieBreakerWinners([]);
  };

  const handleTieBreakerSelect = (competitorId) => {
    if (!tieBreakerMode || !currentTieGroup) return;
    
    const isSelected = selectedTieBreakerWinners.includes(competitorId);
    const maxSelections = currentTieGroup.length === 2 ? 1 : 2;
    
    if (isSelected) {
      setSelectedTieBreakerWinners(prev => prev.filter(id => id !== competitorId));
    } else if (selectedTieBreakerWinners.length < maxSelections) {
      setSelectedTieBreakerWinners(prev => [...prev, competitorId]);
    }
  };

  const handleFinalizeTieBreaker = async () => {
    if (!currentTieGroup || selectedTieBreakerWinners.length === 0) return;
    
    try {
      await processTiebreakerResults(
        eventId,
        currentTieGroup,
        selectedTieBreakerWinners,
        'A'
      );
      
      await updateFinalRanks(eventId);
      
      setTieBreakerMode(false);
      setCurrentTieGroup(null);
      setSelectedTieBreakerWinners([]);
      onDataRefresh();
    } catch (error) {
      console.error('Tiebreaker finalization error:', error);
    }
  };

  const renderTiebreakerButtons = () => {
    return (
      <View style={styles.container}>
        {/* Initial tiebreaker buttons */}
        {tieGroups.map((group, index) => {
          const isResolved = resolvedTieGroups[index];
          if (isResolved) return null;
          
          return (
            <TouchableOpacity
              key={`tiebreaker-${index}`}
              style={styles.tiebreakerButton}
              onPress={() => handleStartTieBreaker(index)}
            >
              <Text style={styles.buttonText}>
                {hasMultipleTies ? `🥋 Tiebreaker #${index + 1}` : '🥋 Tiebreaker'}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Redo buttons for resolved ties */}
        {resolvedTieGroups.map((isResolved, index) => {
          if (!isResolved) return null;
          
          return (
            <TouchableOpacity
              key={`redo-${index}`}
              style={styles.redoButton}
              onPress={() => handleStartTieBreaker(index)}
            >
              <Text style={styles.buttonText}>
                {hasMultipleTies ? `🔄 Redo Tiebreaker #${index + 1}` : '🔄 Redo Tiebreaker'}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Finalize button during tiebreaker mode */}
        {tieBreakerMode && selectedTieBreakerWinners.length > 0 && (
          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={handleFinalizeTieBreaker}
          >
            <Text style={styles.buttonText}>✅ Finalize Tiebreaker</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return {
    tieBreakerMode,
    currentTieGroup,
    selectedTieBreakerWinners,
    handleTieBreakerSelect,
    renderTiebreakerButtons
  };
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  tiebreakerButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  redoButton: {
    backgroundColor: '#DC3545',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  finalizeButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16
  }
});