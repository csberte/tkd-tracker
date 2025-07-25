import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { validateEventId, getRealEventId } from '../app/lib/eventIdValidatorFixed';
import { fetchAvailableCompetitors } from '../app/lib/eventHelpersRest';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface TraditionalFormsCompetitorSelectionModalUltimateProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  eventId: string;
  onCompetitorAdded: (competitor: Competitor) => void;
}

export default function TraditionalFormsCompetitorSelectionModalUltimate({
  visible,
  onClose,
  tournamentId,
  eventId,
  onCompetitorAdded
}: TraditionalFormsCompetitorSelectionModalUltimateProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatedEventId, setValidatedEventId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && tournamentId) {
      console.log('🔍 [CompetitorSelectionModalUltimate] Modal opened, validating event_id:', eventId);
      initializeWithValidation();
    }
  }, [visible, tournamentId, eventId]);

  const initializeWithValidation = async () => {
    setLoading(true);
    setValidationError(null);
    
    try {
      if (!tournamentId || tournamentId === 'null' || tournamentId === 'undefined') {
        throw new Error('Invalid tournament ID');
      }

      let finalEventId = eventId;
      
      // Step 1: Validate the provided event ID
      if (eventId && eventId !== 'new') {
        console.log('[CompetitorSelectionModalUltimate] 🔍 Validating provided event_id:', eventId);
        
        const validation = await validateEventId(eventId);
        
        if (validation.valid) {
          finalEventId = eventId;
          console.log('[CompetitorSelectionModalUltimate] ✅ Event ID validated:', finalEventId);
        } else {
          console.log('[CompetitorSelectionModalUltimate] ❌ Event ID invalid:', validation.error);
          finalEventId = null;
        }
      }
      
      // Step 2: If no valid event ID, get real one from database
      if (!finalEventId) {
        console.log('[CompetitorSelectionModalUltimate] 🔍 Getting real event_id from database');
        finalEventId = await getRealEventId(tournamentId, 'traditional_forms');
        
        if (!finalEventId) {
          // Create new event if none exists with proper fields
          console.log('[CompetitorSelectionModalUltimate] 🆕 Creating new event with required fields');
          
          const { data: newEvent, error: createError } = await supabase
            .from('events')
            .insert({
              tournament_id: tournamentId,
              event_type: 'traditional_forms',
              name: 'Traditional Forms Event',
              date: new Date().toISOString(),
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (createError) {
            if (createError.message && createError.message.includes('duplicate key')) {
              // Try to get the existing event
              finalEventId = await getRealEventId(tournamentId, 'traditional_forms');
              if (!finalEventId) {
                throw new Error('Failed to create or find event');
              }
            } else {
              console.error('[CompetitorSelectionModalUltimate] ❌ Create error:', createError);
              throw createError;
            }
          } else {
            finalEventId = newEvent.id;
            console.log('[CompetitorSelectionModalUltimate] ✅ Created new event:', finalEventId);
          }
        }
      }
      
      // Step 3: Final validation
      const finalValidation = await validateEventId(finalEventId);
      
      if (!finalValidation.valid) {
        throw new Error(`Final event validation failed: ${finalValidation.error}`);
      }
      
      setValidatedEventId(finalEventId);
      
      // Step 4: Load competitors with validated event ID
      console.log('[CompetitorSelectionModalUltimate] 👥 Loading competitors with validated event_id:', finalEventId);
      
      const available = await fetchAvailableCompetitors(finalEventId, tournamentId);
      setCompetitors(available);
      
      console.log('[CompetitorSelectionModalUltimate] ✅ Competitors loaded:', available.length);
      
    } catch (error) {
      console.error('[CompetitorSelectionModalUltimate] ❌ Initialization error:', error.message);
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
      console.log('[CompetitorSelectionModalUltimate] 🎯 Adding competitor with validated event_id:', validatedEventId);
      console.log('[CompetitorSelectionModalUltimate] Competitor:', competitor.name, 'ID:', competitor.id);
      
      await ensureEventParticipant(validatedEventId, competitor.id, 'traditional_forms');

      console.log('[CompetitorSelectionModalUltimate] ✅ Competitor added successfully');
      onCompetitorAdded(competitor);
      
    } catch (error) {
      console.error('[CompetitorSelectionModalUltimate] ❌ Add competitor failed:', error.message);
      
      // Enhanced error handling for foreign key constraints
      if (error.message && error.message.includes('foreign key constraint')) {
        if (error.message.includes('event_id')) {
          Alert.alert('Error', `Invalid event ID detected: ${validatedEventId}. This event does not exist in the database.`);
          return;
        }
      }
      
      if (error.message && error.message.includes('already in this event')) {
        console.log('[CompetitorSelectionModalUltimate] ℹ️ Competitor already exists, proceeding');
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
                onPress={() => initializeWithValidation()}
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
              <Text style={{ fontSize: 12, color: '#666' }}>Using validated event_id: {validatedEventId}</Text>
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