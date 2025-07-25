import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { validateUUID } from '../lib/utils';
import EventCard from '../../components/EventCard';
import AddTournamentCompetitorModalWithLogging from '../../components/AddTournamentCompetitorModalWithLogging';
import HorizontalCompetitorList from '../../components/HorizontalCompetitorList';
import DeleteTournamentModal from '../../components/DeleteTournamentModal';
import TournamentJudgesSection from '../../components/TournamentJudgesSection';
import { pageStyles } from './[id]Styles';

const EVENT_TYPES = ['Traditional Forms','Traditional Weapons','Combat Sparring','Traditional Sparring','Creative Forms','Creative Weapons','Extreme Forms','Extreme Weapons'];

export default function TournamentDetail() {
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
  const [hasNavigated, setHasNavigated] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cleanId = typeof id === 'string' ? id.replace(/NoHomeFlash$/, '') : id;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (cleanId) {
        loadTournamentData();
        setHasNavigated(false);
      }
    }, [cleanId])
  );

  const loadTournamentData = async () => {
    if (!cleanId) return;
    
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (tournamentError || !tournamentData) {
        console.error('Error loading tournament:', tournamentError);
        return;
      }

      setTournament(tournamentData);

      const [eventsRes, competitorsRes] = await Promise.all([
        supabase
          .from('tournament_events')
          .select('*')
          .eq('tournament_id', cleanId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tournament_competitors')
          .select('id, name, avatar, source_type, source_id, school')
          .eq('tournament_id', cleanId)
          .order('created_at', { ascending: false })
      ]);

      setEvents(eventsRes.data || []);
      setCompetitors(competitorsRes.data || []);
      
      await loadParticipantCounts();
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantCounts = async () => {
    try {
      const { data } = await supabase
        .from('event_participants')
        .select('event_type')
        .eq('tournament_id', cleanId);
      
      const counts = {};
      (data || []).forEach(p => {
        counts[p.event_type] = (counts[p.event_type] || 0) + 1;
      });
      setParticipantCounts(counts);
    } catch (error) {
      console.error('Error loading participant counts:', error);
    }
  };

  const handleEventPress = async (eventType) => {
    if (creatingEvent) {
      Alert.alert('Please wait', 'Another event is being created.');
      return;
    }

    if (hasNavigated) {
      return;
    }

    const existingEvent = events.find(e => e.event_type === eventType);
    
    if (existingEvent) {
      if (eventType === 'Traditional Forms') {
        setHasNavigated(true);
        router.push(`/traditional-forms/dummy?tournamentId=${cleanId}`);
      } else if (eventType === 'Creative Forms') {
        router.push(`/creative-forms/dummy?tournamentId=${cleanId}`);
      } else if (eventType === 'Extreme Forms') {
        router.push(`/extreme-forms/dummy?tournamentId=${cleanId}`);
      } else {
        Alert.alert('Info', 'Only Traditional Forms, Creative Forms, and Extreme Forms events are supported in this version.');
      }
    } else {
      // Navigate without eventId - let the screen create its own event
      if (eventType === 'Traditional Forms') {
        setHasNavigated(true);
        router.push(`/traditional-forms/dummy?tournamentId=${cleanId}`);
      } else if (eventType === 'Creative Forms') {
        router.push(`/creative-forms/dummy?tournamentId=${cleanId}`);
      } else if (eventType === 'Extreme Forms') {
        router.push(`/extreme-forms/dummy?tournamentId=${cleanId}`);
      } else {
        Alert.alert('Info', 'Only Traditional Forms, Creative Forms, and Extreme Forms events are supported in this version.');
      }
    }
  };

  const handleDeleteTournament = async () => {
    if (deleting) return;
    
    try {
      setDeleting(true);
      
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', cleanId);

      if (error) {
        Alert.alert('Error', `Failed to delete tournament: ${error.message}`);
        return;
      }

      router.push('/(tabs)/tournaments');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete tournament. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCompetitorAdded = () => {
    loadTournamentData();
  };

  const handleBack = () => {
    router.back();
  };

  const isTournamentValid = tournament && tournament.id && typeof tournament.id === 'string';

  if (loading || !tournament) {
    return (
      <View style={pageStyles.container}>
        <View style={pageStyles.headerContainer}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={pageStyles.headerTitle}>Tournament Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[pageStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, fontSize: 16 }}>Loading tournament...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={pageStyles.container}>
      <View style={pageStyles.headerContainer}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={pageStyles.headerTitle}>Tournament Details</Text>
        <TouchableOpacity onPress={() => setShowDeleteModal(true)} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons name="trash" size={24} color="#FF3B30" />
          )}
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

        <TournamentJudgesSection tournamentId={cleanId} showInfoBubble={false} />

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
              setCompetitors={setCompetitors}
              tournamentId={cleanId}
              onAssignmentsUpdated={loadTournamentData}
              onCompetitorDeleted={loadTournamentData}
            />
          ) : (
            <Text style={pageStyles.emptyText}>No competitors added yet</Text>
          )}
        </View>

        <View style={pageStyles.section}>
          <Text style={pageStyles.sectionTitle}>Event Types</Text>
          {!isTournamentValid ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={{ marginTop: 10, color: '#666' }}>Loading events...</Text>
            </View>
          ) : (
            EVENT_TYPES.map((eventType) => {
              const isAdded = events.some(e => e.event_type === eventType);
              const participantCount = participantCounts[eventType] || 0;
              const isDisabled = !isTournamentValid;
              
              return (
                <EventCard
                  key={eventType}
                  eventType={eventType}
                  isAdded={isAdded}
                  participantCount={participantCount}
                  onPress={isDisabled ? undefined : () => handleEventPress(eventType)}
                  tournamentId={cleanId}
                  disabled={isDisabled}
                />
              );
            })
          )}
        </View>
        
        <View style={pageStyles.section}>
          <TouchableOpacity 
            style={[pageStyles.deleteButton, deleting && pageStyles.disabledButton]}
            onPress={() => setShowDeleteModal(true)}
            disabled={deleting}
          >
            <Text style={[pageStyles.deleteButtonText, deleting && pageStyles.disabledText]}>
              {deleting ? 'Deleting Tournament...' : 'Delete Tournament'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddTournamentCompetitorModalWithLogging
        visible={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        tournamentId={cleanId}
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