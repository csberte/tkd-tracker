import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ActionButton from '../components/ActionButton';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  tournament: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export default function Events() {
  const [events] = useState<Event[]>([
    {
      id: '1',
      name: 'Forms Competition',
      date: '2024-03-15',
      time: '10:00 AM',
      location: 'Main Arena',
      tournament: 'Spring Championship',
      status: 'upcoming',
    },
    {
      id: '2',
      name: 'Sparring Finals',
      date: '2024-03-15',
      time: '2:00 PM',
      location: 'Ring 1',
      tournament: 'Spring Championship',
      status: 'upcoming',
    },
  ]);

  const handleEventPress = (event: Event) => {
    Alert.alert('Event Details', `View ${event.name} details`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#FF0000';
      case 'ongoing': return '#FFA500';
      case 'completed': return '#008000';
      default: return '#666666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events Calendar</Text>
        <Text style={styles.subtitle}>Track upcoming tournament schedules</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {events.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={[styles.status, { color: getStatusColor(event.status) }]}>
                {event.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.tournament}>{event.tournament}</Text>
            <View style={styles.eventDetails}>
              <Text style={styles.detail}>{event.date} at {event.time}</Text>
              <Text style={styles.detail}>{event.location}</Text>
            </View>
            <ActionButton
              title="View Details"
              variant="secondary"
              onPress={() => handleEventPress(event)}
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
  eventCard: {
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
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournament: {
    fontSize: 16,
    color: '#FF0000',
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
});