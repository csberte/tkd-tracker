import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  school?: string;
}

interface SimpleScoreEntryModalForNewCompetitorFixedProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  onScoreSubmitted: () => void;
}

export default function SimpleScoreEntryModalForNewCompetitorFixed({
  visible,
  onClose,
  competitor,
  eventId,
  onScoreSubmitted
}: SimpleScoreEntryModalForNewCompetitorFixedProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const scoreA = parseFloat(judgeAScore);
      const scoreB = parseFloat(judgeBScore);
      const scoreC = parseFloat(judgeCScore);
      
      if (isNaN(scoreA) || isNaN(scoreB) || isNaN(scoreC)) {
        Alert.alert('Error', 'Please enter valid scores for all judges');
        return;
      }
      
      if (scoreA < 0 || scoreA > 10 || scoreB < 0 || scoreB > 10 || scoreC < 0 || scoreC > 10) {
        Alert.alert('Error', 'Scores must be between 0 and 10');
        return;
      }
      
      const totalScore = scoreA + scoreB + scoreC;
      
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Creating event participant for competitor:', competitor.name);
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Event ID:', eventId);
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Competitor ID:', competitor.id);
      
      // First, add competitor to event_participants
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          tournament_competitor_id: competitor.id,
          event_type: 'traditional_forms'
        })
        .select()
        .single();
      
      if (participantError) {
        console.error('[SimpleScoreEntryModalForNewCompetitorFixed] Error adding participant:', participantError);
        Alert.alert('Error', `Failed to add competitor: ${participantError.message}`);
        return;
      }
      
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Successfully added competitor to event, participant ID:', participantData.id);
      
      // Then, insert score in event_scores table with event_participant_id
      const { error: scoreError } = await supabase
        .from('event_scores')
        .insert({
          event_id: eventId,
          tournament_competitor_id: competitor.id,
          event_participant_id: participantData.id,
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore,
          rank: 0
        });
      
      if (scoreError) {
        console.error('[SimpleScoreEntryModalForNewCompetitorFixed] Error saving score:', scoreError);
        Alert.alert('Error', 'Failed to save score. Please try again.');
        return;
      }
      
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Successfully saved score for new competitor');
      
      // Update final ranks immediately after saving score
      try {
        console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Updating final ranks for event:', eventId);
        await updateFinalRanks(eventId);
        console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Successfully updated final ranks');
      } catch (rankError) {
        console.error('[SimpleScoreEntryModalForNewCompetitorFixed] Error updating final ranks:', rankError);
        // Don't fail the whole operation if ranking fails
      }
      
      // Clear form
      setJudgeAScore('');
      setJudgeBScore('');
      setJudgeCScore('');
      
      console.log('[SimpleScoreEntryModalForNewCompetitorFixed] Calling onScoreSubmitted to refresh UI');
      onScoreSubmitted();
      
    } catch (error) {
      console.error('[SimpleScoreEntryModalForNewCompetitorFixed] Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setJudgeAScore('');
    setJudgeBScore('');
    setJudgeCScore('');
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={handleCancel}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score New Competitor</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.competitorName}>{competitor.name}</Text>
        
        <View style={styles.scoresContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.judgeLabel}>Judge A:</Text>
            <TextInput
              style={styles.scoreInput}
              value={judgeAScore}
              onChangeText={setJudgeAScore}
              placeholder="0.0"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          
          <View style={styles.scoreRow}>
            <Text style={styles.judgeLabel}>Judge B:</Text>
            <TextInput
              style={styles.scoreInput}
              value={judgeBScore}
              onChangeText={setJudgeBScore}
              placeholder="0.0"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          
          <View style={styles.scoreRow}>
            <Text style={styles.judgeLabel}>Judge C:</Text>
            <TextInput
              style={styles.scoreInput}
              value={judgeCScore}
              onChangeText={setJudgeCScore}
              placeholder="0.0"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Score'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}