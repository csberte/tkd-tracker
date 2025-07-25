import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus, processTiebreakerResultsFixed } from '../app/lib/tieBreakerHelpersFixed';
import { persistTiebreakerRanks, preserveRankOrder } from '../app/lib/persistTiebreakerRanks';
import TiebreakerButtons from './TiebreakerButtons';

interface TiebreakerManagerProps {
  eventId: string;
  competitors: any[];
  tieBreakerActive: boolean;
  setTieBreakerActive: (active: boolean) => void;
  selectedWinners: string[];
  setSelectedWinners: (winners: string[]) => void;
  onDataRefresh: () => void;
  activeTieGroupIndex?: number;
  setActiveTieGroupIndex?: (index: number | null) => void;
}

export default function TiebreakerManagerUltimate({
  eventId,
  competitors,
  tieBreakerActive,
  setTieBreakerActive,
  selectedWinners,
  setSelectedWinners,
  onDataRefresh,
  activeTieGroupIndex,
  setActiveTieGroupIndex
}: TiebreakerManagerProps) {
  const [currentTieGroups, setCurrentTieGroups] = useState<any[][]>([]);
  const [resolvedTieGroups, setResolvedTieGroups] = useState<boolean[]>([]);

  useEffect(() => {
    if (competitors && competitors.length > 0) {
      const tieGroups = getAllTieGroupsInTop3(competitors);
      const resolutionStatus = getTieGroupResolutionStatus(competitors);
      setCurrentTieGroups(tieGroups);
      setResolvedTieGroups(resolutionStatus);
    }
  }, [competitors]);

  const handleStartTieBreaker = (tieGroupIndex: number = 0) => {
    console.log('[TiebreakerManagerUltimate] Starting tiebreaker for group:', tieGroupIndex);
    setTieBreakerActive(true);
    setSelectedWinners([]);
    if (setActiveTieGroupIndex) {
      setActiveTieGroupIndex(tieGroupIndex);
    }
  };

  const handleFinishTieBreaker = async () => {
    if (!tieBreakerActive || selectedWinners.length === 0) return;
    
    const tieGroupIndex = activeTieGroupIndex || 0;
    const tiedGroup = currentTieGroups[tieGroupIndex];
    
    if (!tiedGroup || tiedGroup.length === 0) {
      console.error('[TiebreakerManagerUltimate] No tied group found');
      return;
    }

    try {
      console.log('[TiebreakerManagerUltimate] Processing tiebreaker results...');
      
      // Process tiebreaker results with persistence
      await processTiebreakerResultsFixed(eventId, tiedGroup, selectedWinners, 'A');
      
      console.log('[TiebreakerManagerUltimate] Persisting tiebreaker ranks...');
      
      // Persist the tiebreaker ranks with placement field
      const persistSuccess = await persistTiebreakerRanks(eventId, competitors);
      
      if (!persistSuccess) {
        console.error('[TiebreakerManagerUltimate] Failed to persist tiebreaker ranks');
        // Continue anyway to update UI
      }
      
      console.log('[TiebreakerManagerUltimate] Preserving rank order...');
      
      // Preserve the rank order after tiebreaker
      const preserveSuccess = await preserveRankOrder(eventId, competitors);
      
      if (!preserveSuccess) {
        console.error('[TiebreakerManagerUltimate] Failed to preserve rank order');
        // Continue anyway to update UI
      }
      
      setTieBreakerActive(false);
      setSelectedWinners([]);
      if (setActiveTieGroupIndex) {
        setActiveTieGroupIndex(null);
      }
      
      console.log('[TiebreakerManagerUltimate] Refreshing data...');
      
      // Refresh data to show persisted results
      onDataRefresh();
    } catch (error) {
      console.error('[TiebreakerManagerUltimate] Error processing tiebreaker:', error);
    }
  };

  // Auto-finish tiebreaker when correct number of winners selected
  useEffect(() => {
    if (tieBreakerActive && selectedWinners.length > 0) {
      const tieGroupIndex = activeTieGroupIndex || 0;
      const tiedGroup = currentTieGroups[tieGroupIndex];
      
      if (tiedGroup && tiedGroup.length > 0) {
        const requiredWinners = tiedGroup.length - 1;
        if (selectedWinners.length >= requiredWinners) {
          handleFinishTieBreaker();
        }
      }
    }
  }, [selectedWinners, tieBreakerActive, currentTieGroups, activeTieGroupIndex]);

  const showTiebreakerButton = currentTieGroups.length > 0 && !tieBreakerActive;
  const showRedoButton = resolvedTieGroups.some(Boolean) && !tieBreakerActive;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <TiebreakerButtons
        showTiebreakerButton={showTiebreakerButton}
        showRedoTiebreakerButton={showRedoButton}
        onStartTieBreaker={handleStartTieBreaker}
        onRedoTieBreaker={handleStartTieBreaker}
        competitors={competitors}
        resolvedTieGroups={resolvedTieGroups}
      />
    </View>
  );
}