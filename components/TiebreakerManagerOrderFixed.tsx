import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus, processTiebreakerResults } from '../app/lib/tieBreakerHelpersFixed';
import TiebreakerButtonsFixed from './TiebreakerButtonsFixed';

interface TiebreakerManagerOrderFixedProps {
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

export default function TiebreakerManagerOrderFixed({
  eventId,
  competitors,
  tieBreakerActive,
  setTieBreakerActive,
  selectedWinners,
  setSelectedWinners,
  onDataRefresh,
  activeTieGroupIndex,
  setActiveTieGroupIndex
}: TiebreakerManagerOrderFixedProps) {
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

  const handleFinishTieBreaker = async () => {
    if (!tieBreakerActive || selectedWinners.length === 0) return;
    
    const tieGroupIndex = activeTieGroupIndex || 0;
    const tiedGroup = currentTieGroups[tieGroupIndex];
    
    if (!tiedGroup || tiedGroup.length === 0) {
      console.error('[TiebreakerManagerOrderFixed] No tied group found');
      return;
    }

    try {
      await processTiebreakerResults(eventId, tiedGroup, selectedWinners, 'A', onDataRefresh);
      
      // Reset tiebreaker state
      setTieBreakerActive(false);
      setSelectedWinners([]);
      if (setActiveTieGroupIndex) {
        setActiveTieGroupIndex(null);
      }
      
    } catch (error) {
      console.error('[TiebreakerManagerOrderFixed] Error processing tiebreaker:', error);
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

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <TiebreakerButtonsFixed
        eventId={eventId}
        tieBreakerActive={tieBreakerActive}
        setTieBreakerActive={setTieBreakerActive}
        selectedWinners={selectedWinners}
        setSelectedWinners={setSelectedWinners}
        onDataRefresh={onDataRefresh}
        competitors={competitors}
        activeTieGroupIndex={activeTieGroupIndex}
        setActiveTieGroupIndex={setActiveTieGroupIndex}
      />
    </View>
  );
}