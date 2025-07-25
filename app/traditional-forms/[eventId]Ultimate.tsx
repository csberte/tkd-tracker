import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { normalizeRank } from '../lib/rankUtils';
import TiebreakerManagerUltimate from '../../components/TiebreakerManagerUltimate';
import TraditionalFormsCompetitorCardUltimate from '../../components/TraditionalFormsCompetitorCardUltimate';
import SimpleScoreEntryModalUltimateFixed from '../../components/SimpleScoreEntryModalUltimateFixed';
import DeleteCompetitorModal from '../../components/DeleteCompetitorModal';
import TraditionalFormsCompetitorSelectionModalUltimate from '../../components/TraditionalFormsCompetitorSelectionModalUltimate';

export default function TraditionalFormsEventUltimate() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tiebreaker state
  const [tieBreakerActive, setTieBreakerActive] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [activeTieGroupIndex, setActiveTieGroupIndex] = useState<number | null>(null);
  
  // Modal state
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<any>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addCompetitorModalVisible, setAddCompetitorModalVisible] = useState(false);

  const fetchEventData = async () => {
    try {
      console.log('[TraditionalFormsEventUltimate] Fetching event data for:', eventId);
      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('tournament_events')
        .select(`
          *,
          tournaments (name, class)
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[TraditionalFormsEventUltimate] Event fetch error:', eventError);
        return;
      }

      setEvent(eventData);
      
      // Fetch competitors with scores
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('event_scores')
        .select(`
          *,
          tournament_competitors (
            id,
            competitor_id,
            competitors (name)
          )
        `)
        .eq('event_id', eventId)
        .order('placement', { ascending: true, nullsLast: true })
        .order('final_rank', { ascending: true, nullsLast: true })
        .order('total_score', { ascending: false, nullsLast: true });

      if (competitorsError) {
        console.error('[TraditionalFormsEventUltimate] Competitors fetch error:', competitorsError);
        return;
      }

      // Process competitors data
      const processedCompetitors = (competitorsData || []).map(score => {
        const competitor = score.tournament_competitors?.competitors;
        const normalizedRank = normalizeRank(score.placement || score.final_rank || score.rank);
        
        return {
          id: score.id,
          tournament_competitor_id: score.tournament_competitor_id,
          name: competitor?.name || 'Unknown',
          judge_a_score: score.judge_a_score,
          judge_b_score: score.judge_b_score,
          judge_c_score: score.judge_c_score,
          total_score: score.total_score,
          final_rank: normalizedRank,
          placement: score.placement,
          rank: score.rank,
          medal: score.medal,
          points: score.points,
          tie_breaker_status: score.tie_breaker_status,
          video_url: score.video_url,
        };
      });

      console.log('[TraditionalFormsEventUltimate] Processed competitors:', processedCompetitors.length);
      setCompetitors(processedCompetitors);
      
    } catch (error) {
      console.error('[TraditionalFormsEventUltimate] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEventData();
  };

  const handleEditScore = (competitor: any) => {
    setSelectedCompetitor(competitor);
    setScoreModalVisible(true);
  };

  const handleDeleteCompetitor = (competitor: any) => {
    setSelectedCompetitor(competitor);
    setDeleteModalVisible(true);
  };

  const handleToggleWinner = (competitorId: string) => {
    setSelectedWinners(prev => {
      if (prev.includes(competitorId)) {
        return prev.filter(id => id !== competitorId);
      } else {
        return [...prev, competitorId];
      }
    });
  };

  const handleScoreUpdate = () => {
    setScoreModalVisible(false);
    setSelectedCompetitor(null);
    fetchEventData();
  };

  const handleCompetitorDelete = () => {
    setDeleteModalVisible(false);
    setSelectedCompetitor(null);
    fetchEventData();
  };

  const handleAddCompetitor = () => {
    setAddCompetitorModalVisible(false);
    fetchEventData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading event...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{event?.title || 'Traditional Forms'}</Text>
          <Text style={styles.subtitle}>
            {event?.tournaments?.name} - {event?.tournaments?.class}
          </Text>
        </View>

        <TiebreakerManagerUltimate
          eventId={eventId as string}
          competitors={competitors}
          tieBreakerActive={tieBreakerActive}
          setTieBreakerActive={setTieBreakerActive}
          selectedWinners={selectedWinners}
          setSelectedWinners={setSelectedWinners}
          onDataRefresh={fetchEventData}
          activeTieGroupIndex={activeTieGroupIndex || 0}
          setActiveTieGroupIndex={setActiveTieGroupIndex}
        />

        <View style={styles.competitorsList}>
          {competitors.map((competitor) => (
            <TraditionalFormsCompetitorCardUltimate
              key={competitor.id}
              competitor={competitor}
              event={event}
              eventId={eventId as string}
              tieBreakerActive={tieBreakerActive}
              selectedWinners={selectedWinners}
              onToggleWinner={handleToggleWinner}
              onEditScore={handleEditScore}
              onDeleteCompetitor={handleDeleteCompetitor}
            />
          ))}
        </View>
      </ScrollView>

      {scoreModalVisible && selectedCompetitor && (
        <SimpleScoreEntryModalUltimateFixed
          visible={scoreModalVisible}
          onClose={() => setScoreModalVisible(false)}
          competitor={selectedCompetitor}
          eventId={eventId as string}
          onScoreUpdate={handleScoreUpdate}
        />
      )}

      {deleteModalVisible && selectedCompetitor && (
        <DeleteCompetitorModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          competitor={selectedCompetitor}
          eventId={eventId as string}
          onDelete={handleCompetitorDelete}
        />
      )}

      {addCompetitorModalVisible && (
        <TraditionalFormsCompetitorSelectionModalUltimate
          visible={addCompetitorModalVisible}
          onClose={() => setAddCompetitorModalVisible(false)}
          eventId={eventId as string}
          onCompetitorAdded={handleAddCompetitor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  competitorsList: {
    padding: 16,
  },
});