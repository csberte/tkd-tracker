import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getOrCreateEventByType, EVENT_TYPES, EVENT_TYPE_NAMES } from '../lib/eventTypeManager';
import { getAllParticipantsInEvent } from '../lib/eventHelpersRest2EnhancedSeasonalPoints';
import { validateUUID } from '../lib/utils';
import { updateFinalRanks } from '../lib/updateFinalRanks';
import TraditionalFormsCompetitorListWithLogging from '../../components/TraditionalFormsCompetitorListWithLogging';
import TraditionalFormsCompetitorSelectionModalFixed from '../../components/TraditionalFormsCompetitorSelectionModalFixed';
import { traditionalFormsStyles } from '../../components/TraditionalFormsStyles';
import SimpleScoreEntryModalFinalStyled from '../../components/SimpleScoreEntryModalFinalStyled';
import EditTraditionalFormsModal from '../../components/EditTraditionalFormsModal';
import ActionButton from '../../components/ActionButton';
import EventJudgesSection from '../../components/EventJudgesSection';
import TiebreakerManager from '../../components/TiebreakerManager';

export default function TraditionalFormsScreenUltimateFixedWithLogging() {
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
  const [activeTieGroupIndex, setActiveTieGroupIndex] = useState(null);
  const [currentTieGroups, setCurrentTieGroups] = useState([]);
  
  const cleanTournamentId = typeof tournamentId === 'string' ? tournamentId.replace(/NoHomeFlash$/, '') : tournamentId;
  const cleanEventId = typeof eventId === 'string' ? eventId.replace(/NoHomeFlash$/, '') : eventId;

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    setErrorDetails(null);

    try {
      let eventData;
      
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
        eventData = await getOrCreateEventByType(cleanTournamentId, EVENT_TYPES.TRADITIONAL_FORMS);
        
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
      console.error('[loadTournamentData] Error:', error);
    }
  };

  const loadParticipants = async (eventId) => {
    try {
      const participantsData = await getAllParticipantsInEvent(eventId);
      setParticipants(participantsData || []);
    } catch (error) {
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
    } catch (error) {
      setAvailableCompetitors([]);
    }
  };

  const isCompetitorInCurrentTieGroup = (competitor) => {
    const currentGroup = currentTieGroups?.[activeTieGroupIndex] || [];
    return currentGroup.some((c) => c.id === competitor.id);
  };

  const handleCompetitorPress = (competitor) => {
    console.log('[ModalTrigger] Tapped competitor:', competitor);

    if (tieBreakerActive && isCompetitorInCurrentTieGroup(competitor)) {
      console.log('[ModalTrigger] Tiebreaker mode — selecting winner');
      handleTiebreakerSelection(competitor);
      return;
    }

    setSelectedCompetitor(competitor);
    setShowScoreModal(true);
  };

  const handleTiebreakerSelection = useCallback((competitor) => {
    console.log('[Screen] handleTiebreakerSelection defined:', typeof handleTiebreakerSelection);
    console.log('✅ handleTiebreakerSelection triggered for', competitor.name);
    console.log('[TiebreakerSelect] Competitor tapped:', competitor.id);

    setSelectedWinners((prev) =>
      prev.includes(competitor.id)
        ? prev.filter((x) => x !== competitor.id)
        : [...prev, competitor.id]
    );
  }, []);

  const handleBack = () => { 
    if (cleanTournamentId) router.push(`/tournament/${cleanTournamentId}`); 
    else router.back(); 
  };

  const handleCompetitorSelected = (competitor) => {
    setSelectedCompetitor(competitor);
    setShowScoreModal(true);
    setShowAddModal(false);
  };

  const handleNewCompetitorScoreSubmitted = async () => {
    // Add optional delay before calling updateFinalRanks
    await new Promise((res) => setTimeout(res, 300));
    
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

  console.log('[Screen] Passing handleTiebreakerSelection to List');

  return (
    <>
      <SafeAreaView style={traditionalFormsStyles.container}>
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
              <Text style={traditionalFormsStyles.eventName}>{EVENT_TYPE_NAMES[event.event_type] || event.name}</Text>
              {tournament && (
                <Text style={traditionalFormsStyles.tournamentName}>{tournament.name}</Text>
              )}
              <Text style={traditionalFormsStyles.debugText}>Event Type: {event.event_type}</Text>
              <Text style={traditionalFormsStyles.debugText}>Event ID: {validEventId}</Text>
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
          
          <TiebreakerManager 
            eventId={validEventId}
            competitors={participants || []}
            tieBreakerActive={tieBreakerActive}
            setTieBreakerActive={setTieBreakerActive}
            selectedWinners={selectedWinners}
            setSelectedWinners={setSelectedWinners}
            onDataRefresh={() => loadData(true)}
            activeTieGroupIndex={activeTieGroupIndex}
            setActiveTieGroupIndex={setActiveTieGroupIndex}
            currentTieGroups={currentTieGroups}
            setCurrentTieGroups={setCurrentTieGroups}
          />
          
          <TraditionalFormsCompetitorListWithLogging 
            competitors={participants || []} 
            tieBreakerActive={tieBreakerActive}
            selectedWinners={selectedWinners} 
            onPress={handleCompetitorPress}
            handleTiebreakerSelection={handleTiebreakerSelection}
            eventId={validEventId}
            activeTieGroupIndex={activeTieGroupIndex}
          />
        </ScrollView>
        
        <TraditionalFormsCompetitorSelectionModalFixed 
          visible={showAddModal} 
          onClose={() => setShowAddModal(false)}
          eventId={validEventId} 
          tournamentId={cleanTournamentId}
          onCompetitorSelected={handleCompetitorSelected}
        />
      </SafeAreaView>

      <SimpleScoreEntryModalFinalStyled
        visible={!!(showScoreModal && selectedCompetitor)}
        onClose={() => {
          setShowScoreModal(false);
          setSelectedCompetitor(null);
        }}
        competitor={selectedCompetitor}
        eventId={validEventId}
        onScoreSubmitted={handleNewCompetitorScoreSubmitted}
      />
    </>
  );
}
