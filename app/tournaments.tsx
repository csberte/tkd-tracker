import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ActionButton from '../components/ActionButton';

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  events: number;
}

export default function Tournaments() {
  const [tournaments] = useState<Tournament[]>([
    {
      id: '1',
      name: 'Spring Championship',
      date: '2024-03-15',
      location: 'Downtown Arena',
      events: 5,
    },
    {
      id: '2',
      name: 'Regional Masters',
      date: '2024-04-20',
      location: 'Sports Complex',
      events: 8,
    },
  ]);

  const handleTournamentPress = (tournament: Tournament) => {
    Alert.alert('Tournament Details', `View ${tournament.name} details`);
  };

  const handleCreateTournament = () => {
    Alert.alert('Create Tournament', 'Feature coming soon!');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tournaments</Text>
        <Text style={styles.subtitle}>Manage your tournament schedule</Text>
      </View>

      <ActionButton title="Create New Tournament" onPress={handleCreateTournament} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Tournaments</Text>
        {tournaments.map((tournament) => (
          <View key={tournament.id} style={styles.tournamentCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={styles.eventCount}>{tournament.events} events</Text>
            </View>
            <Text style={styles.tournamentDate}>{tournament.date}</Text>
            <Text style={styles.tournamentLocation}>{tournament.location}</Text>
            <ActionButton
              title="View Details"
              variant="secondary"
              onPress={() => handleTournamentPress(tournament)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  eventCount: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
  },
  tournamentDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
});