import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { addCompetitorsToEvent, updateFinalRanks } from '../app/lib/eventHelpers';
import ScoreCompetitorModal from './ScoreCompetitorModal';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  school?: string;
}

interface Event {
  id: string;
  name?: string;
  title?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventId: string;
  eventType: string;
  onCompetitorsAdded: () => void;
}

export default function EventCompetitorSelectionModal({ 
  visible, 
  onClose, 
  tournamentId, 
  eventId,
  eventType, 
  onCompetitorsAdded 
}: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
      loadEventData();
    }
  }, [visible]);

  const loadEventData = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, name, title')
        .eq('id', eventId)
        .single();
      
      if (data) {
        setEvent(data);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    }
  };

  const loadData = async () => {
    try {
      // FIX: Use tournament_competitors table
      const [competitorsRes, participantsRes] = await Promise.all([
        supabase.from('tournament_competitors').select('*').eq('tournament_id', tournamentId),
        supabase.from('event_participants').select('competitor_id').eq('event_id', eventId)
      ]);

      setCompetitors(competitorsRes.data || []);
      setExistingIds(new Set((participantsRes.data || []).map(p => p.competitor_id)));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const toggleSelection = (id: string) => {
    if (existingIds.has(id)) return;
    
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCompetitorPress = (competitor: Competitor) => {
    if (existingIds.has(competitor.id)) {
      // Open score modal for existing competitor
      setSelectedCompetitor(competitor);
      setShowScoreModal(true);
    } else {
      // Toggle selection for new competitor
      toggleSelection(competitor.id);
    }
  };

  const selectAll = () => {
    const availableIds = competitors.filter(c => !existingIds.has(c.id)).map(c => c.id);
    setSelectedIds(new Set(availableIds));
  };

  const removeAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const selectedArray = Array.from(selectedIds);
      
      // Check for existing entries
      const { data: currentExisting, error: checkError } = await supabase
        .from('event_participants')
        .select('competitor_id')
        .eq('event_id', eventId)
        .in('competitor_id', selectedArray);

      if (checkError) {
        console.error('Error checking existing entries:', checkError);
        Alert.alert('Error', 'Failed to add competitors');
        return;
      }

      const currentExistingIds = new Set(currentExisting?.map(e => e.competitor_id) || []);
      const newCompetitorIds = selectedArray.filter(id => !currentExistingIds.has(id));
      
      if (newCompetitorIds.length === 0) {
        Alert.alert('Info', '👉 All selected competitors are already added to this event.');
        onClose();
        setSelectedIds(new Set());
        return;
      }

      // Add competitors to event
      await addCompetitorsToEvent(eventId, newCompetitorIds, eventType);
      
      // Update final ranks but preserve tiebreaker results
      console.log('[EventCompetitorSelectionModal] Updating final ranks with tiebreaker preservation');
      await updateFinalRanks(eventId, true); // skipIfTiebreakerResolved = true
      
      if (currentExistingIds.size > 0) {
        Alert.alert('Info', '👉 Some competitors were already added and were skipped.');
      }
      onCompetitorsAdded();
      onClose();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to add competitors');
    } finally {
      setLoading(false);
    }
  };

  const renderCompetitor = ({ item }: { item: Competitor }) => {
    const isSelected = selectedIds.has(item.id);
    const isExisting = existingIds.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.competitorItem, isExisting && styles.existingItem]}
        onPress={() => handleCompetitorPress(item)}
      >
        <View style={styles.competitorInfo}>
          <Text style={[styles.competitorName, isExisting && styles.existingText]}>
            {item.name}
          </Text>
          {item.school && (
            <Text style={[styles.competitorSchool, isExisting && styles.existingText]}>
              {item.school}
            </Text>
          )}
          {isExisting && (
            <Text style={styles.existingLabel}>Already in event - Tap to score</Text>
          )}
        </View>
        <View style={[styles.checkbox, (isSelected || isExisting) && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          {isExisting && <Ionicons name="create-outline" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Competitors</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={selectAll}>
              <Text style={styles.controlButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={removeAll}>
              <Text style={styles.controlButtonText}>Remove All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={competitors}
            renderItem={renderCompetitor}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              Save ({selectedIds.size} selected)
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ScoreCompetitorModal
        visible={showScoreModal}
        onClose={() => {
          setShowScoreModal(false);
          setSelectedCompetitor(null);
        }}
        competitor={selectedCompetitor}
        eventId={eventId}
        tournamentId={tournamentId}
        event={event}
        onScoreSaved={() => {
          loadData();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  placeholder: { width: 24 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF', paddingVertical: 12, marginBottom: 1 },
  controlButton: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#007AFF', borderRadius: 8 },
  controlButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { flex: 1 },
  competitorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 1 },
  existingItem: { backgroundColor: '#F0F8FF' },
  competitorInfo: { flex: 1 },
  competitorName: { fontSize: 16, fontWeight: '600', color: '#000000' },
  competitorSchool: { fontSize: 14, color: '#666666', marginTop: 2 },
  existingText: { color: '#0066CC' },
  existingLabel: { fontSize: 12, color: '#0066CC', fontStyle: 'italic', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCCCCC', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  saveButton: { backgroundColor: '#007AFF', paddingVertical: 16, marginHorizontal: 16, marginBottom: 32, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});