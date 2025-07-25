import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CompetitorWithScore, calculateRankingsWithTies } from '../lib/eventHelpers';
import { initializeEventAndLoadCompetitorsNoHome } from '../lib/eventInitializerNoHome';
import { refreshEventStateNoHomeFixed } from '../lib/refreshEventStateNoHomeFixed';
import { validateUUID, isProblematicUUID } from '../lib/utils';
import TraditionalFormsCompetitorSelectionModal from '../../components/TraditionalFormsCompetitorSelectionModal';
import SimpleScoreEntryModalNoHome from '../../components/SimpleScoreEntryModalNoHome';
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

export default function TraditionalFormsScreenNoHomeFlashFixed() {
  const params = useLocalSearchParams();
  const { eventId, tournamentId } = params;
  
  const currentEventId = useMemo(() => {
    const id = eventId as string;
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
  const [screenReady, setScreenReady] = useState(false);

  // Add useFocusEffect to reload competitors when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!validatedEventId) {
        console.log('🔄 Screen focused but no validated event ID - skipping refresh');
        return;
      }
      
      console.log('🔄 Screen focused - reloading competitors for event:', validatedEventId);
      handleRefreshEventState();
    }, [validatedEventId])
  );

  // Add useEffect to reload when event.id changes
  useEffect(() => {
    if (validatedEventId && eventReady && screenReady) {
      console.log('🔄 Event ID changed - reloading competitors');
      handleRefreshEventState();
    }
  }, [validatedEventId, eventReady, screenReady]);

  const handleRefreshEventState = async () => {
    if (!validatedEventId || !eventReady) return;
    
    console.log('🔄 Starting refresh for:', validatedEventId);
    const refreshResult = await refreshEventStateNoHomeFixed(validatedEventId);
    
    if (refreshResult.success && refreshResult.competitors) {
      console.log('✅ Successfully refreshed - competitors:', refreshResult.competitors.length);
      setDisplayCompetitors(refreshResult.competitors);
    } else {
      console.error('❌ Failed to refresh:', refreshResult.error);
      setDisplayCompetitors([]);
    }
  };

  useEffect(() => {
    if (eventReady) {
      console.log('⏳ Event ready, initializing...');
      initializeEventWithGuard();
    }
  }, [refreshKey, currentEventId, eventReady]);

  useEffect(() => {
    console.log('🚀 Setting event ready state');
    setEventReady(true);
  }, []);

  const initializeEventWithGuard = async () => {
    if (!eventReady) {
      console.log('⏸️ Event not ready, skipping');
      return;
    }
    
    try {
      console.log('🚀 Starting initialization - FIXED VERSION');
      setLoading(true);
      setValidatedEventId(null);
      setDisplayCompetitors([]);
      setScreenReady(false);
      
      let finalEventId = currentEventId;
      
      if (currentEventId && currentEventId !== 'new' && validateUUID(currentEventId) && !isProblematicUUID(currentEventId)) {
        finalEventId = currentEventId;
        const refreshResult = await refreshEventStateNoHomeFixed(finalEventId);
        if (refreshResult.success && refreshResult.competitors) {
          setDisplayCompetitors(refreshResult.competitors);
        }
      }
      
      if (!finalEventId || finalEventId === 'new' || !validateUUID(finalEventId) || isProblematicUUID(finalEventId)) {
        const result = await initializeEventAndLoadCompetitorsNoHome(
          tournamentId as string, 
          'traditional_forms',
          setValidatedEventId
        );
        
        finalEventId = result.eventId;
        
        if (result.competitors && result.competitors.length > 0) {
          const rankedCompetitors = calculateRankingsWithTies(result.competitors);
          setDisplayCompetitors(rankedCompetitors);
        } else {
          setDisplayCompetitors([]);
        }
      }
      
      if (!finalEventId || !validateUUID(finalEventId) || isProblematicUUID(finalEventId)) {
        throw new Error('Invalid final event ID after initialization');
      }
      
      setValidatedEventId(finalEventId);
      setScreenReady(true);
      
    } catch (error) {
      console.error('❌ Critical error:', error.message);
      console.log('🚫 Error occurred - STAYING IN SCREEN');
      setDisplayCompetitors([]);
      setScreenReady(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleScoreSaved = async () => {
    if (!validatedEventId) return;
    
    console.log('🔄 Score saved, refreshing state for:', validatedEventId);
    
    const refreshResult = await refreshEventStateNoHomeFixed(validatedEventId);
    
    if (refreshResult.success && refreshResult.competitors) {
      console.log('✅ State refreshed - competitors:', refreshResult.competitors.length);
      setDisplayCompetitors(refreshResult.competitors);
    } else {
      console.error('❌ Failed to refresh after score save:', refreshResult.error);
    }
    
    setSimpleModalVisible(false);
    setModalVisible(false);
    setNewCompetitor(null);
    setSelectedCompetitor(null);
  };

  const handleBackNavigation = () => {
    console.log('🧭 Back button pressed - navigating to tournament');
    if (tournamentId && eventReady && screenReady) {
      const cleanTournamentId = tournamentId.toString().replace(/NoHomeFlash$/, '');
      router.replace(`/tournament/${cleanTournamentId}`);
    } else {
      router.back();
    }
  };

  if (initialLoading || !eventReady || !screenReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackNavigation}>
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

  if (!validatedEventId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackNavigation}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Traditional Forms</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error: Unable to initialize event</Text>
          <TouchableOpacity 
            style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}
            onPress={() => setRefreshKey(k => k + 1)}
          >
            <Text style={{ color: 'white' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackNavigation}>
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
            <Text style={styles.sectionTitle}>Competitors ({displayCompetitors.length})</Text>
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
        <SimpleScoreEntryModalNoHome
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