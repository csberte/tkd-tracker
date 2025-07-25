import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { getOrCreateTraditionalFormsEvent } from '../app/lib/traditionalFormsEventManager';
import { getAllParticipantsInEvent } from '../app/lib/eventHelpersRest2EnhancedFixed';
import { validateUUID } from '../app/lib/utils';
import { initializeTournamentEvents } from '../app/lib/tournamentEventsInitializer';
import { debugTournamentCompetitors, deduplicateCompetitorsByName } from '../app/lib/tournamentCompetitorDebugger';
import TraditionalFormsCompetitorListSorted from './TraditionalFormsCompetitorListSorted';
import TraditionalFormsCompetitorSelectionModal from './TraditionalFormsCompetitorSelectionModal';
import { traditionalFormsStyles } from './TraditionalFormsStyles';
import SimpleScoreEntryModalUltimateFixed from './SimpleScoreEntryModalUltimateFixed';
import EditTraditionalFormsModalFinalFixed from './EditTraditionalFormsModalFinalFixed';
import ActionButton from './ActionButton';
import EventJudgesSection from './EventJudgesSection';
import TiebreakerManagerFixed from './TiebreakerManagerFixed';

export default function TraditionalFormsScreenAutoRefresh() {
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
  const cleanEventId = typeof eventId === 'string' ? eventId.replace(/NoHomeFlash$/, '') : eventId;

  const loadParticipants = async (eventId) => {
    // Guard clause: abort if tournament class not loaded
    if (!tournament?.class) {
      console.log('[TraditionalFormsScreenAutoRefresh] Tournament class not loaded, aborting loadParticipants');
      return null;
    }
    
    try {
      const participantsData = await getAllParticipantsInEvent(eventId);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Participants load error:', error);
      setParticipants([]);
    }
  };

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
        eventData = await getOrCreateTraditionalFormsEvent(cleanTournamentId);
        
        if (!eventData || !eventData.id) {
          throw new Error('Failed to create/get Traditional Forms event');
        }
        
        setValidEventId(eventData.id);
        setEvent(eventData);
      } else {
        throw new Error('No valid eventId or tournamentId provided');
      }
      
      if (cleanTournamentId) {
        await initializeTournamentEvents(cleanTournamentId);
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
  }, [cleanTournamentId, cleanEventId, tournament]);

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

  const loadAvailableCompetitors = async (tournamentId, eventId) => {
    if (!tournamentId || !eventId) return;
    try {
      console.log('------ Loading Available Competitors ------');
      
      const allTournamentCompetitors = await debugTournamentCompetitors(tournamentId);
      
      const { data: eventParticipants } = await supabase
        .from('event_participants')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      console.log('Event participants:', eventParticipants?.length || 0);
      
      const alreadyAddedIds = eventParticipants?.map(p => p.tournament_competitor_id) || [];
      console.log('Already added IDs:', alreadyAddedIds);
      
      const available = (allTournamentCompetitors || []).filter(
        comp => !alreadyAddedIds.includes(comp.id)
      );
      
      console.log('Available after filtering:', available.length);
      
      const uniqueByName = deduplicateCompetitorsByName(available);
      
      console.log('Final available competitors after deduplication:', uniqueByName.length);
      setAvailableCompetitors(uniqueByName);
    } catch (error) {
      console.error('Available competitors load error:', error);
      setAvailableCompetitors([]);
    }
  };

  // Rest of component implementation...
  return (
    <View style={traditionalFormsStyles.container}>
      <Text>TraditionalFormsScreenAutoRefresh Component</Text>
    </View>
  );
}
