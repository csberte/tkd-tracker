import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { sanitizeFinalRank } from '../app/lib/rankSanitizer';
import VideoManagementSectionFixed from './VideoManagementSectionFixed';
import { styles } from './EditTraditionalFormsModalFinalFixedStyles';

interface EditTraditionalFormsModalFinalFixedProps {
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

export default function EditTraditionalFormsModalFinalFixed({
  visible, onClose, selectedCompetitor, eventId, tournamentId, onScoreUpdated, onVideoStatusChanged,
  scoreId: legacyScoreId, competitorName: legacyCompetitorName, competitorId: legacyCompetitorId, competitorRank: legacyCompetitorRank
}: EditTraditionalFormsModalFinalFixedProps) {
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

  const handleDeletePress = () => {
    console.log('Delete button pressed');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const { error: scoresError } = await supabase
        .from('event_scores')
        .delete()
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId);

      if (scoresError) {
        console.error('Error deleting scores:', scoresError);
        Alert.alert('Error', 'Failed to delete entry. Please try again.');
        return;
      }

      const { error: participantsError } = await supabase
        .from('event_participants')
        .delete()
        .eq('tournament_competitor_id', competitorId)
        .eq('event_id', eventId);

      if (participantsError) {
        console.error('Error deleting participant:', participantsError);
      }

      await updateFinalRanks(eventId);
      
      if (typeof onScoreUpdated === 'function') {
        onScoreUpdated();
      }
      
      Alert.alert('Success', 'Entry deleted successfully');
      setShowDeleteModal(false);
      handleClose();
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
    } finally {
      setDeleteLoading(false);
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
    <Modal visible={visible} animationType="slide" transparent={true} presentationStyle="overFullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Edit Score</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
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
              <View style={styles.totalScoreContainer}>
                <Text style={styles.totalScoreLabel}>Total Score</Text>
                <Text style={styles.totalScoreValue}>{totalScore.toFixed(1)}</Text>
              </View>
            </View>
            
            <VideoManagementSectionFixed 
              competitorId={competitorId} 
              eventId={eventId} 
              tournamentId={tournamentId} 
              scoreId={currentScoreId} 
              competitorName={competitorName} 
              eventName="Traditional Forms" 
              totalScore={totalScore} 
              rank={sanitizeFinalRank(competitorRank)} 
              onVideoStatusChange={onVideoStatusChanged} 
            />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton, (saveDisabled || loading) && styles.disabledButton]} 
                onPress={handleSave} 
                disabled={loading || saveDisabled}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : saveDisabled ? 'Save Disabled' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showDeleteModal && (
            <View style={styles.overlay}>
              <View style={styles.modalContent}>
                <Text style={styles.deleteTitle}>Delete Entry?</Text>
                <Text style={styles.deleteMessage}>Are you sure you want to delete this score and video?</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    onPress={handleConfirmDelete}
                    disabled={deleteLoading}
                    accessibilityLabel="Delete Entry"
                  >
                    <Text style={styles.confirm}>
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                    <Text style={styles.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}