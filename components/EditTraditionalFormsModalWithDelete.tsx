import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { sanitizeFinalRank } from '../app/lib/rankSanitizer';
import VideoManagementSectionFixed from './VideoManagementSectionFixed';
import DeleteEntryModal from './DeleteEntryModal';
import { StyleSheet } from 'react-native';

interface EditTraditionalFormsModalWithDeleteProps {
  visible: boolean;
  onClose?: () => void;
  selectedCompetitor?: any;
  eventId: string;
  tournamentId: string;
  onScoreUpdated?: () => void;
  onVideoStatusChanged?: (hasVideo: boolean) => void;
  scoreId?: string;
  competitorName?: string;
  competitorId?: string;
  competitorRank?: number;
}

export default function EditTraditionalFormsModalWithDelete({
  visible, onClose, selectedCompetitor, eventId, tournamentId, onScoreUpdated, onVideoStatusChanged,
  scoreId: legacyScoreId, competitorName: legacyCompetitorName, competitorId: legacyCompetitorId, competitorRank: legacyCompetitorRank
}: EditTraditionalFormsModalWithDeleteProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [scoreId, setScoreId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const competitorId = selectedCompetitor?.competitor_id || selectedCompetitor?.id || legacyCompetitorId || '';
  const competitorName = selectedCompetitor?.name || legacyCompetitorName || 'Unknown';
  const competitorRank = selectedCompetitor?.final_rank || selectedCompetitor?.rank || legacyCompetitorRank;
  const currentScoreId = legacyScoreId || scoreId;

  useEffect(() => {
    if (visible && (selectedCompetitor || legacyScoreId)) {
      loadScore();
    }
  }, [visible, selectedCompetitor, legacyScoreId]);

  const loadScore = async () => {
    try {
      const { data, error } = await supabase
        .from('event_scores')
        .select('id, judge_a_score, judge_b_score, judge_c_score')
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId)
        .single();

      if (error) {
        console.error('Error loading score:', error);
        return;
      }
      
      if (data) {
        setScoreId(data.id);
        setJudgeAScore(data.judge_a_score?.toString() || '');
        setJudgeBScore(data.judge_b_score?.toString() || '');
        setJudgeCScore(data.judge_c_score?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading score:', error);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    
    const a = parseFloat(judgeAScore) || 0;
    const b = parseFloat(judgeBScore) || 0;
    const c = parseFloat(judgeCScore) || 0;

    if (a < 0 || a > 9 || b < 0 || b > 9 || c < 0 || c > 9) {
      Alert.alert('Invalid Score', 'Scores must be between 0 and 9');
      return;
    }

    const updateScoreId = currentScoreId || scoreId;
    
    if (!updateScoreId) {
      Alert.alert('Error', 'Cannot save score - no score ID available.');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      const totalScore = a + b + c;
      
      const { data, error } = await supabase
        .from('event_scores')
        .update({
          judge_a_score: a,
          judge_b_score: b,
          judge_c_score: c,
          total_score: totalScore
        })
        .eq('id', updateScoreId)
        .select();

      if (error || !data || data.length === 0) {
        console.error('Score update failed:', error);
        setErrorMessage('Failed to update score. Please try again.');
        return;
      }
      
      await updateFinalRanks(eventId);
      
      if (typeof onScoreUpdated === 'function') {
        onScoreUpdated();
      }
      
      Alert.alert('Success', 'Score updated successfully');
      handleClose();
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Failed to update score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    setDeleteLoading(true);
    
    try {
      await supabase
        .from('videos')
        .delete()
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId);
      
      await supabase
        .from('event_scores')
        .delete()
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId);
      
      await supabase
        .from('event_participants')
        .delete()
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId);
      
      await updateFinalRanks(eventId);
      
      if (typeof onScoreUpdated === 'function') {
        onScoreUpdated();
      }
      
      setShowDeleteModal(false);
      handleClose();
      
      Alert.alert('Success', 'Entry deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setErrorMessage('');
    setShowDeleteModal(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const totalScore = (parseFloat(judgeAScore) || 0) + (parseFloat(judgeBScore) || 0) + (parseFloat(judgeCScore) || 0);
  const saveDisabled = !currentScoreId && !scoreId;

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.dragHandle} />
            
            <View style={styles.header}>
              <Text style={styles.title}>Edit Score</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.content}>
              <Text style={styles.competitorName}>{competitorName}</Text>
              
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
              
              <View style={styles.scoreSection}>
                <Text style={styles.sectionTitle}>Judge Scores</Text>
                <View style={styles.scoreInputRow}>
                  <View style={styles.scoreInputContainer}>
                    <Text style={styles.scoreLabel}>Judge A</Text>
                    <TextInput 
                      style={styles.scoreInput} 
                      value={judgeAScore} 
                      onChangeText={setJudgeAScore} 
                      keyboardType="number-pad" 
                      placeholder="0" 
                      maxLength={1} 
                    />
                  </View>
                  <View style={styles.scoreInputContainer}>
                    <Text style={styles.scoreLabel}>Judge B</Text>
                    <TextInput 
                      style={styles.scoreInput} 
                      value={judgeBScore} 
                      onChangeText={setJudgeBScore} 
                      keyboardType="number-pad" 
                      placeholder="0" 
                      maxLength={1} 
                    />
                  </View>
                  <View style={styles.scoreInputContainer}>
                    <Text style={styles.scoreLabel}>Judge C</Text>
                    <TextInput 
                      style={styles.scoreInput} 
                      value={judgeCScore} 
                      onChangeText={setJudgeCScore} 
                      keyboardType="number-pad" 
                      placeholder="0" 
                      maxLength={1} 
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.saveButton, (saveDisabled || loading) && styles.disabledButton]} 
                  onPress={handleSave} 
                  disabled={loading || saveDisabled}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.deleteButton]} 
                  onPress={() => setShowDeleteModal(true)}
                  disabled={loading || deleteLoading}
                >
                  <Text style={styles.deleteButtonText}>Delete Entry</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      
      <DeleteEntryModal 
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEntry}
        competitorName={competitorName}
        loading={deleteLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 18, fontWeight: '600', color: '#000000' },
  closeButton: { padding: 8 },
  content: { flex: 1, paddingHorizontal: 16 },
  competitorName: { fontSize: 20, fontWeight: '600', color: '#000000', marginVertical: 16, textAlign: 'center' },
  errorContainer: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#856404', fontSize: 14 },
  scoreSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 12 },
  scoreInputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  scoreInputContainer: { flex: 1, marginHorizontal: 4 },
  scoreLabel: { fontSize: 14, fontWeight: '500', color: '#666666', marginBottom: 4, textAlign: 'center' },
  scoreInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', backgroundColor: '#FFFFFF' },
  buttonContainer: { paddingVertical: 16, gap: 12 },
  button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  saveButton: { backgroundColor: '#007AFF' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF6B6B' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabledButton: { backgroundColor: '#CCCCCC' }
});