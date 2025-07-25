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
import SimpleScoreEntryModalWithRetry from '../../components/SimpleScoreEntryModalWithRetry';

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

export default function TraditionalFormsWithRetry() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorWithScore[]>([]);
  const [availableCompetitors, setAvailableCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (!eventId || !validateUUID(eventId)) {
      console.error('❌ [loadData] Invalid eventId:', eventId);
      Alert.alert('Error', 'Invalid event ID');
      return;
    }

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      logEventId('TraditionalFormsWithRetry - loadData START', eventId);
      console.log('🔄 [loadData] Loading data for eventId:', eventId);

      // Get tournament info
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('tournament_id, tournaments(id, name)')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        console.error('❌ [loadData] Event not found:', eventError);
        Alert.alert('Error', 'Event not found');
        return;
      }

      const tournamentData = eventData.tournaments as any;
      setTournament({
        id: tournamentData.id,
        name: tournamentData.name
      });

      // Load competitors with scores using retry logic
      const loadCompetitorsOperation = async () => {
        return await fetchEventCompetitorsWithScoresEnhancedFixed(eventId);
      };

      const competitorsWithScores = await retryFetchWithBackoff(
        loadCompetitorsOperation,
        'loadCompetitors',
        eventId,
        {
          maxRetries: 3,
          delayMs: 100,
          minResults: 0 // Allow empty results
        }
      );

      setCompetitors(competitorsWithScores);
      console.log('✅ [loadData] Loaded competitors:', competitorsWithScores.length);

      // Load available competitors for Add modal
      const available = await fetchAvailableCompetitors(tournamentData.id, eventId);
      setAvailableCompetitors(available);
      console.log('✅ [loadData] Available competitors:', available.length);

      logEventId('TraditionalFormsWithRetry - loadData SUCCESS', eventId, {
        competitorsCount: competitorsWithScores.length,
        availableCount: available.length
      });
    } catch (error) {
      console.error('❌ [loadData] Failed:', error);
      logEventId('TraditionalFormsWithRetry - loadData ERROR', eventId, { error: error?.message });
      Alert.alert('Error', 'Failed to load data. Please try again.');
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
    console.log('🔄 [handleScoreSaved] Score saved, refreshing data...');
    logEventId('TraditionalFormsWithRetry - handleScoreSaved', eventId!);
    
    // Use retry logic to ensure we get updated data
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
      
      {selectedCompetitor && (
        <SimpleScoreEntryModalWithRetry
          visible={showScoreModal}
          onClose={() => {
            setShowScoreModal(false);
            setSelectedCompetitor(null);
          }}
          competitor={selectedCompetitor}
          eventId={eventId!}
          tournamentId={tournament?.id || ''}
          onScoreSaved={handleScoreSaved}
        />
      )}
    </View>
  );
}