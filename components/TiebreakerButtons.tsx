import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus } from '../app/lib/tieBreakerHelpers';

interface TiebreakerButtonsProps {
  showTiebreakerButton: boolean;
  showRedoTiebreakerButton: boolean;
  onStartTieBreaker: (tieGroupIndex?: number) => void;
  onRedoTieBreaker?: (tieGroupIndex?: number) => void;
  competitors?: any[];
  resolvedTieGroups?: boolean[];
}

export default function TiebreakerButtons({ 
  showTiebreakerButton, 
  showRedoTiebreakerButton, 
  onStartTieBreaker,
  onRedoTieBreaker,
  competitors = [],
  resolvedTieGroups = []
}: TiebreakerButtonsProps) {
  const getTieGroups = () => {
    if (!Array.isArray(competitors) || competitors.length === 0) {
      return [];
    }
    
    try {
      return getAllTieGroupsInTop3(competitors);
    } catch (error) {
      console.error('[TiebreakerButtons] Error getting tie groups:', error);
      return [];
    }
  };
  
  const tieGroups = getTieGroups();
  const hasMultipleTies = tieGroups.length > 1;
  
  // Get current resolution status for each tie group
  const currentResolutionStatus = getTieGroupResolutionStatus(competitors);
  
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
      {/* Show initial tiebreaker buttons for unresolved ties */}
      {showTiebreakerButton && (
        <View style={{ width: '100%', maxWidth: 200 }}>
          {tieGroups.map((_, index) => {
            const isResolved = currentResolutionStatus[index] || false;
            if (isResolved) return null;
            
            return (
              <TouchableOpacity 
                key={`tiebreaker-${index}`}
                onPress={() => onStartTieBreaker(index)} 
                style={{
                  backgroundColor: '#000000', 
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginBottom: 8,
                  alignItems: 'center',
                  minHeight: 36
                }}
              >
                <Text style={{color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 14}}>
                  {hasMultipleTies ? `Tiebreaker #${index + 1}` : 'Tiebreaker'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      
      {/* Show redo buttons for resolved ties */}
      {(showRedoTiebreakerButton || currentResolutionStatus.some(Boolean)) && (
        <View style={{ width: '100%', maxWidth: 200 }}>
          {tieGroups.map((_, index) => {
            const isResolved = currentResolutionStatus[index] || false;
            if (!isResolved) return null;
            
            return (
              <TouchableOpacity 
                key={`redo-${index}`}
                onPress={() => (onRedoTieBreaker || onStartTieBreaker)(index)} 
                style={{
                  backgroundColor: '#880808', 
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginBottom: 8,
                  alignItems: 'center',
                  minHeight: 36
                }}
              >
                <Text style={{color: 'white', textAlign: 'center', fontWeight: '600', fontSize: 14}}>
                  {hasMultipleTies ? `Redo Tiebreaker #${index + 1}` : 'Redo Tiebreaker'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}