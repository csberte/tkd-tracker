import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { useTutorial } from '../../components/TutorialProvider';
import AnimatedChampionCard from '../../components/AnimatedChampionCard';
import ActionButton from '../../components/ActionButton';
import AddChampionModal from '../../components/AddChampionModal';
import AnimatedTabScreen from '../../components/AnimatedTabScreen';
import TestScrollViewScreen from '../../components/TestScrollViewScreen';
import { HomeTutorial } from '../../components/HomeTutorial';
import { supabase } from '../lib/supabase';

interface Champion {
  id: string;
  name: string;
  location?: string;
  school?: string;
  wins: number;
  losses: number;
  avatar?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
}

export default function HomeTab() {
  const { user } = useAuth();
  const { registerButtonRef } = useTutorial();
  const router = useRouter();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingChampions, setLoadingChampions] = useState(false);
  const [showAddChampionModal, setShowAddChampionModal] = useState(false);
  const [showTestScreen, setShowTestScreen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  
  // Ref for Add Champion button (Step 2)
  const addChampionButtonRef = useRef(null);

  // REMOVED: All tutorial-related logic from useFocusEffect
  // Tutorial initialization now happens ONLY in TutorialProvider
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadChampions();
        loadEvents();
      }
    }, [user])
  );

  // Register button ref for tutorial step 2
  useEffect(() => {
    if (addChampionButtonRef.current) {
      registerButtonRef(2, addChampionButtonRef);
    }
  }, [registerButtonRef]);

  const loadChampions = async () => {
    if (!user) return;
    
    console.log('Loading champions for user:', user.id);
    setLoadingChampions(true);
    try {
      const { data, error } = await supabase
        .from('champions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error loading champions:', error);
      } else {
        console.log('Champions loaded:', data?.length || 0);
        setChampions(data || []);
        setDataVersion(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading champions:', error);
    } finally {
      setLoadingChampions(false);
    }
  };

  const loadEvents = async () => {
    if (!user) return;
    
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(3);
      
      if (error) {
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleChampionPress = (champion: Champion) => {
    router.push(`/champion/${champion.id}`);
  };

  const handleAddChampion = () => {
    setShowAddChampionModal(true);
  };

  const handleChampionAdded = async () => {
    console.log('Champion added, refreshing list...');
    await loadChampions();
    console.log('Champions list refreshed');
  };

  if (showTestScreen) {
    return <TestScrollViewScreen />;
  }

  return (
    <AnimatedTabScreen direction="right">
      <HomeTutorial />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>

        {/* Moved Add Champion button to top with ref for tutorial */}
        <View style={styles.topButtonContainer}>
          <View ref={addChampionButtonRef}>
            <ActionButton title="Add New Champion" onPress={handleAddChampion} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Champions</Text>
          {loadingChampions ? (
            <Text style={styles.loadingText}>Loading champions...</Text>
          ) : champions.length > 0 ? (
            champions.map((champion, index) => (
              <AnimatedChampionCard
                key={`${champion.id}-${dataVersion}`}
                champion={{
                  id: champion.id,
                  name: champion.name,
                  belt: champion.school || 'Unknown School',
                  wins: champion.wins,
                  losses: champion.losses,
                  avatar: champion.avatar
                }}
                index={index}
                onPress={() => handleChampionPress(champion)}
              />
            ))
          ) : (
            <Text style={styles.noChampionsText}>No champions found</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loadingEvents ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : events.length > 0 ? (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventLocation}>{event.location}</Text>
                <Text style={styles.eventDate}>
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noEventsText}>No recent activity</Text>
          )}
        </View>

        <AddChampionModal
          visible={showAddChampionModal}
          onClose={() => setShowAddChampionModal(false)}
          onSuccess={handleChampionAdded}
          refreshChampions={loadChampions}
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
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  topButtonContainer: {
    marginTop: 16,
    marginHorizontal: 16,
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
  noChampionsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
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
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
  },
  noEventsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});