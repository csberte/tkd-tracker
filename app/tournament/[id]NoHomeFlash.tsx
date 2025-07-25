import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { createEvent } from '../lib/eventHelpers';
import { validateUUID } from '../lib/utils';
import { navigateToTraditionalFormsWithSync } from '../lib/traditionalFormsNavigationHelper';
import EventCard from '../../components/EventCard';
import AddTournamentCompetitorModal from '../../components/AddTournamentCompetitorModal';
import HorizontalCompetitorList from '../../components/HorizontalCompetitorList';
import DeleteTournamentModal from '../../components/DeleteTournamentModal';
import TournamentJudgesSection from '../../components/TournamentJudgesSection';
import { pageStyles } from './[id]Styles';

const EVENT_TYPES = ['Traditional Forms','Traditional Weapons','Combat Sparring','Traditional Sparring','Creative Forms','Creative Weapons','Extreme Forms','Extreme Weapons'];

export default function TournamentDetailNoHomeFlash() {
  console.log("[TournamentDetailsScreen] MOUNTED");
  
  const { id } = useLocalSearchParams();
  const [tournament, setTournament] = useState(null);
  const [events, setEvents] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [participantCounts, setParticipantCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [user, setUser] = useState(null);
  const [creatingEvent, setCreatingEvent] = useState(null);
  const [syncingTraditionalForms, setSyncingTraditionalForms] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Force refresh tournament data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        console.log('🔄 [TournamentDetail] Screen focused, refreshing data...');
        loadTournamentData();
      }
    }, [id])
  );

  const loadTournamentData = async () => {
    if (!id) return;
    
    try {
      console.log('🔄 [TournamentDetail] Loading tournament data for ID:', id);
      
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (tournamentError || !tournamentData) {
        console.error('❌ [TournamentDetail] Error loading tournament:', tournamentError);
        return;
      }

      setTournament(tournamentData);

      // Force fresh data by using explicit queries without cache
      const [eventsRes, competitorsRes] = await Promise.all([
        supabase
          .from('tournament_events')
          .select('*')
          .eq('tournament_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tournament_competitors')
          .select('id, name, avatar, source_type, source_id, school')
          .eq('tournament_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (eventsRes.error) {
        console.error('❌ [TournamentDetail] Error loading events:', eventsRes.error);
      }
      if (competitorsRes.error) {
        console.error('❌ [TournamentDetail] Error loading competitors:', competitorsRes.error);
      }

      const eventsData = eventsRes.data || [];
      const competitorsData = competitorsRes.data || [];
      
      console.log('✅ [TournamentDetail] Loaded events:', eventsData.length);
      console.log('✅ [TournamentDetail] Loaded competitors:', competitorsData.length);
      
      setEvents(eventsData);
      setCompetitors(competitorsData);
      
      await loadParticipantCounts();
    } catch (error) {
      console.error('❌ [TournamentDetail] Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantCounts = async () => {
    try {
      const { data } = await supabase
        .from('event_participants')
        .select('event_type')
        .eq('tournament_id', id);
      
      const counts = {};
      (data || []).forEach(p => {
        counts[p.event_type] = (counts[p.event_type] || 0) + 1;
      });
      setParticipantCounts(counts);
    } catch (error) {
      console.error('❌ [TournamentDetail] Error loading participant counts:', error);
    }
  };

  const handleEventPress = async (eventType) => {
    if (creatingEvent || syncingTraditionalForms) {
      Alert.alert('Please wait', 'Another event is being created.');
      return;
    }

    const existingEvent = events.find(e => e.event_type === eventType);
    
    if (existingEvent) {
      if (eventType === 'Traditional Forms') {
        console.log("[Navigation] Navigating to TraditionalForms NoHomeFlash");
        setSyncingTraditionalForms(true);
        try {
          await navigateToTraditionalFormsWithSync(router, id);
          router.push(`/traditional-forms/${existingEvent.id}NoHomeFlash?tournamentId=${id}`);
        } catch (error) {
          console.error('❌ [TournamentDetail] Error navigating to Traditional Forms:', error);
        } finally {
          setSyncingTraditionalForms(false);
        }
      } else {
        router.push(`/event/${existingEvent.id}?tournamentId=${id}&eventType=${encodeURIComponent(eventType)}`);
      }
    } else {
      try {
        setCreatingEvent(eventType);
        const event = await createEvent(id, eventType, user?.id, tournament);
        
        if (!event?.id || !validateUUID(event.id)) {
          Alert.alert('Error', 'Failed to create event.');
          return;
        }

        const { data: tournamentEvent, error: tournamentEventError } = await supabase
          .from('tournament_events')
          .insert({
            tournament_id: id,
            event_type: eventType,
            event_id: event.id
          })
          .select()
          .single();

        if (tournamentEventError || !tournamentEvent) {
          Alert.alert('Error', 'Failed to create tournament event');
          return;
        }

        setEvents([...events, tournamentEvent]);

        if (eventType === 'Traditional Forms') {
          console.log("[Navigation] Navigating to TraditionalForms NoHomeFlash");
          setSyncingTraditionalForms(true);
          try {
            await navigateToTraditionalFormsWithSync(router, id);
            router.push(`/traditional-forms/${event.id}NoHomeFlash?tournamentId=${id}`);
          } catch (error) {
            console.error('❌ [TournamentDetail] Error navigating to Traditional Forms:', error);
          } finally {
            setSyncingTraditionalForms(false);
          }
        } else {
          router.push(`/event/${event.id}?tournamentId=${id}&eventType=${encodeURIComponent(eventType)}`);
        }
      } catch (error) {
        console.error('❌ [TournamentDetail] Error creating event:', error);
        Alert.alert('Error', 'Failed to create event.');
      } finally {
        setCreatingEvent(null);
        setSyncingTraditionalForms(false);
      }
    }
  };

  const handleDeleteTournament = async () => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) {
        Alert.alert('Error', 'Failed to delete tournament');
        return;
      }

      router.back();
    } catch (error) {
      console.error('❌ [TournamentDetail] Error deleting tournament:', error);
      Alert.alert('Error', 'Failed to delete tournament');
    }
  };

  const handleCompetitorAdded = () => {
    console.log('✅ [TournamentDetail] Competitor added, refreshing data...');
    loadTournamentData();
  };

  if (loading || !tournament) {
    return (
      <View style={pageStyles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (syncingTraditionalForms) {
    return (
      <View style={pageStyles.container}>
        <Text>Loading Traditional Forms…</Text>
      </View>
    );
  }

  return (
    <View style={pageStyles.container}>
      <View style={pageStyles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={pageStyles.headerTitle}>Tournament Details</Text>
        <TouchableOpacity onPress={() => setShowDeleteModal(true)}>
          <Ionicons name="trash" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={pageStyles.scrollContainer}>
        <View style={pageStyles.header}>
          <Text style={pageStyles.tournamentName}>{tournament.name}</Text>
          <Text style={pageStyles.tournamentInfo}>{tournament.location}</Text>
          <Text style={pageStyles.tournamentInfo}>
            {new Date(tournament.date).toLocaleDateString()}
          </Text>
        </View>

        <TournamentJudgesSection tournamentId={id} showInfoBubble={false} />

        <View style={pageStyles.competitorsCard}>
          <View style={pageStyles.sectionHeader}>
            <Text style={pageStyles.sectionTitle}>Competitors</Text>
            <TouchableOpacity 
              style={pageStyles.addButton}
              onPress={() => setShowAddCompetitor(true)}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={pageStyles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {competitors.length > 0 ? (
            <HorizontalCompetitorList 
              competitors={competitors} 
              onRefresh={loadTournamentData}
              tournamentId={id}
            />
          ) : (
            <Text style={pageStyles.emptyText}>No competitors added yet</Text>
          )}
        </View>

        <View style={pageStyles.section}>
          <Text style={pageStyles.sectionTitle}>Event Types</Text>
          {EVENT_TYPES.map((eventType) => {
            const isAdded = events.some(e => e.event_type === eventType);
            const participantCount = participantCounts[eventType] || 0;
            const isCreating = creatingEvent === eventType;
            return (
              <EventCard
                key={eventType}
                eventType={eventType}
                isAdded={isAdded}
                participantCount={participantCount}
                onPress={() => handleEventPress(eventType)}
                tournamentId={id}
                disabled={isCreating}
                loading={isCreating}
              />
            );
          })}
        </View>
      </ScrollView>

      <AddTournamentCompetitorModal
        visible={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        tournamentId={id}
        onCompetitorAdded={handleCompetitorAdded}
      />

      <DeleteTournamentModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTournament}
        tournamentName={tournament.name}
      />
    </View>
  );
}