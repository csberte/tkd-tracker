import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getOrCreateEventByType, EVENT_TYPES, EVENT_TYPE_NAMES } from '../lib/eventTypeManager';
import { getAllParticipantsInEvent } from '../lib/eventHelpersRest2EnhancedSeasonalPoints';
import { validateUUID } from '../lib/utils';
import TraditionalFormsCompetitorListSorted from '../../components/TraditionalFormsCompetitorListSorted';
import TraditionalFormsCompetitorSelectionModalFixed from '../../components/TraditionalFormsCompetitorSelectionModalFixed';
import { traditionalFormsStyles } from '../../components/TraditionalFormsStyles';
import SimpleScoreEntryModalFinalStyled from '../../components/SimpleScoreEntryModalFinalStyled';
import EditTraditionalFormsModal from '../../components/EditTraditionalFormsModal';
import ActionButton from '../../components/ActionButton';
import EventJudgesSection from '../../components/EventJudgesSection';
import TiebreakerManagerOrderFixed from '../../components/TiebreakerManagerOrderFixed';

export default function TraditionalFormsTiebreakerBugFixed() {
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
  const [availableCompetitors, setAvailableCompetitors] = useState([]);
  const [errorDetails, setErrorDetails] = useState(null);
  const [activeTieGroupIndex, setActiveTieGroupIndex] = useState(null);
  
  const cleanTournamentId = typeof tournamentId === 'string' ? tournamentId.replace(/NoHomeFlash$/, '') : tournamentId;
  const cleanEventId = typeof eventId === 'string' ? eventId.replace(/NoHomeFlash$/, '') : eventId;

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    console.log('🔄 Main: Loading data, showRefreshIndicator:', showRefreshIndicator);
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
      console.error('🔄 Main: Load data error:', error);
      setErrorDetails(`Load failed: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🔄 Main: Data loading completed');
    }
  }, [cleanTournamentId, cleanEventId]);

  useEffect(() => { 
    console.log('🔄 Main: Initial data load');
    loadData(); 
  }, [loadData]);

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
    console.log('🔄 Main: Loading participants for event:', eventId);
    try {
      const participantsData = await getAllParticipantsInEvent(eventId);
      console.log('🔄 Main: Loaded participants:', participantsData?.length || 0);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('🔄 Main: Error loading participants:', error);
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

  const handleCompetitorPress = (competitor) => {
    console.log('🔄 Main: handleCompetitorPress called for:', competitor.name);
    console.log('🔄 Main: Current tieBreakerActive state:', tieBreakerActive);
    
    if (tieBreakerActive) {
      console.log('🔄 Main: Tiebreaker active, preventing normal competitor press');
      return;
    }
    
    const totalScore = competitor.total_score || competitor.totalScore || 0;
    const hasBeenScored = totalScore > 0;
    
    console.log('🔄 Main: Competitor has been scored:', hasBeenScored);
    
    if (hasBeenScored) {
      setSelectedCompetitor(competitor);
      setShowEditModal(true);
    }
  };

  const handleTieBreakerSelect = (competitorId) => {
    console.log('🔄 Main: handleTieBreakerSelect called for competitor ID:', competitorId);
    console.log('🔄 Main: Current selectedWinners:', selectedWinners);
    
    if (!tieBreakerActive) {
      console.log('🔄 Main: Tiebreaker not active, ignoring selection');
      return;
    }
    
    setSelectedWinners(prev => {
      const newSelection = prev.includes(competitorId) 
        ? prev.filter(id => id !== competitorId) 
        : [...prev, competitorId];
      
      console.log('🔄 Main: Updated selectedWinners:', newSelection);
      return newSelection;
    });
  };

  const handleBack = () => { 
    if (cleanTournamentId) router.push(`/tournament/${cleanTournamentId}`); 
    else router.back(); 
  };

  const handleCompetitorSelected = (competitor) => {
    setSelectedCompetitor(competitor);
    setShowScoreModal(true);
    setShowAddModal(false);
  };

  const handleNewCompetitorScoreSubmitted = () => {
    loadData(true);
    setShowScoreModal(false);
    setSelectedCompetitor(null);
  };

  const handleScoreUpdated = () => {
    loadData(true);
    setShowEditModal(false);
    setSelectedCompetitor(null);
  };

  const handleDataRefresh = () => {
    console.log('✅ Main: Refreshing data after tiebreaker');
    setTieBreakerActive(false);
    setSelectedWinners([]);
    setActiveTieGroupIndex(null);
    loadData(true);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleDataRefresh} />}
      >
        {event && (
          <View style={traditionalFormsStyles.eventInfo}>
            <Text style={traditionalFormsStyles.eventName}>{EVENT_TYPE_NAMES[event.event_type] || event.name}</Text>
            {tournament && (
              <Text style={traditionalFormsStyles.tournamentName}>{tournament.name}</Text>
            )}
          </View>
        )}
        
        <EventJudgesSection eventId={validEventId} />
        
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <ActionButton 
            title="+ Add Competitor" 
            onPress={() => setShowAddModal(true)} 
            disabled={availableCompetitors.length === 0 || tieBreakerActive}
            style={{ backgroundColor: '#D32F2F', marginBottom: 16 }}
          />
        </View>
        
        <TiebreakerManagerOrderFixed 
          eventId={validEventId} 
          competitors={participants}
          tieBreakerActive={tieBreakerActive} 
          setTieBreakerActive={setTieBreakerActive}
          selectedWinners={selectedWinners} 
          setSelectedWinners={setSelectedWinners}
          onDataRefresh={handleDataRefresh}
          activeTieGroupIndex={activeTieGroupIndex}
          setActiveTieGroupIndex={setActiveTieGroupIndex}
        />
        
        <TraditionalFormsCompetitorListSorted 
          competitors={participants || []} 
          tieBreakerActive={tieBreakerActive}
          selectedWinners={selectedWinners} 
          onPress={handleCompetitorPress}
          onTieBreakerSelect={handleTieBreakerSelect}
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
      
      {selectedCompetitor && (
        <SimpleScoreEntryModalFinalStyled 
          visible={showScoreModal} 
          onClose={() => { setShowScoreModal(false); setSelectedCompetitor(null); }}
          competitor={selectedCompetitor} 
          eventId={validEventId}
          onScoreSubmitted={handleNewCompetitorScoreSubmitted}
        />
      )}
      
      {selectedCompetitor && (
        <EditTraditionalFormsModal 
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