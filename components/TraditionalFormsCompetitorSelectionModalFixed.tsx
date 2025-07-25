import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  school?: string;
}

interface TraditionalFormsCompetitorSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventId: string;
  onParticipantAdded: () => void;
  onCompetitorSelected: (competitor: Competitor) => void;
}

export default function TraditionalFormsCompetitorSelectionModalFixed({
  visible,
  onClose,
  tournamentId,
  eventId,
  onParticipantAdded,
  onCompetitorSelected
}: TraditionalFormsCompetitorSelectionModalProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && tournamentId && eventId) {
      loadAvailableCompetitors();
    }
  }, [visible, tournamentId, eventId]);

  const loadAvailableCompetitors = async () => {
    setLoading(true);
    try {
      console.log('[CompetitorSelectionFixed] Loading competitors for tournament:', tournamentId, 'event:', eventId);
      
      // Get all tournament competitors
      const { data: allCompetitors, error: competitorsError } = await supabase
        .from('tournament_competitors')
        .select('*')
        .eq('tournament_id', tournamentId);
      
      console.log('[CompetitorSelectionFixed] All competitors:', allCompetitors);
      
      if (competitorsError) {
        console.error('[CompetitorSelectionFixed] Error loading competitors:', competitorsError);
        Alert.alert('Error', 'Failed to load tournament competitors');
        return;
      }
      
      // Get existing participants for this specific event
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('event_participants')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      console.log('[CompetitorSelectionFixed] Existing participants for event:', existingParticipants);
      
      if (participantsError) {
        console.error('[CompetitorSelectionFixed] Error loading existing participants:', participantsError);
        Alert.alert('Error', 'Failed to load existing participants');
        return;
      }
      
      // Also check event_scores table for competitors already scored
      const { data: existingScores, error: scoresError } = await supabase
        .from('event_scores')
        .select('tournament_competitor_id')
        .eq('event_id', eventId);
      
      console.log('[CompetitorSelectionFixed] Existing scores for event:', existingScores);
      
      if (scoresError) {
        console.error('[CompetitorSelectionFixed] Error loading existing scores:', scoresError);
      }
      
      // Create a set of all competitor IDs that are already in this event
      const existingParticipantIds = new Set(existingParticipants?.map(p => p.tournament_competitor_id) || []);
      const existingScoreIds = new Set(existingScores?.map(s => s.tournament_competitor_id) || []);
      const allExistingIds = new Set([...existingParticipantIds, ...existingScoreIds]);
      
      console.log('[CompetitorSelectionFixed] All existing IDs:', Array.from(allExistingIds));
      
      // Filter out competitors who are already participants or have scores
      const available = (allCompetitors || []).filter(c => {
        const isAlreadyAdded = allExistingIds.has(c.id);
        console.log(`[CompetitorSelectionFixed] Competitor ${c.name} (${c.id}): already added = ${isAlreadyAdded}`);
        return !isAlreadyAdded;
      });
      
      console.log('[CompetitorSelectionFixed] Available competitors:', available);
      setCompetitors(available);
    } catch (error) {
      console.error('[CompetitorSelectionFixed] Error loading available competitors:', error);
      Alert.alert('Error', 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitorSelect = async (competitor: Competitor) => {
    console.log('[CompetitorSelectionFixed] Competitor selected:', competitor.name);
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
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Competitor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading competitors...</Text>
          ) : competitors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No competitors available</Text>
              <Text style={styles.emptySubtext}>All tournament competitors have been added to this event</Text>
            </View>
          ) : (
            <FlatList
              data={competitors}
              renderItem={renderCompetitor}
              keyExtractor={(item) => item.id}
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
  loadingText: { padding: 40, textAlign: 'center', color: '#666666' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#666666', fontSize: 16, fontWeight: '600' },
  emptySubtext: { textAlign: 'center', color: '#999999', fontSize: 14, marginTop: 8 }
});