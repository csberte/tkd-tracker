import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus, processTiebreakerResultsEnhanced } from '../app/lib/tieBreakerHelpersEnhanced';
import { preserveRankOrder } from '../app/lib/persistTiebreakerRanksFixed';
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

export default function TiebreakerManagerEnhanced({
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
      
      console.log('[TiebreakerManagerEnhanced] Tie groups found:', tieGroups.length);
      console.log('[TiebreakerManagerEnhanced] Resolution status:', resolutionStatus);
    }
  }, [competitors]);

  const handleStartTieBreaker = (tieGroupIndex: number = 0) => {
    console.log('[TiebreakerManagerEnhanced] Starting tiebreaker for group:', tieGroupIndex);
    setTieBreakerActive(true);
    setSelectedWinners([]);
    if (setActiveTieGroupIndex) {
      setActiveTieGroupIndex(tieGroupIndex);
    }
  };

  const handleFinishTieBreaker = async () => {
    if (!tieBreakerActive || selectedWinners.length === 0) {
      console.log('[TiebreakerManagerEnhanced] Cannot finish - no active tiebreaker or winners');
      return;
    }
    
    const tieGroupIndex = activeTieGroupIndex || 0;
    const tiedGroup = currentTieGroups[tieGroupIndex];
    
    if (!tiedGroup || tiedGroup.length === 0) {
      console.error('[TiebreakerManagerEnhanced] No tied group found for index:', tieGroupIndex);
      return;
    }

    console.log('[TiebreakerManagerEnhanced] Finishing tiebreaker with winners:', selectedWinners);
    
    try {
      // Process tiebreaker results with enhanced persistence
      await processTiebreakerResultsEnhanced(eventId, tiedGroup, selectedWinners, 'A');
      
      // Sort competitors by final_rank to preserve tiebreaker order
      const sortedCompetitors = [...competitors].sort((a, b) => {
        if (a.final_rank && b.final_rank) {
          return a.final_rank - b.final_rank;
        }
        if (a.final_rank && !b.final_rank) return -1;
        if (!a.final_rank && b.final_rank) return 1;
        return (b.total_score || 0) - (a.total_score || 0);
      });
      
      // Preserve the rank order after tiebreaker
      const preserveSuccess = await preserveRankOrder(eventId, sortedCompetitors);
      
      if (preserveSuccess) {
        console.log('[TiebreakerManagerEnhanced] Tiebreaker completed successfully');
      } else {
        console.error('[TiebreakerManagerEnhanced] Failed to preserve rank order');
      }
      
      setTieBreakerActive(false);
      setSelectedWinners([]);
      if (setActiveTieGroupIndex) {
        setActiveTieGroupIndex(null);
      }
      
      // Refresh data to show persisted results
      onDataRefresh();
    } catch (error) {
      console.error('[TiebreakerManagerEnhanced] Error processing tiebreaker:', error);
    }
  };

  // Auto-finish tiebreaker when correct number of winners selected
  useEffect(() => {
    if (tieBreakerActive && selectedWinners.length > 0) {
      const tieGroupIndex = activeTieGroupIndex || 0;
      const tiedGroup = currentTieGroups[tieGroupIndex];
      
      if (tiedGroup && tiedGroup.length > 0) {
        const requiredWinners = tiedGroup.length - 1;
        console.log('[TiebreakerManagerEnhanced] Selected winners:', selectedWinners.length, 'Required:', requiredWinners);
        
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