import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { useTutorial } from '../../components/TutorialProvider';
import AnimatedTournamentCard from '../../components/AnimatedTournamentCard';
import ActionButton from '../../components/ActionButton';
import AddTournamentModal from '../../components/AddTournamentModal';
import DeleteTournamentModal from '../../components/DeleteTournamentModal';
import AnimatedTabScreen from '../../components/AnimatedTabScreen';
import { TournamentsTutorial } from '../../components/TournamentsTutorial';
import { supabase } from '../lib/supabase';
import { sortTournaments } from '../lib/tournamentSorter';

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
  class?: string;
}

export default function TournamentsTab() {
  const { user } = useAuth();
  const { registerButtonRef } = useTutorial();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  
  // Ref for Add Tournament button (Step 4) - using ref-based targeting
  const addTournamentButtonRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadTournaments();
      }
    }, [user])
  );

  // Register button ref for tutorial step 4 with ref-based targeting
  useEffect(() => {
    if (addTournamentButtonRef.current) {
      registerButtonRef(4, addTournamentButtonRef);
    }
  }, [registerButtonRef]);

  const loadTournaments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error loading tournaments:', error);
        Alert.alert('Error', 'Failed to load tournaments');
      } else {
        // Apply unified tournament sorting
        const sortedTournaments = sortTournaments(data || []);
        setTournaments(sortedTournaments);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentPress = (tournament: Tournament) => {
    router.push(`/tournament/${tournament.id}`);
  };

  const handleAddTournament = () => {
    setShowAddModal(true);
  };

  const handleTournamentAdded = () => {
    loadTournaments();
  };

  const handleDeleteTournament = (tournament: Tournament) => {
    setTournamentToDelete(tournament);
    setShowDeleteModal(true);
  };

  const handleTournamentDeleted = () => {
    setTournamentToDelete(null);
    loadTournaments();
  };

  return (
    <AnimatedTabScreen direction="left">
      <TournamentsTutorial />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tournaments</Text>
          <Text style={styles.subtitle}>Manage your tournaments</Text>
        </View>

        {/* Add New Tournament button with ref for tutorial step 4 */}
        <View style={styles.addButtonContainer}>
          <View ref={addTournamentButtonRef}>
            <ActionButton title="Add New Tournament" onPress={handleAddTournament} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Tournaments</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          ) : tournaments.length > 0 ? (
            tournaments.map((tournament, index) => (
              <AnimatedTournamentCard
                key={tournament.id}
                tournament={tournament}
                index={index}
                onPress={() => handleTournamentPress(tournament)}
                onDelete={() => handleDeleteTournament(tournament)}
              />
            ))
          ) : (
            <Text style={styles.noTournamentsText}>No tournaments found</Text>
          )}
        </View>

        <AddTournamentModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleTournamentAdded}
        />

        <DeleteTournamentModal
          visible={showDeleteModal}
          tournament={tournamentToDelete}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleTournamentDeleted}
        />
      </ScrollView>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  addButtonContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 20,
  },
  noTournamentsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});