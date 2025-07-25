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
import TiebreakerManagerFixed from '../../components/TiebreakerManagerFixed';
import { updateFinalRanks } from '../lib/updateFinalRanksFixed';

export default function TraditionalFormsScreenDebug() {
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

  const handleTiebreakerSelection = useCallback((competitor) => {
    console.log('[TiebreakerSelection] Function called with competitor:', competitor.name);
    console.log('[TiebreakerSelection] Current selectedWinners:', selectedWinners);
    console.log('[TiebreakerSelection] Current selectedWinners length:', selectedWinners.length);
    
    const competitorId = competitor.tournament_competitor_id || competitor.id;
    console.log('[TiebreakerSelection] Competitor ID:', competitorId);
    
    let newSelectedWinners;
    if (selectedWinners.includes(competitorId)) {
      newSelectedWinners = selectedWinners.filter(id => id !== competitorId);
      console.log('[TiebreakerSelection] Removing competitor from selection');
    } else {
      newSelectedWinners = [...selectedWinners, competitorId];
      console.log('[TiebreakerSelection] Adding competitor to selection');
    }
    
    console.log('[TiebreakerSelection] New selectedWinners:', newSelectedWinners);
    setSelectedWinners(newSelectedWinners);
    
    const activeTieGroup = participants.filter(p => p.isTied);
    const requiredWinners = Math.max(1, activeTieGroup.length - 1);
    console.log('[TiebreakerSelection] Active tie group size:', activeTieGroup.length);
    console.log('[TiebreakerSelection] Required winners:', requiredWinners);
    console.log('[TiebreakerSelection] Current winners selected:', newSelectedWinners.length);
    
    if (newSelectedWinners.length >= requiredWinners) {
      console.log('[TiebreakerSelection] Enough winners selected, calling updateFinalRanks');
      updateFinalRanks(validEventId, participants, newSelectedWinners)
        .then(() => {
          console.log('[TiebreakerSelection] updateFinalRanks completed successfully');
          console.log('[TiebreakerSelection] Calling exitTieBreakerMode');
          exitTieBreakerMode();
        })
        .catch(error => {
          console.error('[TiebreakerSelection] updateFinalRanks failed:', error);
        });
    }
  }, [selectedWinners, participants, validEventId]);

  const exitTieBreakerMode = () => {
    console.log('[ExitTieBreaker] Function called');
    console.log('[ExitTieBreaker] Setting tieBreakerActive to false');
    setTieBreakerActive(false);
    console.log('[ExitTieBreaker] Clearing selectedWinners');
    setSelectedWinners([]);
    console.log('[ExitTieBreaker] Clearing activeTieGroupIndex');
    setActiveTieGroupIndex(null);
    console.log('[ExitTieBreaker] Calling loadData to refresh');
    loadData(true);
  };

  const handleCompetitorPress = (competitor) => {
    console.log('[CompetitorPress] Competitor pressed:', competitor.name);
    console.log('[CompetitorPress] tieBreakerActive:', tieBreakerActive);
    
    if (tieBreakerActive) {
      console.log('[CompetitorPress] In tiebreaker mode, calling handleTiebreakerSelection');
      handleTiebreakerSelection(competitor);
    } else {
      console.log('[CompetitorPress] Not in tiebreaker mode, opening edit modal');
      setSelectedCompetitor(competitor);
      setShowEditModal(true);
    }
  };

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setErrorDetails(null);

    try {
      let eventData;
      const eventType = EVENT_TYPES.TRADITIONAL_FORMS;
      
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
      
      if (eventData?.id) {
        const participantsData = await getAllParticipantsInEvent(eventData.id);
        setParticipants(participantsData || []);
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

  if (loading) {
    return (
      <View style={traditionalFormsStyles.container}>
        <View style={traditionalFormsStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
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

  return (
    <View style={traditionalFormsStyles.container}>
      <View style={traditionalFormsStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={traditionalFormsStyles.headerTitle}>Traditional Forms</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView 
        style={traditionalFormsStyles.scrollContainer} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        <TiebreakerManagerFixed 
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
        />
        
        <TraditionalFormsCompetitorListSorted 
          competitors={participants || []} 
          tieBreakerActive={tieBreakerActive}
          selectedWinners={selectedWinners} 
          onPress={handleCompetitorPress}
          eventId={validEventId}
          activeTieGroupIndex={activeTieGroupIndex}
        />
      </ScrollView>
    </View>
  );
}