import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { refreshEventStateNoHome } from '../app/lib/refreshEventStateNoHome';
import { sanitizeFinalRank } from '../app/lib/rankSanitizer';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface ScoreCompetitorModalFinalFixedProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

export default function ScoreCompetitorModalFinalFixed({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: ScoreCompetitorModalFinalFixedProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && competitor) {
      loadExistingScore();
    }
  }, [visible, competitor]);

  const loadExistingScore = async () => {
    try {
      setLoading(true);
      
      const { data: score, error } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id)
        .maybeSingle();
      
      if (error) {
        console.error('[ScoreModalFinalFixed] Error loading existing score:', error);
        return;
      }
      
      if (score) {
        setJudgeAScore(score.judge_a_score?.toString() || '');
        setJudgeBScore(score.judge_b_score?.toString() || '');
        setJudgeCScore(score.judge_c_score?.toString() || '');
      }
    } catch (error) {
      console.error('[ScoreModalFinalFixed] Error in loadExistingScore:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      console.log('[ScoreModalFinalFixed] 💾 Updating score for competitor:', competitor.name);
      
      // Ensure event_participants record exists with all required fields
      const { error: participantError } = await supabase
        .from('event_participants')
        .upsert({
          event_id: eventId,
          tournament_competitor_id: competitor.id,
          tournament_id: tournamentId,
          event_type: 'traditional_forms'
        }, {
          onConflict: ['event_id', 'tournament_competitor_id']
        });
      
      if (participantError) {
        console.error('[ScoreModalFinalFixed] ❌ Error ensuring participant:', participantError);
        Alert.alert('Error', 'Failed to update participant. Please try again.');
        return;
      }
      
      const { error } = await supabase
        .from('event_scores')
        .update({
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore
        })
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id);
      
      if (error) {
        console.error('[ScoreModalFinalFixed] ❌ Error updating score:', error);
        Alert.alert('Error', 'Failed to update score. Please try again.');
        return;
      }
      
      console.log('[ScoreModalFinalFixed] ✅ Score updated successfully');
      
      // Force refresh event state - NO HOME NAVIGATION
      console.log('[ScoreModalFinalFixed] 🔄 Refreshing event state...');
      const refreshResult = await refreshEventStateNoHome(eventId);
      console.log('[ScoreModalFinalFixed] Refresh result:', refreshResult);
      
      // Call parent callback
      onScoreSaved();
      
    } catch (error) {
      console.error('[ScoreModalFinalFixed] ❌ Error in handleSave:', error);
      Alert.alert('Error', 'Failed to update score. Please try again.');
      // CRITICAL: NO HOME NAVIGATION ON ERROR
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    console.log('[ScoreModalFinalFixed] 🚪 Modal closing - NO HOME NAVIGATION');
    onClose();
  };

  if (loading) {
    return (
      <ModalWrapper visible={visible} onClose={handleClose}>
        <View style={styles.modalContent}>
          <Text>Loading existing score...</Text>
        </View>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Score</Text>
          <TouchableOpacity onPress={handleClose}>
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
            onPress={handleClose}
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
              {saving ? 'Saving...' : 'Update Score'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}