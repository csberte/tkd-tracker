import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
}

interface TournamentManagementModalProps {
  visible: boolean;
  championId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TournamentManagementModal({ visible, championId, onClose, onUpdate }: TournamentManagementModalProps) {
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [championTournaments, setChampionTournaments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all tournaments
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: false });

      if (tournamentsError) throw tournamentsError;
      setAllTournaments(tournaments || []);

      // Load champion's tournaments
      const { data: championTourns, error: championError } = await supabase
        .from('champion_tournaments')
        .select('tournament_id')
        .eq('champion_id', championId);

      if (championError) throw championError;
      setChampionTournaments(championTourns?.map(ct => ct.tournament_id) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTournament = async (tournamentId: string) => {
    const isParticipating = championTournaments.includes(tournamentId);
    
    try {
      if (isParticipating) {
        // Remove from tournament
        const { error } = await supabase
          .from('champion_tournaments')
          .delete()
          .eq('champion_id', championId)
          .eq('tournament_id', tournamentId);
        
        if (error) throw error;
        setChampionTournaments(prev => prev.filter(id => id !== tournamentId));
      } else {
        // Add to tournament
        const { error } = await supabase
          .from('champion_tournaments')
          .insert({ champion_id: championId, tournament_id: tournamentId });
        
        if (error) throw error;
        setChampionTournaments(prev => [...prev, tournamentId]);
      }
      onUpdate();
    } catch (error) {
      console.error('Error updating tournament:', error);
      Alert.alert('Error', 'Failed to update tournament participation');
    }
  };

  const renderTournament = ({ item }: { item: Tournament }) => {
    const isParticipating = championTournaments.includes(item.id);
    
    return (
      <View style={styles.tournamentItem}>
        <View style={styles.tournamentInfo}>
          <Text style={styles.tournamentName}>{item.name}</Text>
          <Text style={styles.tournamentDetails}>{new Date(item.date).toLocaleDateString()}</Text>
          <Text style={styles.tournamentDetails}>{item.location}</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleButton, isParticipating ? styles.removeButton : styles.addButton]}
          onPress={() => toggleTournament(item.id)}
        >
          <Ionicons 
            name={isParticipating ? "remove-circle" : "add-circle"} 
            size={24} 
            color={isParticipating ? "#FF0000" : "#00AA00"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Tournaments</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading tournaments...</Text>
          </View>
        ) : (
          <FlatList
            data={allTournaments}
            renderItem={renderTournament}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  tournamentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  tournamentDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  toggleButton: {
    padding: 8,
  },
  addButton: {},
  removeButton: {},
});