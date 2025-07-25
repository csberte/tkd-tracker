import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CompetitorWithScore, calculateRankingsWithTies } from '../lib/eventHelpers';
import { initializeEventAndLoadCompetitorsFixed } from '../lib/eventInitializerFixed';
import { refreshEventState } from '../lib/refreshEventStateFixed';
import { validateUUID, isProblematicUUID } from '../lib/utils';
import { createEventIdGuard, guardDownstreamOperation } from '../lib/eventIdGuard';
import { validateEventIdBeforeGuard, clearStaleEventId } from '../lib/eventIdValidator';
import { printEventIdTrace as debugTrace } from '../lib/debugHelpers';
import TraditionalFormsCompetitorSelectionModal from '../../components/TraditionalFormsCompetitorSelectionModal';
import SimpleScoreEntryModalFinalFixed from '../../components/SimpleScoreEntryModalFinalFixed';
import ScoreCompetitorModalFinalFixed from '../../components/ScoreCompetitorModalFinalFixed';
import TraditionalFormsCompetitorCard from '../../components/TraditionalFormsCompetitorCard';
import ReadOnlyTournamentJudgesSection from '../../components/ReadOnlyTournamentJudgesSection';
import ShareButton from '../../components/ShareButton';
import LoadingToast from '../../components/LoadingToast';
import { styles } from '../../components/TraditionalFormsStyles3';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

