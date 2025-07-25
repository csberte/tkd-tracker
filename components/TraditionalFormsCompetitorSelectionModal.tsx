import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { useAuth } from './AuthProvider';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  school?: string;
  tournament_id?: string;
  source_type?: string;
}

interface TraditionalFormsCompetitorSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventId: string;
  onParticipantAdded: () => void;
  onCompetitorSelected: (competitor: Competitor) => void;
  availableCompetitors: Competitor[];
  ignoreTiebreaker?: boolean;
}

export default function TraditionalFormsCompetitorSelectionModal({
  visible,
  onClose,
  tournamentId,
  eventId,
  onParticipantAdded,
  onCompetitorSelected,
  availableCompetitors,
  ignoreTiebreaker = true
}: TraditionalFormsCompetitorSelectionModalProps) {
  const { user } = useAuth();
  const [filteredCompetitors, setFilteredCompetitors] = useState<Competitor[]>([]);
  const [modalInstanceKey, setModalInstanceKey] = useState(Date.now());
  const [eventParticipants, setEventParticipants] = useState<any[]>([]);
  const [champions, setChampions] = useState<any[]>([]);

  // Generate unique key each time modal opens to force full remount
  useEffect(() => {
    if (visible) {
      setModalInstanceKey(Date.now());
    }
  }, [visible]);

  // Load event participants and champions when modal opens
  useEffect(() => {
    if (visible && eventId && user) {
      loadEventParticipants();
      loadChampions();
    }
  }, [visible, eventId, user]);

  // Filter competitors based on event participants
  useEffect(() => {
    if (visible && availableCompetitors.length > 0) {
      const alreadyAddedIds = eventParticipants.map(p => p.tournament_competitor_id).filter(Boolean);
      console.log('Already added tournament_competitor_ids:', alreadyAddedIds);
      
      const filtered = availableCompetitors.filter(comp => {
        const isAlreadyAdded = alreadyAddedIds.includes(comp.id);
        console.log(`Competitor ${comp.name} (${comp.id}): ${isAlreadyAdded ? 'EXCLUDED' : 'INCLUDED'}`);
        return !isAlreadyAdded;
      });
      
      console.log(`Filtered ${filtered.length} competitors from ${availableCompetitors.length} available`);
      setFilteredCompetitors([...filtered]);
    } else {
      setFilteredCompetitors([]);
    }
  }, [availableCompetitors, eventParticipants, visible]);

  const loadEventParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      if (error) {
        console.error('Error loading event participants:', error);
        setEventParticipants([]);
      } else {
        console.log('Loaded event participants:', data?.length || 0);
        setEventParticipants(data || []);
      }
    } catch (error) {
      console.error('Exception loading event participants:', error);
      setEventParticipants([]);
    }
  };

  const loadChampions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('champions')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error loading champions:', error);
        setChampions([]);
      } else {
        console.log('Loaded champions for user:', data?.length || 0);
        setChampions(data || []);
      }
    } catch (error) {
      console.error('Exception loading champions:', error);
      setChampions([]);
    }
  };

  const handleCompetitorSelect = async (competitor: Competitor) => {
    onCompetitorSelected(competitor);
    onClose();
  };

  const renderCompetitor = ({ item }: { item: Competitor }) => {
    return (
      <TouchableOpacity
        style={styles.competitorItem}
        onPress={() => handleCompetitorSelect(item)}
      >
        <View style={styles.competitorInfo}>
          <Text style={styles.competitorName}>{item.name}</Text>
          {item.school && (
            <Text style={styles.competitorSchool}>{item.school}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666666" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View key={modalInstanceKey} style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Competitor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          {filteredCompetitors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No competitors available to add</Text>
              <Text style={styles.emptyMessage}>
                Everyone from your tournament list has already been added. To add someone new, go back to the main tournament screen and use the red "Add Competitor" button. They'll be available in every event.
              </Text>
            </View>
          ) : (
            <FlatList
              key={`${filteredCompetitors.map(c => c.id).join('-')}`}
              data={[...filteredCompetitors]}
              renderItem={renderCompetitor}
              keyExtractor={(item) => `${item.id}-${item.tournament_id || 'no-tournament'}-${item.source_type || 'no-source'}`}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  list: { maxHeight: 400 },
  competitorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  competitorInfo: { flex: 1 },
  competitorName: { fontSize: 16, fontWeight: '600', color: '#000000' },
  competitorSchool: { fontSize: 14, color: '#666666', marginTop: 2 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#000000', textAlign: 'center', marginBottom: 12 },
  emptyMessage: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20 }
});