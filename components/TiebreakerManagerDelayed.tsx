import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus } from '../app/lib/tieBreakerHelpersDelayed';
import { processTiebreakerResults } from '../app/lib/tieBreakerHelpersDelayed';
import TiebreakerButtonsFixed from './TiebreakerButtonsFixed';

interface TiebreakerManagerDelayedProps {
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

export default function TiebreakerManagerDelayed({
  eventId,
  competitors,
  tieBreakerActive,
  setTieBreakerActive,
  selectedWinners,
  setSelectedWinners,
  onDataRefresh,
  activeTieGroupIndex,
  setActiveTieGroupIndex
}: TiebreakerManagerDelayedProps) {
  const [currentTieGroups, setCurrentTieGroups] = useState<any[][]>([]);
  const [resolvedTieGroups, setResolvedTieGroups] = useState<boolean[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (competitors && competitors.length > 0) {
      const tieGroups = getAllTieGroupsInTop3(competitors);
      const resolutionStatus = getTieGroupResolutionStatus(competitors);
      setCurrentTieGroups(tieGroups);
      setResolvedTieGroups(resolutionStatus);
    }
  }, [competitors]);

  const handleFinishTieBreaker = async () => {
    console.log('[TiebreakerManagerDelayed] handleFinishTieBreaker called', {
      tieBreakerActive,
      selectedWinnersCount: selectedWinners.length,
      isProcessing
    });
    
    if (!tieBreakerActive || selectedWinners.length === 0 || isProcessing) {
      console.log('[TiebreakerManagerDelayed] Early return from handleFinishTieBreaker');
      return;
    }
    
    const tieGroupIndex = activeTieGroupIndex || 0;
    const tiedGroup = currentTieGroups[tieGroupIndex];
    
    if (!tiedGroup || tiedGroup.length === 0) {
      console.error('[TiebreakerManagerDelayed] No tied group found');
      return;
    }

    console.log('[TiebreakerManagerDelayed] Starting tiebreaker processing...');
    setIsProcessing(true);

    try {
      // Step 1: Process tiebreaker results (with skipRefresh = true)
      console.log('[TiebreakerManagerDelayed] Processing tiebreaker results...');
      await processTiebreakerResults(eventId, tiedGroup, selectedWinners, 'A', true);
      
      // Step 2: Add 150ms delay before deactivating tiebreaker
      console.log('[TiebreakerManagerDelayed] Waiting 150ms before deactivating...');
      await new Promise(res => setTimeout(res, 150));
      
      // Step 3: Deactivate tiebreaker
      console.log('[TiebreakerManagerDelayed] Deactivating tiebreaker...');
      setTieBreakerActive(false);
      
      setSelectedWinners([]);
      if (setActiveTieGroupIndex) {
        setActiveTieGroupIndex(null);
      }
      
      // Step 4: Add 250ms delay before refreshing data
      console.log('[TiebreakerManagerDelayed] Waiting 250ms before data refresh...');
      await new Promise(res => setTimeout(res, 250));
      
      // Step 5: Refresh data
      console.log('[TiebreakerManagerDelayed] Running delayed data refresh');
      await onDataRefresh();
      
      setIsProcessing(false);
      
    } catch (error) {
      console.error('[TiebreakerManagerDelayed] Error processing tiebreaker:', error);
      setIsProcessing(false);
    }
  };

  // Delayed auto-finish tiebreaker when correct number of winners selected
  useEffect(() => {
    console.log('[TiebreakerManagerDelayed] Auto-finish useEffect triggered', {
      tieBreakerActive,
      selectedWinnersCount: selectedWinners.length,
      isProcessing,
      activeTieGroupIndex
    });
    
    if (tieBreakerActive && selectedWinners.length > 0 && !isProcessing) {
      const tieGroupIndex = activeTieGroupIndex || 0;
      const tiedGroup = currentTieGroups[tieGroupIndex];
      
      if (tiedGroup && tiedGroup.length > 0) {
        const requiredWinners = tiedGroup.length - 1;
        console.log('[TiebreakerManagerDelayed] Checking auto-finish conditions', {
          selectedWinnersCount: selectedWinners.length,
          requiredWinners,
          tiedGroupLength: tiedGroup.length
        });
        
        if (selectedWinners.length >= requiredWinners) {
          console.log('[TiebreakerManagerDelayed] Auto-finish tiebreaker triggered');
          console.log('[TiebreakerManagerDelayed] Winners selected:', selectedWinners);
          
          // Immediate execution of delayed finish
          handleFinishTieBreaker();
        }
      }
    }
  }, [selectedWinners, tieBreakerActive, currentTieGroups, activeTieGroupIndex, isProcessing]);

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