import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CompetitorWithScore, calculateRankingsWithTies } from '../lib/eventHelpers';
import { getOrCreateValidEventId, validateEventExists } from '../lib/eventValidationCore';
import { validateUUID } from '../lib/utils';
import TraditionalFormsCompetitorSelectionCore from '../../components/TraditionalFormsCompetitorSelectionCore';
import SimpleScoreEntryModalCore from '../../components/SimpleScoreEntryModalCore';
import ScoreCompetitorModalFinalFixed from '../../components/ScoreCompetitorModalFinalFixed';
import TraditionalFormsCompetitorCard from '../../components/TraditionalFormsCompetitorCard';
import ReadOnlyTournamentJudgesSection from '../../components/ReadOnlyTournamentJudgesSection';
import ShareButton from '../../components/ShareButton';
import LoadingToast from '../../components/LoadingToast';
import { styles } from '../../components/TraditionalFormsStyles3';
import { supabase } from '../lib/supabase';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

export default function TraditionalFormsScreenCore() {
  const params = useLocalSearchParams();
  const { eventId, tournamentId } = params;
  
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
  const [validationError, setValidationError] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey(k => k + 1);
    }, [])
  );

  useEffect(() => {
    initializeEventWithCoreValidation();
  }, [refreshKey, eventId, tournamentId]);

  const initializeEventWithCoreValidation = async () => {
    try {
      setLoading(true);
      setEventReady(false);
      setValidatedEventId(null);
      setValidationError(null);
      setDisplayCompetitors([]);
      
      const tournamentIdStr = tournamentId as string;
      const eventIdStr = eventId as string;
      
      if (!tournamentIdStr || !validateUUID(tournamentIdStr)) {
        throw new Error('Invalid tournament ID');
      }
      
      let finalEventId: string | null = null;
      
      if (eventIdStr && eventIdStr !== 'new' && validateUUID(eventIdStr)) {
        const validation = await validateEventExists(eventIdStr);
        
        if (validation.valid) {
          finalEventId = eventIdStr;
        }
      }
      
      if (!finalEventId) {
        finalEventId = await getOrCreateValidEventId(tournamentIdStr, 'traditional_forms');
        
        if (!finalEventId) {
          throw new Error('Failed to get or create valid event ID');
        }
      }
      
      const finalValidation = await validateEventExists(finalEventId);
      
      if (!finalValidation.valid) {
        throw new Error(`Final event validation failed: ${finalValidation.error}`);
      }
      
      setValidatedEventId(finalEventId);
      await loadCompetitors(finalEventId);
      setEventReady(true);
      
    } catch (error) {
      console.error('[TraditionalFormsCore] Error:', error.message);
      setValidationError(error.message);
      setEventReady(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadCompetitors = async (eventId: string) => {
    try {
      const { data: scoresData, error: scoresError } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId);
      
      let competitors: CompetitorWithScore[] = [];
      
      if (!scoresError && scoresData && scoresData.length > 0) {
        for (const score of scoresData) {
          const { data: competitorData, error: competitorError } = await supabase
            .from('tournament_competitors')
            .select('id, name, avatar, source_type')
            .eq('id', score.tournament_competitor_id)
            .maybeSingle();
          
          if (!competitorError && competitorData) {
            competitors.push({
              id: score.id,
              tournament_competitor_id: competitorData.id,
              name: competitorData.name,
              avatar: competitorData.avatar,
              source_type: competitorData.source_type,
              totalScore: score.total_score || 0,
              rank: score.rank || 0,
              final_rank: score.final_rank,
              placement: score.placement,
              tie_breaker_status: score.tie_breaker_status,
              medal: score.medal,
              points: score.points,
              isTied: false,
              judge_a_score: score.judge_a_score,
              judge_b_score: score.judge_b_score,
              judge_c_score: score.judge_c_score,
              has_video: score.has_video || false,
              video_url: score.video_url
            });
          }
        }
      }
      
      if (competitors.length > 0) {
        const rankedCompetitors = calculateRankingsWithTies(competitors);
        setDisplayCompetitors(rankedCompetitors);
      } else {
        setDisplayCompetitors([]);
      }
      
    } catch (error) {
      console.error('[TraditionalFormsCore] Error loading competitors:', error);
    }
  };

  const handleScoreSaved = async () => {
    if (!validatedEventId) return;
    
    await loadCompetitors(validatedEventId);
    
    setSimpleModalVisible(false);
    setModalVisible(false);
    setNewCompetitor(null);
    setSelectedCompetitor(null);
  };

  if (initialLoading || !eventReady) {
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
          <Text>Validating event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (validationError || !validatedEventId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Traditional Forms</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>Event Validation Error</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            {validationError || 'Unable to validate event ID'}
          </Text>
          <TouchableOpacity 
            style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}
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
            <Text style={styles.sectionTitle}>Competitors ({displayCompetitors.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCompetitorModal(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Competitor</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ backgroundColor: '#e8f5e8', padding: 10, marginBottom: 10, borderRadius: 5 }}>
            <Text style={{ fontSize: 12, color: '#2d5a2d', fontWeight: '600' }}>✅ Validated Event ID: {validatedEventId}</Text>
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
        <TraditionalFormsCompetitorSelectionCore
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
        <SimpleScoreEntryModalCore
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