export default function TraditionalFormsScreen() {
  console.trace('[NAV] Entered TraditionalFormsScreen');
  console.log('[TraditionalFormsScreen] MOUNTED');
  
  const params = useLocalSearchParams();
  const { eventId, tournamentId } = params;
  
  const currentEventId = useMemo(() => {
    const id = eventId as string;
    debugTrace(id, 'TraditionalFormsScreen - useMemo eventId');
    return id;
  }, [eventId]);
  
  const [displayCompetitors, setDisplayCompetitors] = useState<CompetitorWithScore[]>([]);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [simpleModalVisible, setSimpleModalVisible] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [newCompetitor, setNewCompetitor] = useState<Competitor | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [validatedEventId, setValidatedEventId] = useState<string | null>(null);
  const [eventReady, setEventReady] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [TraditionalFormsScreen] Screen focused, forcing fresh data fetch...');
      if (validatedEventId) {
        handleRefreshEventState();
      }
      setRefreshKey(k => k + 1);
    }, [validatedEventId])
  );

  const handleRefreshEventState = async () => {
    if (!validatedEventId) return;
    
    console.log('🔄 [handleRefreshEventState] Refreshing event state...');
    const refreshResult = await refreshEventState(validatedEventId);
    
    if (refreshResult.success && refreshResult.competitors) {
      console.log('✅ [handleRefreshEventState] Event state refreshed successfully');
      setDisplayCompetitors(refreshResult.competitors);
    } else {
      console.error('❌ [handleRefreshEventState] Failed to refresh event state:', refreshResult.error);
    }
  };

  useEffect(() => {
    debugTrace(currentEventId, 'TraditionalFormsScreen - useEffect (init)');
    initializeEventWithGuard();
  }, [refreshKey, currentEventId]);

  const initializeEventWithGuard = async () => {
    try {
      setLoading(true);
      setEventReady(false);
      setValidatedEventId(null);
      
      let finalEventId = currentEventId;
      
      if (currentEventId && currentEventId !== 'new' && validateUUID(currentEventId) && !isProblematicUUID(currentEventId)) {
        const validatedId = await validateEventIdBeforeGuard(
          currentEventId,
          tournamentId as string,
          'TraditionalFormsScreen - existing eventId'
        );
        
        if (validatedId) {
          await createEventIdGuard(validatedId, setValidatedEventId, router);
          await guardDownstreamOperation(validatedId, 'refreshEventState');
          
          const refreshResult = await refreshEventState(validatedId);
          if (refreshResult.success && refreshResult.competitors) {
            setDisplayCompetitors(refreshResult.competitors);
          }
          
          finalEventId = validatedId;
        } else {
          await clearStaleEventId(currentEventId, 'TraditionalFormsScreen - stale eventId');
          finalEventId = null;
        }
      }
      
      if (!finalEventId || finalEventId === 'new' || !validateUUID(finalEventId) || isProblematicUUID(finalEventId)) {
        console.log('[Navigation] Initializing new event without Home fallback');
        const result = await initializeEventAndLoadCompetitorsFixed(
          tournamentId as string, 
          'traditional_forms',
          setValidatedEventId,
          router
        );
        
        finalEventId = result.eventId;
        await createEventIdGuard(finalEventId, setValidatedEventId, router);
        
        if (result.competitors && result.competitors.length > 0) {
          const rankedCompetitors = calculateRankingsWithTies(result.competitors);
          setDisplayCompetitors(rankedCompetitors);
        } else {
          setDisplayCompetitors([]);
        }
      }
      
      if (!finalEventId || !validateUUID(finalEventId) || isProblematicUUID(finalEventId)) {
        throw new Error('Invalid final event ID');
      }
      
      setValidatedEventId(finalEventId);
      setEventReady(true);
      
    } catch (error) {
      console.error('❌ [initializeEventWithGuard] Error:', error.message);
      console.log('🚫 [initializeEventWithGuard] Error occurred but NOT navigating to Home');
      setDisplayCompetitors([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleScoreSaved = async () => {
    if (!validatedEventId) return;
    
    console.log('🔄 [handleScoreSaved] Refreshing event state after score submission...');
    const refreshResult = await refreshEventState(validatedEventId);
    
    if (refreshResult.success && refreshResult.competitors) {
      console.log('✅ [handleScoreSaved] Updating display with fresh competitors:', refreshResult.competitors.length);
      setDisplayCompetitors(refreshResult.competitors);
    } else {
      console.error('❌ [handleScoreSaved] No competitors in refresh result');
    }
    
    setSimpleModalVisible(false);
    setModalVisible(false);
    setNewCompetitor(null);
    setSelectedCompetitor(null);
  };

  if (initialLoading || !eventReady || !validatedEventId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Traditional Forms</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Initializing event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Traditional Forms</Text>
        <ShareButton competitors={displayCompetitors} eventType="Traditional Forms" />
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.judgesSection}>
          <ReadOnlyTournamentJudgesSection tournamentId={tournamentId as string} />
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Competitors</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCompetitorModal(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Competitor</Text>
            </TouchableOpacity>
          </View>
          
          {displayCompetitors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No competitors added yet</Text>
            </View>
          ) : (
            displayCompetitors.map((competitor, index) => (
              <TraditionalFormsCompetitorCard
                key={`${competitor?.id || 'competitor'}-${index}`}
                competitor={competitor}
                index={index}
                tieBreakerActive={false}
                selectedWinners={[]}
                onPress={() => {
                  const competitorForModal = {
                    id: competitor.tournament_competitor_id || competitor.id,
                    name: competitor.name,
                    avatar: competitor.avatar,
                    source_type: competitor.source_type || 'tournament'
                  };
                  
                  const hasScore = competitor.judge_a_score !== undefined && 
                                  competitor.judge_b_score !== undefined && 
                                  competitor.judge_c_score !== undefined;
                  
                  if (hasScore) {
                    setSelectedCompetitor(competitorForModal);
                    setModalVisible(true);
                  } else {
                    setNewCompetitor(competitorForModal);
                    setSimpleModalVisible(true);
                  }
                }}
                onTieBreakerSelect={() => {}}
                videoStatusMap={{}}
                eventId={validatedEventId}
                isHighlighted={false}
                isSelected={false}
              />
            ))
          )}
        </View>
      </ScrollView>
      
      {showCompetitorModal && (
        <TraditionalFormsCompetitorSelectionModal
          visible={showCompetitorModal}
          onClose={() => setShowCompetitorModal(false)}
          eventId={validatedEventId}
          tournamentId={tournamentId as string}
          onCompetitorAdded={(competitor) => {
            setNewCompetitor(competitor);
            setShowCompetitorModal(false);
            setSimpleModalVisible(true);
          }}
        />
      )}
      
      {simpleModalVisible && newCompetitor && (
        <SimpleScoreEntryModalFinalFixed
          visible={simpleModalVisible}
          onClose={() => {
            setSimpleModalVisible(false);
            setNewCompetitor(null);
          }}
          competitor={newCompetitor}
          eventId={validatedEventId}
          tournamentId={tournamentId as string}
          onScoreSaved={handleScoreSaved}
        />
      )}
      
      {modalVisible && selectedCompetitor && (
        <ScoreCompetitorModalFinalFixed
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedCompetitor(null);
          }}
          competitor={selectedCompetitor}
          eventId={validatedEventId}
          tournamentId={tournamentId as string}
          onScoreSaved={handleScoreSaved}
        />
      )}
      
      <LoadingToast visible={loading} message="Loading competitors..." />
    </SafeAreaView>
  );
}
