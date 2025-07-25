import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TournamentJudgesSection from '../../components/TournamentJudgesSection';
import EventCompetitorSelectionModal from '../../components/EventCompetitorSelectionModal';

export default function EventDetail() {
  const { id, tournamentId, eventType } = useLocalSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Direct navigation without intermediate screens
    if (eventType === 'Traditional Forms') {
      router.replace(`/traditional-forms/${id}?tournamentId=${tournamentId}`);
      return;
    }
    if (eventType === 'Creative Forms') {
      router.replace(`/creative-forms/${id}?tournamentId=${tournamentId}`);
      return;
    }
    if (eventType === 'Extreme Forms') {
      router.replace(`/extreme-forms/${id}?tournamentId=${tournamentId}`);
      return;
    }
    
    // Animate in for other event types
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [eventType, id, tournamentId]);

  const handleCompetitorsAdded = () => {
    // Data is still accessible internally but we don't need to reload UI
    // since we're not displaying competitors anymore
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
    );
  }

  // For Forms events, router.replace should handle the navigation
  if (eventType === 'Traditional Forms' || eventType === 'Creative Forms' || eventType === 'Extreme Forms') {
    return null; // Don't render anything, let router.replace handle it
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{eventType}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.judgesWrapper}>
          <TournamentJudgesSection 
            tournamentId={tournamentId as string}
            showInfoBubble={true}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Management</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Competitors</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Use the "Add Competitors" button to assign competitors to this event.</Text>
            <Text style={styles.infoSubtext}>Competitor data is tracked internally for scoring and management.</Text>
          </View>
        </View>
      </ScrollView>

      <EventCompetitorSelectionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        tournamentId={tournamentId as string}
        eventId={id as string}
        eventType={eventType as string}
        onCompetitorsAdded={handleCompetitorsAdded}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000000', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  placeholder: { width: 24 },
  scrollContainer: { flex: 1 },
  judgesWrapper: { marginHorizontal: 16, marginTop: 16, marginBottom: 16 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#000000' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  infoContainer: { alignItems: 'center', paddingVertical: 24 },
  infoText: { fontSize: 16, color: '#666666', marginBottom: 8, textAlign: 'center' },
  infoSubtext: { fontSize: 14, color: '#999999', textAlign: 'center' }
});