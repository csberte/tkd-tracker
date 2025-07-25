import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ensureEventExists, fetchEventCompetitorsWithScoresEnhancedFixed, fetchAvailableCompetitors } from '../lib/eventHelpersRest2EnhancedFixed';
import { validateUUID } from '../lib/utils';
import { logEventId } from '../lib/eventIdLogger';
import { retryFetchWithBackoff } from '../lib/scoreConfirmationHelpers';
import TraditionalFormsCompetitorList from '../../components/TraditionalFormsCompetitorList';
import ActionButton from '../../components/ActionButton';
import TraditionalFormsCompetitorSelectionModal from '../../components/TraditionalFormsCompetitorSelectionModal';
import SimpleScoreEntryModalFinal from '../../components/SimpleScoreEntryModalFinal';

interface Tournament {
  id: string;
  name: string;
}

interface CompetitorWithScore {
  id: string;
  tournament_competitor_id?: string;
  name: string;
  avatar?: string;
  source_type?: string;
  totalScore: number;
  rank: number;
  placement?: string;
  isTied?: boolean;
  tie_breaker_status?: string;
  medal?: string;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
  has_video?: boolean;
  video_url?: string;
  final_rank?: number;
  points?: number;
}

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

export default function TraditionalFormsComplete() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorWithScore[]>([]);
  const [availableCompetitors, setAvailableCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [actualEventId, setActualEventId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let finalEventId = eventId;
      
      if (!eventId || eventId === 'new' || !validateUUID(eventId)) {
        console.log('Need to get tournament info first');
        Alert.alert('Error', 'Invalid event configuration');
        return;
      }
      
      logEventId('TraditionalFormsComplete - loadData START', finalEventId!);
      
      // Get tournament info and ensure we have correct traditional forms event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('tournament_id, event_type, tournaments(id, name)')
        .eq('id', finalEventId)
        .single();

      if (eventError || !eventData) {
        console.error('Event not found:', eventError);
        Alert.alert('Error', 'Event not found');
        return;
      }

      const tournamentData = eventData.tournaments as any;
      const cleanTournamentId = tournamentData.id;
      
      // If this is not a traditional forms event, find/create the correct one
      if (eventData.event_type !== 'traditional_forms') {
        console.log('[TraditionalFormsComplete] Current event is not traditional_forms, finding correct event');
        finalEventId = await ensureEventExists(cleanTournamentId, 'traditional_forms');
        console.log('[TraditionalFormsComplete] Using correct event_id:', finalEventId);
      }
      
      setActualEventId(finalEventId!);
      setTournament({
        id: cleanTournamentId,
        name: tournamentData.name
      });

      const loadCompetitorsOperation = async () => {
        return await fetchEventCompetitorsWithScoresEnhancedFixed(finalEventId!);
      };

      const competitorsWithScores = await retryFetchWithBackoff(
        loadCompetitorsOperation,
        'loadCompetitors',
        finalEventId,
        {
          maxRetries: 3,
          delayMs: 100,
          minResults: 0
        }
      );

      setCompetitors(competitorsWithScores);
      const available = await fetchAvailableCompetitors(cleanTournamentId, finalEventId!);
      setAvailableCompetitors(available);
      setRefreshCounter(prev => prev + 1);
      
      console.log('[TraditionalFormsComplete] Using event_id:', finalEventId, 'for tournament:', cleanTournamentId);
      
      return competitorsWithScores;
    } catch (error) {
      console.error('Failed:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCompetitor = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setShowAddModal(false);
    setShowScoreModal(true);
  };

  const handleScoreSaved = async () => {
    console.log('Score saved, refreshing data...');
    logEventId('TraditionalFormsComplete - handleScoreSaved', actualEventId!);
    await loadData(true);
  };

  const handleCompetitorPress = (competitor: CompetitorWithScore) => {
    const competitorForModal: Competitor = {
      id: competitor.tournament_competitor_id || competitor.id,
      name: competitor.name,
      avatar: competitor.avatar,
      source_type: competitor.source_type || 'tournament'
    };
    
    setSelectedCompetitor(competitorForModal);
    setShowScoreModal(true);
  };

  const handleModalClose = () => {
    setShowScoreModal(false);
    setSelectedCompetitor(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Traditional Forms</Text>
          {tournament && (
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>{tournament.name}</Text>
          )}
          
          <TraditionalFormsCompetitorList
            key={refreshCounter}
            competitors={competitors}
            onCompetitorPress={handleCompetitorPress}
          />
          
          {competitors.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                No competitors scored yet.{"\n"}Tap "Add Competitor" to get started.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <View style={{ padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
        <ActionButton
          title="Add Competitor"
          onPress={() => setShowAddModal(true)}
          disabled={availableCompetitors.length === 0}
        />
        
        {availableCompetitors.length === 0 && competitors.length > 0 && (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 10, fontSize: 14 }}>
            All tournament competitors have been scored
          </Text>
        )}
      </View>
      
      <TraditionalFormsCompetitorSelectionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        competitors={availableCompetitors}
        onSelectCompetitor={handleAddCompetitor}
      />
      
      {selectedCompetitor && actualEventId && (
        <SimpleScoreEntryModalFinal
          visible={showScoreModal}
          onClose={handleModalClose}
          competitor={selectedCompetitor}
          eventId={actualEventId}
          tournamentId={tournament?.id || ''}
          onScoreSaved={handleScoreSaved}
          loadData={loadData}
          setScoredCompetitors={setCompetitors}
        />
      )}
    </View>
  );
}