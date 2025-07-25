import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';

interface TournamentCompetitor {
  id: string;
  name: string;
  type: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventType: string;
  onParticipantsUpdated: () => void;
}

export default function EventParticipantsModal({ visible, onClose, tournamentId, eventType, onParticipantsUpdated }: Props) {
  const [competitors, setCompetitors] = useState<TournamentCompetitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, tournamentId, eventType]);

  const loadData = async () => {
    try {
      const [competitorsRes, participantsRes] = await Promise.all([
        supabase
          .from('tournament_competitors')
          .select('*')
          .eq('tournament_id', tournamentId),
        supabase
          .from('event_participants')
          .select('competitor_id')
          .eq('tournament_id', tournamentId)
          .eq('event_type', eventType)
      ]);

      setCompetitors(competitorsRes.data || []);
      
      const existingParticipants = new Set(
        (participantsRes.data || []).map(p => p.competitor_id)
      );
      setSelectedCompetitors(existingParticipants);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const toggleCompetitor = (competitorId: string) => {
    const newSelected = new Set(selectedCompetitors);
    if (newSelected.has(competitorId)) {
      newSelected.delete(competitorId);
    } else {
      newSelected.add(competitorId);
    }
    setSelectedCompetitors(newSelected);
  };

  const saveParticipants = async () => {
    setLoading(true);
    try {
      // Delete existing participants for this event
      await supabase
        .from('event_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('event_type', eventType);

      // Insert new participants
      if (selectedCompetitors.size > 0) {
        const participantsToInsert = Array.from(selectedCompetitors).map(competitorId => ({
          tournament_id: tournamentId,
          competitor_id: competitorId,
          event_type: eventType
        }));

        const { error } = await supabase
          .from('event_participants')
          .insert(participantsToInsert);

        if (error) throw error;
      }

      onParticipantsUpdated();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save participants');
    } finally {
      setLoading(false);
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'Champion': return '🥋';
      case 'Competitor': return '🤺';
      case 'Other': return '👤';
      default: return '👤';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Participants to {eventType}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {competitors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No competitors added to tournament yet</Text>
            </View>
          ) : (
            competitors.map((competitor) => (
              <TouchableOpacity
                key={competitor.id}
                style={[
                  styles.competitorItem,
                  selectedCompetitors.has(competitor.id) && styles.selectedItem
                ]}
                onPress={() => toggleCompetitor(competitor.id)}
              >
                <View style={styles.competitorInfo}>
                  <Text style={styles.competitorName}>
                    {getTypeEmoji(competitor.type)} {competitor.name}
                  </Text>
                  <Text style={styles.competitorType}>{competitor.type}</Text>
                </View>
                <View style={styles.checkbox}>
                  {selectedCompetitors.has(competitor.id) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {competitors.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveParticipants}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : `Save (${selectedCompetitors.size} selected)`}
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  competitorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  competitorInfo: {
    flex: 1,
  },
  competitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  competitorType: {
    fontSize: 14,
    color: '#666666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});