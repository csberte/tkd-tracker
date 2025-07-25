import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';

interface DeleteCompetitorModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  competitorName: string;
  competitorId: string;
  eventId: string;
  deleting?: boolean;
}

export default function DeleteCompetitorModal({
  visible,
  onClose,
  onConfirm,
  competitorName,
  competitorId,
  eventId,
  deleting = false
}: DeleteCompetitorModalProps) {
  
  const handleDelete = async () => {
    try {
      console.log('[DeleteCompetitor] Starting deletion for:', { competitorId, eventId });
      
      // Delete from event_scores using tournament_competitor_id
      const { error: scoreDeleteError } = await supabase
        .from('event_scores')
        .delete()
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId);
      
      if (scoreDeleteError) {
        console.error('[DeleteCompetitor] Score deletion error:', scoreDeleteError);
        throw scoreDeleteError;
      }
      
      // Delete from event_participants using tournament_competitor_id
      const { error: participantDeleteError } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId);
      
      if (participantDeleteError) {
        console.error('[DeleteCompetitor] Participant deletion error:', participantDeleteError);
        throw participantDeleteError;
      }
      
      console.log('[DeleteCompetitor] Successfully deleted competitor from event');
      
      // Update final ranks after deletion
      await updateFinalRanks(eventId);
      
      onConfirm();
    } catch (error) {
      console.error('[DeleteCompetitor] Deletion failed:', error);
      Alert.alert('Error', `Failed to delete competitor: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Remove Competitor</Text>
            <Text style={styles.message}>
              Are you sure you want to remove {competitorName} from this event?
            </Text>
            <Text style={styles.warning}>
              This will delete their scores and remove them from the event.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.confirmButton, deleting && styles.disabledButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={[styles.confirmButtonText, deleting && styles.disabledText]}>
                  {deleting ? 'Removing...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  warning: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});