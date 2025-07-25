import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTieGroupsInTop3, getTieGroupResolutionStatus, processTiebreakerResults } from '../app/lib/tieBreakerHelpers';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { supabase } from '../app/lib/supabase';
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
  setCompetitors?: (competitors: any[]) => void;
  tournamentClass?: 'AAA' | 'AA' | 'A' | 'B' | 'C';
}

export default function TiebreakerManager({
  eventId,
  competitors,
  tieBreakerActive,
  setTieBreakerActive,
  selectedWinners,
  setSelectedWinners,
  onDataRefresh,
  activeTieGroupIndex,
  setActiveTieGroupIndex,
  setCompetitors,
  tournamentClass = 'A'
}: TiebreakerManagerProps) {
  const [currentTieGroups, setCurrentTieGroups] = useState<any[][]>([]);
  const [resolvedTieGroups, setResolvedTieGroups] = useState<boolean[]>([]);
  const [tiebreakerWinners, setTiebreakerWinners] = useState<Map<string, string[]>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (competitors && competitors.length > 0) {
      const tieGroups = getAllTieGroupsInTop3(competitors);
      const resolutionStatus = getTieGroupResolutionStatus(competitors);
      setCurrentTieGroups(tieGroups);
      setResolvedTieGroups(resolutionStatus);
    }
  }, [competitors]);

  const handleStartTieBreaker = (tieGroupIndex: number = 0) => {
    console.log('[TiebreakerManager] Starting tiebreaker for group:', tieGroupIndex);
    setTieBreakerActive(true);
    setSelectedWinners([]);
    if (setActiveTieGroupIndex) {
      setActiveTieGroupIndex(tieGroupIndex);
    }
  };

  const handleFinishTieBreaker = async () => {
    console.log('[TiebreakerManager] handleFinishTieBreaker called');
    if (!tieBreakerActive || selectedWinners.length === 0) return;
    
    const tieGroupIndex = activeTieGroupIndex || 0;
    const tiedGroup = currentTieGroups[tieGroupIndex];
    
    if (!tiedGroup || tiedGroup.length === 0) {
      console.error('[TiebreakerManager] No tied group found');
      return;
    }

    try {
      await processTiebreakerResults(eventId, tiedGroup, selectedWinners, 'A');
      setTieBreakerActive(false);
      setSelectedWinners([]);
      if (setActiveTieGroupIndex) {
        setActiveTieGroupIndex(null);
      }
      
      // CRITICAL FIX: Refresh data after tiebreaker completion
      console.log('[TiebreakerManager] Refreshing data after tiebreaker completion');
      await onDataRefresh();
      
    } catch (error) {
      console.error('[TiebreakerManager] Error processing tiebreaker:', error);
    }
  };

  // Enhanced tiebreaker processing with consistent ranking and points calculation
  const processTiebreakerResultsEnhanced = async () => {
    if (tiebreakerWinners.size === 0) {
      Alert.alert('No Tiebreakers', 'No tiebreaker selections to process.');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('[TiebreakerManager] Processing tiebreaker results with points calculation...');
      
      // CRITICAL FIX: Update final ranks and calculate points using correct tournament class
      await updateFinalRanks(eventId, competitors, tiebreakerWinners, tournamentClass);
      
      console.log('[TiebreakerManager] Tiebreaker processing completed successfully');
      
      // CRITICAL FIX: Re-fetch updated data from Supabase to show correct points
      console.log('[TiebreakerManager] Re-fetching updated competitors from Supabase...');
      
      // Fetch fresh competitor data from database
      const { data: updatedScores, error } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .order('final_rank', { ascending: true });
      
      if (error) {
        console.error('[TiebreakerManager] Error fetching updated scores:', error);
      } else if (updatedScores && setCompetitors) {
        // Update local state with fresh data from database
        console.log('[TiebreakerManager] Updating local competitor state with fresh data');
        setCompetitors(updatedScores);
      }
      
      // Also trigger the parent refresh
      await onDataRefresh();
      
      // Clear tiebreaker selections
      setTiebreakerWinners(new Map());
      
      Alert.alert(
        'Tiebreaker Complete',
        'Tiebreaker results have been processed, rankings updated, and points calculated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[TiebreakerManager] Error processing tiebreaker:', error);
      Alert.alert(
        'Error',
        'Failed to process tiebreaker results. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTiebreakerSelect = (competitor: any, groupKey: string) => {
    const newWinners = new Map(tiebreakerWinners);
    const currentWinners = newWinners.get(groupKey) || [];
    
    const competitorId = competitor.tournament_competitor_id || competitor.id;
    
    if (currentWinners.includes(competitorId)) {
      // Remove from winners
      const updatedWinners = currentWinners.filter(id => id !== competitorId);
      if (updatedWinners.length === 0) {
        newWinners.delete(groupKey);
      } else {
        newWinners.set(groupKey, updatedWinners);
      }
    } else {
      // Add to winners
      newWinners.set(groupKey, [...currentWinners, competitorId]);
    }
    
    setTiebreakerWinners(newWinners);
  };

  const getTiebreakerGroups = () => {
    const groups: { [key: string]: any[] } = {};
    
    competitors.forEach(competitor => {
      if (competitor.tie_breaker_status === 'tied') {
        const rank = competitor.final_rank || competitor.rank || 0;
        const groupKey = `${rank}-tied`;
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(competitor);
      }
    });
    
    return groups;
  };

  // Fixed useEffect to delay requiredWinners until currentTieGroups is populated
  useEffect(() => {
    if (!tieBreakerActive || !currentTieGroups || !currentTieGroups.length) return;

    const tiedGroup = currentTieGroups[activeTieGroupIndex || 0] || [];
    if (!tiedGroup.length) return;

    const requiredWinners = tiedGroup.length - 1;
    if (selectedWinners.length === requiredWinners) {
      handleFinishTieBreaker();
    }
  }, [selectedWinners, currentTieGroups, activeTieGroupIndex, tieBreakerActive]);

  const tiebreakerGroups = getTiebreakerGroups();
  const hasActiveTiebreakers = Object.keys(tiebreakerGroups).length > 0;
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
      
      {/* Enhanced tiebreaker UI for manual selection */}
      {hasActiveTiebreakers && (
        <View style={{
          backgroundColor: '#FFF3E0',
          padding: 16,
          marginTop: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#FFB74D'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <Ionicons name="trophy" size={20} color="#FF9800" />
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              color: '#E65100'
            }}>
              Tiebreaker Active
            </Text>
          </View>
          
          <Text style={{
            fontSize: 14,
            color: '#BF360C',
            marginBottom: 12
          }}>
            Select winners for tied competitors to resolve rankings and calculate points.
          </Text>
          
          {Object.entries(tiebreakerGroups).map(([groupKey, group]) => {
            const selectedWinners = tiebreakerWinners.get(groupKey) || [];
            const rank = parseInt(groupKey.split('-')[0]);
            
            return (
              <View key={groupKey} style={{
                marginBottom: 12,
                padding: 12,
                backgroundColor: '#FFFFFF',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#FFE0B2'
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginBottom: 8,
                  color: '#E65100'
                }}>
                  Tied at Rank #{rank} ({group.length} competitors)
                </Text>
                
                {group.map(competitor => {
                  const competitorId = competitor.tournament_competitor_id || competitor.id;
                  const isSelected = selectedWinners.includes(competitorId);
                  
                  return (
                    <TouchableOpacity
                      key={competitorId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: isSelected ? '#E8F5E8' : '#F5F5F5',
                        borderRadius: 4,
                        marginBottom: 4,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#4CAF50' : '#E0E0E0'
                      }}
                      onPress={() => handleTiebreakerSelect(competitor, groupKey)}
                    >
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "radio-button-off"} 
                        size={20} 
                        color={isSelected ? "#4CAF50" : "#9E9E9E"} 
                      />
                      <Text style={{
                        marginLeft: 8,
                        fontSize: 14,
                        color: isSelected ? '#2E7D32' : '#424242'
                      }}>
                        {competitor.name}
                      </Text>
                      {isSelected && (
                        <Text style={{
                          marginLeft: 'auto',
                          fontSize: 12,
                          color: '#4CAF50',
                          fontWeight: 'bold'
                        }}>
                          Winner #{selectedWinners.indexOf(competitorId) + 1}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
          
          <TouchableOpacity
            style={{
              backgroundColor: tiebreakerWinners.size > 0 ? '#4CAF50' : '#BDBDBD',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 6,
              alignItems: 'center',
              marginTop: 8
            }}
            onPress={processTiebreakerResultsEnhanced}
            disabled={tiebreakerWinners.size === 0 || isProcessing}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold'
            }}>
              {isProcessing ? 'Processing...' : 'Confirm Tiebreaker Results & Calculate Points'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}