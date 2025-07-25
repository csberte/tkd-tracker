import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getOrCreateTraditionalFormsEvent } from '../lib/traditionalFormsEventManager';
import { getAllParticipantsInEvent } from '../lib/eventHelpersRest2EnhancedSeasonalPoints';
import { validateUUID } from '../lib/utils';
import TraditionalFormsCompetitorListSeasonalPoints from '../../components/TraditionalFormsCompetitorListSeasonalPoints';
import TraditionalFormsCompetitorSelectionModalFixed from '../../components/TraditionalFormsCompetitorSelectionModalFixed';
import { traditionalFormsStyles } from '../../components/TraditionalFormsStyles';
import SimpleScoreEntryModalForNewCompetitorSeasonalPoints from '../../components/SimpleScoreEntryModalForNewCompetitorSeasonalPoints';
import ActionButton from '../../components/ActionButton';
import EventJudgesSection from '../../components/EventJudgesSection';
import TiebreakerButtons from '../../components/TiebreakerButtons';

export default function TraditionalFormsScreenSeasonalPoints() {
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
  const [tieBreakerActive, setTieBreakerActive] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [availableCompetitors, setAvailableCompetitors] = useState([]);
  const [errorDetails, setErrorDetails] = useState(null);
  
  const cleanTournamentId = typeof tournamentId === 'string' ? tournamentId.replace(/NoHomeFlash$/, '') : tournamentId;
  const cleanEventId = typeof eventId === 'string' ? eventId.replace(/NoHomeFlash$/, '') : eventId;

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    console.log('[TraditionalFormsScreenSeasonalPoints] loadData: tournamentId =', cleanTournamentId, 'eventId =', cleanEventId);
    
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    setErrorDetails(null);

    try {
      let eventData;
      
      if (cleanEventId && validateUUID(cleanEventId)) {
        console.log('[TraditionalFormsScreenSeasonalPoints] Loading existing event:', cleanEventId);
        const { data: existingEvent, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', cleanEventId)
          .single();
          
        if (error || !existingEvent) {
          console.error('[TraditionalFormsScreenSeasonalPoints] Failed to load event:', error);
          throw new Error('Event not found');
        }
        
        eventData = existingEvent;
        setValidEventId(existingEvent.id);
        setEvent(existingEvent);
      } else if (cleanTournamentId) {
        console.log('[TraditionalFormsScreenSeasonalPoints] Creating/getting event for tournament:', cleanTournamentId);
        eventData = await getOrCreateTraditionalFormsEvent(cleanTournamentId);
        
        if (!eventData || !eventData.id) {
          throw new Error('Failed to create/get Traditional Forms event');
        }
        
        console.log('[TraditionalFormsScreenSeasonalPoints] Event created/found:', eventData.id);
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
      
      console.log('[TraditionalFormsScreenSeasonalPoints] Data loading completed successfully');
    } catch (error) {
      console.error('[TraditionalFormsScreenSeasonalPoints] Load error:', error);
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
      
      if (error) {
        console.error('[loadTournamentData] Error:', error);
        return;
      }
      
      if (tournamentData) {
        setTournament(tournamentData);
        console.log('[loadTournamentData] Tournament loaded:', tournamentData.name);
      }
    } catch (error) {
      console.error('[loadTournamentData] Unexpected error:', error);
    }
  };

  const loadParticipants = async (eventId) => {
    console.log('[loadParticipants] Loading participants for event_id:', eventId);
    
    try {
      const participantsData = await getAllParticipantsInEvent(eventId);
      console.log('[loadParticipants] Participants loaded:', participantsData.length);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('[loadParticipants] Unexpected error:', error);
      setParticipants([]);
    }
  };

  const loadAvailableCompetitors = async (tournamentId, eventId) => {
    if (!tournamentId || !eventId) return;
    try {
      const { data: allCompetitors } = await supabase
        .from('tournament_competitors')
        .select('*')
        .eq('tournament_id', tournamentId);
      
      const { data: existingParticipants } = await supabase
        .from('event_participants')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      const existingIds = new Set(existingParticipants?.map(p => p.tournament_competitor_id) || []);
      const available = (allCompetitors || []).filter(c => !existingIds.has(c.id));
      setAvailableCompetitors(available);
      console.log('[loadAvailableCompetitors] Found', available.length, 'available competitors');
    } catch (error) {
      console.error('[loadAvailableCompetitors] Error:', error);
      setAvailableCompetitors([]);
    }
  };

  const handleCompetitorPress = (competitor) => { setSelectedCompetitor(competitor); setShowScoreModal(true); };
  
  const handleBack = () => {
    console.log('[TraditionalFormsScreenSeasonalPoints] handleBack called');
    if (cleanTournamentId) {
      console.log('[TraditionalFormsScreenSeasonalPoints] Navigating to tournament:', cleanTournamentId);
      router.replace(`/tournament/${cleanTournamentId}`);
    } else {
      console.log('[TraditionalFormsScreenSeasonalPoints] Using router.back()');
      router.back();
    }
  };

  // Handle competitor selection from modal
  const handleCompetitorSelected = (competitor) => {
    console.log('[handleCompetitorSelected] Selected competitor:', competitor.name);
    setSelectedCompetitor(competitor);
    setShowScoreModal(true);
    setShowAddModal(false);
  };

  // Handle score submission for new competitor
  const handleNewCompetitorScoreSubmitted = () => {
    console.log('[handleNewCompetitorScoreSubmitted] Score submitted for new competitor');
    loadData(true);
    setShowScoreModal(false);
    setSelectedCompetitor(null);
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
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
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
            <Text style={traditionalFormsStyles.debugText}>Event ID: {validEventId}</Text>
            <Text style={traditionalFormsStyles.debugText}>Processing competitors: {participants.length}</Text>
          </View>
        )}
        
        <EventJudgesSection eventId={validEventId} />
        
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <ActionButton 
            title="+ Add Competitor" 
            onPress={() => setShowAddModal(true)} 
            disabled={availableCompetitors.length === 0}
            style={{ backgroundColor: '#D32F2F', marginBottom: 16 }}
          />
        </View>
        
        <TiebreakerButtons 
          eventId={validEventId} 
          tieBreakerActive={tieBreakerActive} 
          setTieBreakerActive={setTieBreakerActive}
          selectedWinners={selectedWinners} 
          setSelectedWinners={setSelectedWinners}
          onDataRefresh={() => loadData(true)}
        />
        
        <TraditionalFormsCompetitorListSeasonalPoints 
          competitors={participants || []} 
          tieBreakerActive={tieBreakerActive}
          selectedWinners={selectedWinners} 
          onPress={handleCompetitorPress}
          onTieBreakerSelect={(competitorId) => {
            setSelectedWinners(prev => 
              prev.includes(competitorId) 
                ? prev.filter(id => id !== competitorId) 
                : [...prev, competitorId]
            );
          }}
          eventId={validEventId}
          useSeasonalPoints={true}
        />
      </ScrollView>
      
      <TraditionalFormsCompetitorSelectionModalFixed 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)}
        eventId={validEventId} 
        tournamentId={cleanTournamentId}
        onCompetitorSelected={handleCompetitorSelected}
      />
      
      {selectedCompetitor && (
        <SimpleScoreEntryModalForNewCompetitorSeasonalPoints 
          visible={showScoreModal} 
          onClose={() => { setShowScoreModal(false); setSelectedCompetitor(null); }}
          competitor={selectedCompetitor} 
          eventId={validEventId}
          onScoreSubmitted={handleNewCompetitorScoreSubmitted}
          useSeasonalPoints={true}
        />
      )}
    </View>
  );
}