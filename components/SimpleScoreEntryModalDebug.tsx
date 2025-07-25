import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { fetchEventParticipant } from '../app/lib/fetchEventParticipant';
import { refreshEventStateNoHome } from '../app/lib/refreshEventStateNoHome';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface SimpleScoreEntryModalDebugProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

export default function SimpleScoreEntryModalDebug({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalDebugProps) {
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
      
      console.log('🔍 [DEBUG] Starting score save process...');
      console.log('🔍 [DEBUG] Competitor:', competitor.name, 'ID:', competitor.id);
      console.log('🔍 [DEBUG] Event ID:', eventId);
      console.log('🔍 [DEBUG] Tournament ID:', tournamentId);
      
      // First, ensure event_participant exists
      const participantUpsertPayload = {
        event_id: eventId,
        tournament_competitor_id: competitor.id,
        tournament_id: tournamentId,
        event_type: 'traditional_forms'
      };
      
      console.log('🔍 [DEBUG] Upserting participant with payload:', participantUpsertPayload);
      
      const { error: participantError } = await supabase
        .from('event_participants')
        .upsert(participantUpsertPayload, {
          onConflict: ['event_id', 'tournament_competitor_id']
        });
      
      if (participantError) {
        console.error('❌ [DEBUG] Error adding participant:', participantError);
        Alert.alert('Error', 'Failed to add participant. Please try again.');
        return;
      }
      
      console.log('✅ [DEBUG] Participant upserted successfully');
      
      // Fetch the event_participant to get the correct ID
      console.log('🔍 [DEBUG] Fetching participant with eventId:', eventId, 'competitorId:', competitor.id);
      
      const participant = await fetchEventParticipant(eventId, competitor.id);
      
      console.log('✅ [DEBUG] Retrieved participant:', participant);
      console.log('✅ [DEBUG] Participant ID:', participant.id);
      
      // Prepare score insert payload
      const scorePayload = {
        event_id: eventId,
        tournament_competitor_id: competitor.id,
        event_participant_id: participant.id,
        judge_a_score: scoreA,
        judge_b_score: scoreB,
        judge_c_score: scoreC,
        total_score: totalScore,
        rank: 0
      };
      
      console.log('🔍 [DEBUG] Score payload before insert:', scorePayload);
      console.log('🔍 [DEBUG] CRITICAL: event_participant_id =', participant.id);
      
      // Insert/upsert score with correct event_participant_id
      const { error, data: insertedScore } = await supabase
        .from('event_scores')
        .upsert(scorePayload, {
          onConflict: ['event_id', 'tournament_competitor_id']
        })
        .select();
      
      if (error) {
        console.error('❌ [DEBUG] Error saving score:', error);
        Alert.alert('Error', 'Failed to save score. Please try again.');
        return;
      }
      
      console.log('✅ [DEBUG] Score saved successfully:', insertedScore);
      console.log('✅ [DEBUG] Inserted score event_participant_id:', insertedScore?.[0]?.event_participant_id);
      
      // Verify the score was saved correctly
      const { data: verifyScore } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id)
        .single();
      
      console.log('🔍 [DEBUG] Verification - Score in database:', verifyScore);
      console.log('🔍 [DEBUG] Verification - event_participant_id in DB:', verifyScore?.event_participant_id);
      
      // Refresh event state
      const refreshResult = await refreshEventStateNoHome(eventId);
      console.log('🔍 [DEBUG] Refresh result:', refreshResult);
      
      onScoreSaved();
      
    } catch (error) {
      console.error('❌ [DEBUG] Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 [DEBUG] Modal closing');
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor (DEBUG)</Text>
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