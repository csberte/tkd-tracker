import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus } from '../app/lib/tieBreakerHelpersFixed';
import { completeTieBreaker } from '../app/lib/eventHelpers';

interface TiebreakerButtonsFixedProps {
  eventId: string;
  tieBreakerActive: boolean;
  setTieBreakerActive: (active: boolean) => void;
  selectedWinners: string[];
  setSelectedWinners: (winners: string[]) => void;
  onDataRefresh: () => void;
  competitors?: any[];
}

export default function TiebreakerButtonsFixed({ 
  eventId,
  tieBreakerActive,
  setTieBreakerActive,
  selectedWinners,
  setSelectedWinners,
  onDataRefresh,
  competitors = []
}: TiebreakerButtonsFixedProps) {
  const getTieGroups = () => {
    if (!Array.isArray(competitors) || competitors.length === 0) {
      return [];
    }
    
    try {
      return getAllTieGroupsInTop3(competitors);
    } catch (error) {
      console.error('[TiebreakerButtonsFixed] Error getting tie groups:', error);
      return [];
    }
  };
  
  const tieGroups = getTieGroups();
  const hasMultipleTies = tieGroups.length > 1;
  
  // Get current resolution status for each tie group
  const currentResolutionStatus = getTieGroupResolutionStatus(competitors);
  
  const handleStartTieBreaker = (tieGroupIndex = 0) => {
    console.log('[TiebreakerButtonsFixed] Starting tiebreaker for group:', tieGroupIndex);
    setTieBreakerActive(true);
    setSelectedWinners([]);
  };
  
  const handleCompleteTieBreaker = async () => {
    if (!tieBreakerActive || selectedWinners.length === 0) {
      console.warn('[TiebreakerButtonsFixed] Cannot complete - no active tiebreaker or winners');
      return;
    }
    
    try {
      const firstTieGroup = tieGroups[0];
      if (!firstTieGroup || firstTieGroup.length === 0) {
        console.warn('[TiebreakerButtonsFixed] No tie group found');
        return;
      }
      
      console.log('[TiebreakerButtonsFixed] Completing tiebreaker with winners:', selectedWinners);
      
      await completeTieBreaker(eventId, firstTieGroup, selectedWinners);
      
      // Reset tiebreaker state
      setTieBreakerActive(false);
      setSelectedWinners([]);
      
      // Wait for database updates to complete before refreshing UI
      setTimeout(() => {
        console.log('[TiebreakerButtonsFixed] Refreshing data after tiebreaker completion');
        onDataRefresh();
      }, 1000);
      
    } catch (error) {
      console.error('[TiebreakerButtonsFixed] Error completing tiebreaker:', error);
    }
  };
  
  const handleRedoTieBreaker = (tieGroupIndex = 0) => {
    console.log('[TiebreakerButtonsFixed] Redoing tiebreaker for group:', tieGroupIndex);
    setTieBreakerActive(true);
    setSelectedWinners([]);
  };
  
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}>
      {/* Show tiebreaker buttons for unresolved ties */}
      {!tieBreakerActive && tieGroups.map((_, index) => {
        const isResolved = currentResolutionStatus[index] || false;
        if (isResolved) return null;
        
        return (
          <TouchableOpacity 
            key={`tiebreaker-${index}`}
            onPress={() => handleStartTieBreaker(index)} 
            style={{
              backgroundColor: '#000000', 
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 8,
              alignItems: 'center',
              minHeight: 36,
              width: '100%',
              maxWidth: 200
            }}
          >
            <Text style={{color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 14}}>
              {hasMultipleTies ? `Tiebreaker #${index + 1}` : 'Tiebreaker'}
            </Text>
          </TouchableOpacity>
        );
      })}
      
      {/* Show complete tiebreaker button when active */}
      {tieBreakerActive && (
        <TouchableOpacity 
          onPress={handleCompleteTieBreaker}
          disabled={selectedWinners.length === 0}
          style={{
            backgroundColor: selectedWinners.length > 0 ? '#4CAF50' : '#CCCCCC',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginBottom: 8,
            alignItems: 'center',
            minHeight: 36,
            width: '100%',
            maxWidth: 200
          }}
        >
          <Text style={{color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 14}}>
            Complete Tiebreaker
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Show redo buttons for resolved ties */}
      {!tieBreakerActive && tieGroups.map((_, index) => {
        const isResolved = currentResolutionStatus[index] || false;
        if (!isResolved) return null;
        
        return (
          <TouchableOpacity 
            key={`redo-${index}`}
            onPress={() => handleRedoTieBreaker(index)} 
            style={{
              backgroundColor: '#880808', 
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 8,
              alignItems: 'center',
              minHeight: 36,
              width: '100%',
              maxWidth: 200
            }}
          >
            <Text style={{color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 14}}>
              {hasMultipleTies ? `Redo Tiebreaker #${index + 1}` : 'Redo Tiebreaker'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}