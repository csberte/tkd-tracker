import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import ConfirmationModal from './ConfirmationModal';

const EVENT_TYPES = [
  'Traditional Forms',
  'Traditional Weapons',
  'Combat Sparring',
  'Traditional Sparring',
  'Creative Forms',
  'Creative Weapons',
  'Extreme Forms',
  'Extreme Weapons'
];

interface AssignToEventsModalProps {
  visible: boolean;
  onClose: () => void;
  competitor: {
    id: string;
    name: string;
    source_type: string;
  };
  tournamentId: string;
  onAssignmentsUpdated: () => void;
  onCompetitorDeleted?: () => void;
}

export default function AssignToEventsModal({
  visible,
  onClose,
  competitor,
  tournamentId,
  onAssignmentsUpdated,
  onCompetitorDeleted
}: AssignToEventsModalProps) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible && competitor) {
      loadCurrentAssignments();
    }
  }, [visible, competitor]);

  const loadCurrentAssignments = async () => {
    try {
      // FIX: Use competitor_id instead of tournament_competitor_id
      const { data } = await supabase
        .from('event_participants')
        .select('event_type')
        .eq('competitor_id', competitor.id);
      
      setSelectedEvents(data?.map(p => p.event_type) || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const toggleEvent = (eventType: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventType)
        ? prev.filter(e => e !== eventType)
        : [...prev, eventType]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing assignments
      await supabase
        .from('event_participants')
        .delete()
        .eq('competitor_id', competitor.id);

      if (selectedEvents.length > 0) {
        // FIX: Add proper logging and event_type field
        const assignments = selectedEvents.map(eventType => {
          console.log('Creating event_participant with:', {
            competitor_id: competitor.id,
            event_type: eventType,
            event_id: null // Will need actual event IDs for full implementation
          });
          
          return {
            competitor_id: competitor.id,
            event_type: eventType
          };
        });

        const { error } = await supabase
          .from('event_participants')
          .insert(assignments);

        if (error) throw error;
      }

      onAssignmentsUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      Alert.alert('Error', 'Failed to save event assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    console.log('Confirm delete called for competitor:', competitor.id, 'tournament:', tournamentId);
    setIsDeleting(true);
    
    try {
      // First delete event participants
      const { error: eventError } = await supabase
        .from('event_participants')
        .delete()
        .eq('competitor_id', competitor.id);

      if (eventError) {
        console.error('Error deleting event participants:', eventError);
      }

      // Then delete from tournament_competitors
      const { data, error: deleteError } = await supabase
        .from('tournament_competitors')
        .delete()
        .eq('id', competitor.id)
        .eq('tournament_id', tournamentId)
        .select();

      console.log('Delete result:', { data, error: deleteError });

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('Successfully deleted competitor from tournament');
      setShowDeleteModal(false);
      onClose();
      
      if (onCompetitorDeleted) {
        onCompetitorDeleted();
      }
      
    } catch (error) {
      console.error('Error deleting competitor:', error);
      Alert.alert('Error', 'Failed to remove competitor from tournament');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.title}>Assign to Event(s)</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <Text style={styles.subtitle}>{competitor.name}</Text>
          
          <ScrollView style={styles.content}>
            {EVENT_TYPES.map((eventType) => (
              <TouchableOpacity
                key={eventType}
                style={styles.eventRow}
                onPress={() => toggleEvent(eventType)}
              >
                <Text style={styles.eventText}>{eventType}</Text>
                <View style={[
                  styles.checkbox,
                  selectedEvents.includes(eventType) && styles.checkedBox
                ]}>
                  {selectedEvents.includes(eventType) && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showDeleteModal}
        onCancel={() => {
          console.log('Delete cancelled');
          setShowDeleteModal(false);
        }}
        onConfirm={handleConfirmDelete}
        title="Remove Competitor"
        message="Are you sure you want to remove this competitor from the tournament?"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  eventText: {
    fontSize: 16,
    color: '#000000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});