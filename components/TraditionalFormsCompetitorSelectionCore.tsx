import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { getOrCreateValidEventId, validateEventExists } from '../app/lib/eventValidationCore';
import { fetchAvailableCompetitors } from '../app/lib/eventHelpersRest';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface TraditionalFormsCompetitorSelectionCoreProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventId: string;
  onCompetitorAdded: (competitor: Competitor) => void;
}

export default function TraditionalFormsCompetitorSelectionCore({
  visible,
  onClose,
  tournamentId,
  eventId,
  onCompetitorAdded
}: TraditionalFormsCompetitorSelectionCoreProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatedEventId, setValidatedEventId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && tournamentId) {
      console.log('[CompetitorSelectionCore] Modal opened, validating event_id:', eventId);
      initializeWithCoreValidation();
    }
  }, [visible, tournamentId, eventId]);

  const initializeWithCoreValidation = async () => {
    setLoading(true);
    setValidationError(null);
    
    try {
      if (!tournamentId) {
        throw new Error('Invalid tournament ID');
      }

      let finalEventId: string | null = null;
      
      // Step 1: Validate provided event ID if exists
      if (eventId && eventId !== 'new') {
        console.log('[CompetitorSelectionCore] Validating provided event_id:', eventId);
        
        const validation = await validateEventExists(eventId);
        
        if (validation.valid) {
          finalEventId = eventId;
          console.log('[CompetitorSelectionCore] ✅ Event ID validated:', finalEventId);
        } else {
          console.log('[CompetitorSelectionCore] ❌ Event ID invalid:', validation.error);
        }
      }
      
      // Step 2: Get or create valid event ID
      if (!finalEventId) {
        console.log('[CompetitorSelectionCore] Getting or creating valid event_id');
        finalEventId = await getOrCreateValidEventId(tournamentId, 'traditional_forms');
        
        if (!finalEventId) {
          throw new Error('Failed to get or create valid event ID');
        }
      }
      
      // Step 3: Final validation
      const finalValidation = await validateEventExists(finalEventId);
      
      if (!finalValidation.valid) {
        throw new Error(`Final event validation failed: ${finalValidation.error}`);
      }
      
      setValidatedEventId(finalEventId);
      
      // Step 4: Load competitors with validated event ID
      console.log('[CompetitorSelectionCore] Loading competitors with validated event_id:', finalEventId);
      
      const available = await fetchAvailableCompetitors(finalEventId, tournamentId);
      setCompetitors(available);
      
      console.log('[CompetitorSelectionCore] ✅ Competitors loaded:', available.length);
      
    } catch (error) {
      console.error('[CompetitorSelectionCore] ❌ Initialization error:', error.message);
      setValidationError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitorSelect = async (competitor: Competitor) => {
    if (!validatedEventId) {
      Alert.alert('Error', 'Invalid event ID - cannot add competitor');
      return;
    }
    
    try {
      console.log('[CompetitorSelectionCore] Adding competitor with validated event_id:', validatedEventId);
      console.log('[CompetitorSelectionCore] Competitor:', competitor.name, 'ID:', competitor.id);
      
      await ensureEventParticipant(validatedEventId, competitor.id, 'traditional_forms');

      console.log('[CompetitorSelectionCore] ✅ Competitor added successfully');
      onCompetitorAdded(competitor);
      
    } catch (error) {
      console.error('[CompetitorSelectionCore] ❌ Add competitor failed:', error.message);
      
      if (error.message && error.message.includes('foreign key constraint')) {
        if (error.message.includes('event_id')) {
          Alert.alert('Error', `Invalid event ID: ${validatedEventId}. Event does not exist in database.`);
          return;
        }
      }
      
      if (error.message && error.message.includes('already in this event')) {
        console.log('[CompetitorSelectionCore] Competitor already exists, proceeding');
        onCompetitorAdded(competitor);
      } else {
        Alert.alert('Error', `Failed to add competitor: ${error.message}`);
      }
    }
  };

  const renderCompetitor = ({ item }: { item: Competitor }) => {
    return (
      <TouchableOpacity
        style={styles.competitorItem}
        onPress={() => handleCompetitorSelect(item)}
      >
        <View style={styles.competitorInfo}>
          <Text style={styles.competitorName}>{item.name}</Text>
          <Text style={styles.competitorType}>{item.source_type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666666" />
      </TouchableOpacity>
    );
  };

  if (validationError) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Event Validation Error</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Cannot load competitors</Text>
              <Text style={styles.emptySubtext}>{validationError}</Text>
              <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 10 }}>
                Event ID: {eventId}
              </Text>
              <TouchableOpacity 
                style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 5 }}
                onPress={() => initializeWithCoreValidation()}
              >
                <Text style={{ color: 'white', textAlign: 'center' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

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
          
          {validatedEventId && (
            <View style={{ backgroundColor: '#f0f0f0', padding: 10, margin: 10, borderRadius: 5 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Validated Event ID: {validatedEventId}</Text>
            </View>
          )}

          {loading ? (
            <Text style={styles.loadingText}>Validating event and loading competitors...</Text>
          ) : competitors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No competitors available</Text>
              <Text style={styles.emptySubtext}>Add competitors to the tournament first</Text>
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
  competitorType: { fontSize: 14, color: '#666666', marginTop: 2 },
  loadingText: { padding: 40, textAlign: 'center', color: '#666666' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#666666', fontSize: 16, fontWeight: '600' },
  emptySubtext: { textAlign: 'center', color: '#999999', fontSize: 14, marginTop: 8 }
});