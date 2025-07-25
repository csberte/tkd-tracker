import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getOrCreateEventByType, EVENT_TYPES } from '../lib/eventTypeManager';
import { getAllParticipantsInEvent } from '../lib/eventHelpersRest2EnhancedFixed';
import { validateUUID } from '../lib/utils';
import { debugTournamentCompetitors, deduplicateCompetitorsByName } from '../lib/tournamentCompetitorDebugger';
import TraditionalFormsCompetitorListSorted from '../../components/TraditionalFormsCompetitorListSorted';
import TraditionalFormsCompetitorSelectionModal from '../../components/TraditionalFormsCompetitorSelectionModal';
import { traditionalFormsStyles } from '../../components/TraditionalFormsStyles';
import SimpleScoreEntryModalUltimateFixed from '../../components/SimpleScoreEntryModalUltimateFixed';
import EditTraditionalFormsModalFinalFixed from '../../components/EditTraditionalFormsModalFinalFixed';
import ActionButton from '../../components/ActionButton';
import EventJudgesSection from '../../components/EventJudgesSection';
import TiebreakerManager from '../../components/TiebreakerManager';

export default function TraditionalFormsScreen() {
  const { eventId, tournamentId } = useLocalSearchParams();
  const [event, setEvent] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [validEventId, setValidEventId] = useState(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tieBreakerActive, setTieBreakerActive] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [activeTieGroupIndex, setActiveTieGroupIndex] = useState(null);
  const [availableCompetitors, setAvailableCompetitors] = useState([]);
  const [errorDetails, setErrorDetails] = useState(null);
  
  const cleanTournamentId = typeof tournamentId === 'string' ? tournamentId.replace(/NoHomeFlash$/, '') : tournamentId;
  let cleanEventId = typeof eventId === 'string' ? eventId.replace(/NoHomeFlash$/, '') : eventId;

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setErrorDetails(null);

    try {
      let eventData;
      const eventType = EVENT_TYPES.TRADITIONAL_FORMS;
      
      if (cleanEventId && validateUUID(cleanEventId)) {
        const { data: rawEvent } = await supabase
          .from('events')
          .select('*')
          .eq('id', cleanEventId)
          .single();
          
        if (rawEvent?.event_type !== eventType) {
          cleanEventId = null;
        }
      }
      
      if (cleanEventId && validateUUID(cleanEventId)) {
        const { data: existingEvent, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', cleanEventId)
          .single();
          
        if (error || !existingEvent) {
          throw new Error('Event not found');
        }
        
        eventData = existingEvent;
        setValidEventId(existingEvent.id);
        setEvent(existingEvent);
      } else if (cleanTournamentId) {
        eventData = await getOrCreateEventByType(cleanTournamentId, eventType);
        
        if (!eventData || !eventData.id) {
          throw new Error('Failed to create/get Traditional Forms event');
        }
        
        setValidEventId(eventData.id);
        setEvent(eventData);
      } else {
        throw new Error('No valid eventId or tournamentId provided');
      }
      
      if (cleanTournamentId) {
        await loadTournamentData(cleanTournamentId);
      }
      
      if (eventData?.id) {
        await loadParticipants(eventData.id);
        
        if (cleanTournamentId) {
          await loadAvailableCompetitors(cleanTournamentId, eventData.id);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
      setErrorDetails(`Load failed: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanTournamentId, cleanEventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTournamentData = async (tournamentId) => {
    if (!tournamentId) return;
    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentData && !error) {
        setTournament(tournamentData);
      }
    } catch (error) {
      console.error('Tournament load error:', error);
    }
  };

  const loadParticipants = async (eventId) => {
    try {
      const participantsData = await getAllParticipantsInEvent(eventId);
      console.log('[TraditionalFormsScreen] Loaded participants:', participantsData.map(p => `${p.name}: final_rank=${p.final_rank}, rank=${p.rank}`));
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Participants load error:', error);
      setParticipants([]);
    }
  };

  const loadAvailableCompetitors = async (tournamentId, eventId) => {
    if (!tournamentId || !eventId) return;
    try {
      const allTournamentCompetitors = await debugTournamentCompetitors(tournamentId);
      
      const { data: eventParticipants } = await supabase
        .from('event_participants')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      const alreadyAddedIds = eventParticipants?.map(p => p.tournament_competitor_id) || [];
      
      const available = (allTournamentCompetitors || []).filter(
        comp => !alreadyAddedIds.includes(comp.id)
      );
      
      const uniqueByName = deduplicateCompetitorsByName(available);
      
      setAvailableCompetitors(uniqueByName);
    } catch (error) {
      console.error('Available competitors load error:', error);
      setAvailableCompetitors([]);
    }
  };

  const handleCompetitorPress = (competitor) => {
    if (tieBreakerActive) {
      const competitorId = competitor.tournament_competitor_id || competitor.id;
      setSelectedWinners(prev => 
        prev.includes(competitorId) 
          ? prev.filter(id => id !== competitorId) 
          : [...prev, competitorId]
      );
    } else {
      setSelectedCompetitor(competitor);
      setShowEditModal(true);
    }
  };
  
  const handleBack = () => {
    router.back();
  };

  const handleCompetitorSelected = (competitor) => {
    setSelectedCompetitor(competitor);
    setShowScoreModal(true);
    setShowAddModal(false);
  };

  const handleScoreSaved = async () => {
    await loadData(true);
    if (cleanTournamentId && validEventId) {
      await loadAvailableCompetitors(cleanTournamentId, validEventId);
    }
    setShowScoreModal(false);
    setSelectedCompetitor(null);
  };

  const handleScoreUpdated = async () => {
    await loadData(true);
    if (cleanTournamentId && validEventId) {
      await loadAvailableCompetitors(cleanTournamentId, validEventId);
    }
    setShowEditModal(false);
    setSelectedCompetitor(null);
  };

  const handleAddModalOpen = async () => {
    if (cleanTournamentId && validEventId) {
      await loadAvailableCompetitors(cleanTournamentId, validEventId);
    }
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <View style={traditionalFormsStyles.container}>
        <View style={traditionalFormsStyles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={traditionalFormsStyles.headerTitle}>Traditional Forms</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={traditionalFormsStyles.loadingContainer}>
          <Text>Loading Traditional Forms...</Text>
        </View>
      </View>
    );
  }

  if (!validEventId || errorDetails) {
    return (
      <View style={traditionalFormsStyles.container}>
        <View style={traditionalFormsStyles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={traditionalFormsStyles.headerTitle}>Traditional Forms</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={traditionalFormsStyles.errorContainer}>
          <Text style={traditionalFormsStyles.errorText}>
            {errorDetails || 'Failed to load Traditional Forms'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={traditionalFormsStyles.container}>
      <View style={traditionalFormsStyles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={traditionalFormsStyles.headerTitle}>Traditional Forms</Text>
        <TouchableOpacity onPress={handleAddModalOpen}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={traditionalFormsStyles.scrollContainer} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {event && (
          <View style={traditionalFormsStyles.eventInfo}>
            <Text style={traditionalFormsStyles.eventName}>{event.name}</Text>
            {tournament && (
              <Text style={traditionalFormsStyles.tournamentName}>{tournament.name}</Text>
            )}
          </View>
        )}
        
        <EventJudgesSection eventId={validEventId} />
        
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <ActionButton 
            title="+ Add Competitor" 
            onPress={handleAddModalOpen}
            disabled={availableCompetitors.length === 0 || tieBreakerActive}
            style={{ backgroundColor: '#D32F2F', marginBottom: 16 }}
          />
        </View>
        
        <TiebreakerManager 
          eventId={validEventId}
          competitors={participants}
          tieBreakerActive={tieBreakerActive}
          setTieBreakerActive={setTieBreakerActive}
          selectedWinners={selectedWinners}
          setSelectedWinners={setSelectedWinners}
          activeTieGroupIndex={activeTieGroupIndex}
          setActiveTieGroupIndex={setActiveTieGroupIndex}
          onDataRefresh={() => loadData(true)}
          setCompetitors={setParticipants}
          tournamentClass={tournament?.tournament_class || 'A'}
        />
        
        <TraditionalFormsCompetitorListSorted 
          competitors={participants || []} 
          tieBreakerActive={tieBreakerActive}
          selectedWinners={selectedWinners} 
          onPress={handleCompetitorPress}
          eventId={validEventId}
          activeTieGroupIndex={activeTieGroupIndex}
          tournamentClass={tournament?.tournament_class || tournament?.class || 'A'}
        />
      </ScrollView>
      
      <TraditionalFormsCompetitorSelectionModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)}
        eventId={validEventId} 
        tournamentId={cleanTournamentId}
        onCompetitorSelected={handleCompetitorSelected}
        onParticipantAdded={handleScoreSaved}
        availableCompetitors={availableCompetitors}
      />
      
      {selectedCompetitor && (
        <SimpleScoreEntryModalUltimateFixed 
          visible={showScoreModal} 
          onClose={() => { setShowScoreModal(false); setSelectedCompetitor(null); }}
          competitor={selectedCompetitor} 
          eventId={validEventId}
          onScoreSubmitted={handleScoreSaved}
        />
      )}
      
      {selectedCompetitor && (
        <EditTraditionalFormsModalFinalFixed 
          visible={showEditModal} 
          onClose={() => { setShowEditModal(false); setSelectedCompetitor(null); }}
          selectedCompetitor={selectedCompetitor}
          eventId={validEventId}
          tournamentId={cleanTournamentId}
          onScoreUpdated={handleScoreUpdated}
        />
      )}
    </View>
  );
}