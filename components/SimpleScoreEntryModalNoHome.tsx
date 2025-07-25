import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { refreshEventStateNoHome } from '../app/lib/refreshEventStateNoHome';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface SimpleScoreEntryModalNoHomeProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

export default function SimpleScoreEntryModalNoHome({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalNoHomeProps) {
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
      
      console.log('[SimpleScoreEntryNoHome] 💾 Saving score for competitor:', competitor.name);
      console.log('[SimpleScoreEntryNoHome] Using event_id:', eventId);
      
      // First, add to event_participants with ALL required fields including event_type
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
        console.error('[SimpleScoreEntryNoHome] ❌ Error adding participant:', participantError);
        Alert.alert('Error', 'Failed to add participant. Please try again.');
        return;
      }
      
      console.log('[SimpleScoreEntryNoHome] ✅ Participant added with event_id:', eventId);
      
      const { error } = await supabase
        .from('event_scores')
        .insert({
          event_id: eventId,
          tournament_competitor_id: competitor.id,
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore,
          rank: 0
        });
      
      if (error) {
        console.error('[SimpleScoreEntryNoHome] ❌ Error saving score:', error);
        Alert.alert('Error', 'Failed to save score. Please try again.');
        return;
      }
      
      console.log('[SimpleScoreEntryNoHome] ✅ Score saved successfully with event_id:', eventId);
      
      // Force refresh event state immediately - NO HOME NAVIGATION
      console.log('[SimpleScoreEntryNoHome] 🔄 Refreshing event state with event_id:', eventId);
      const refreshResult = await refreshEventStateNoHome(eventId);
      console.log('[SimpleScoreEntryNoHome] Refresh result:', refreshResult);
      
      // Call parent callback to update display immediately
      onScoreSaved();
      
    } catch (error) {
      console.error('[SimpleScoreEntryNoHome] ❌ Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
      // CRITICAL: NO HOME NAVIGATION ON ERROR
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    console.log('[SimpleScoreEntryNoHome] 🚪 Modal closing - NO HOME NAVIGATION');
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor</Text>
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
              {saving ? 'Saving...' : 'Save Score'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}