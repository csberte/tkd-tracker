import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { fetchEventParticipant } from '../app/lib/fetchEventParticipant';
import { debugEventParticipant, debugScoreInsertion } from '../app/lib/debugEventParticipant';
import { refreshEventStateNoHomeFixed } from '../app/lib/refreshEventStateNoHomeFixed';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface SimpleScoreEntryModalUltimateDebugProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

export default function SimpleScoreEntryModalUltimateDebug({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalUltimateDebugProps) {
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
      
      console.log('🚀 [ULTIMATE DEBUG] ===== STARTING SCORE SAVE PROCESS =====');
      console.log('🚀 [ULTIMATE DEBUG] Competitor:', competitor.name, 'ID:', competitor.id);
      console.log('🚀 [ULTIMATE DEBUG] Event ID:', eventId);
      console.log('🚀 [ULTIMATE DEBUG] Tournament ID:', tournamentId);
      console.log('🚀 [ULTIMATE DEBUG] Scores:', { scoreA, scoreB, scoreC, totalScore });
      
      // STEP 1: Debug current state
      console.log('\n📊 [ULTIMATE DEBUG] STEP 1: Checking current state...');
      const debugResult = await debugEventParticipant(eventId, competitor.id);
      
      if (!debugResult.success) {
        console.error('❌ [ULTIMATE DEBUG] Debug failed:', debugResult.error);
        Alert.alert('Error', 'Failed to debug current state');
        return;
      }
      
      // STEP 2: Ensure participant exists
      console.log('\n👤 [ULTIMATE DEBUG] STEP 2: Ensuring participant exists...');
      const participantPayload = {
        event_id: eventId,
        tournament_competitor_id: competitor.id,
        tournament_id: tournamentId,
        event_type: 'traditional_forms'
      };
      
      console.log('👤 [ULTIMATE DEBUG] Participant payload:', participantPayload);
      
      const { error: participantError } = await supabase
        .from('event_participants')
        .upsert(participantPayload, {
          onConflict: ['event_id', 'tournament_competitor_id']
        });
      
      if (participantError) {
        console.error('❌ [ULTIMATE DEBUG] Error upserting participant:', participantError);
        Alert.alert('Error', 'Failed to create/update participant');
        return;
      }
      
      console.log('✅ [ULTIMATE DEBUG] Participant upserted successfully');
      
      // STEP 3: Fetch participant to get ID
      console.log('\n🔍 [ULTIMATE DEBUG] STEP 3: Fetching participant ID...');
      
      let participant;
      try {
        participant = await fetchEventParticipant(eventId, competitor.id);
        console.log('✅ [ULTIMATE DEBUG] Fetched participant:', participant);
        console.log('✅ [ULTIMATE DEBUG] Participant ID:', participant.id);
        console.log('✅ [ULTIMATE DEBUG] Participant ID type:', typeof participant.id);
      } catch (fetchError) {
        console.error('❌ [ULTIMATE DEBUG] Error fetching participant:', fetchError);
        Alert.alert('Error', 'Failed to fetch participant ID');
        return;
      }
      
      // STEP 4: Prepare score payload
      console.log('\n💾 [ULTIMATE DEBUG] STEP 4: Preparing score payload...');
      
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
      
      console.log('💾 [ULTIMATE DEBUG] Score payload:', scorePayload);
      console.log('💾 [ULTIMATE DEBUG] CRITICAL CHECK - event_participant_id:', scorePayload.event_participant_id);
      console.log('💾 [ULTIMATE DEBUG] CRITICAL CHECK - event_participant_id type:', typeof scorePayload.event_participant_id);
      
      if (scorePayload.event_participant_id === null || scorePayload.event_participant_id === undefined) {
        console.error('❌ [ULTIMATE DEBUG] CRITICAL ERROR: event_participant_id is null/undefined!');
        Alert.alert('Critical Error', 'event_participant_id is null/undefined');
        return;
      }
      
      // STEP 5: Insert score with debug
      console.log('\n🚀 [ULTIMATE DEBUG] STEP 5: Inserting score...');
      
      const insertResult = await debugScoreInsertion(scorePayload);
      
      if (!insertResult.success) {
        console.error('❌ [ULTIMATE DEBUG] Score insertion failed:', insertResult.error);
        Alert.alert('Error', 'Failed to save score');
        return;
      }
      
      console.log('✅ [ULTIMATE DEBUG] Score inserted successfully');
      
      // STEP 6: Verify the score was saved correctly
      console.log('\n🔍 [ULTIMATE DEBUG] STEP 6: Verifying saved score...');
      
      const { data: verifyScore, error: verifyError } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id)
        .single();
      
      if (verifyError) {
        console.error('❌ [ULTIMATE DEBUG] Error verifying score:', verifyError);
      } else {
        console.log('✅ [ULTIMATE DEBUG] Verified score in database:', verifyScore);
        console.log('✅ [ULTIMATE DEBUG] Verified event_participant_id:', verifyScore.event_participant_id);
        
        if (verifyScore.event_participant_id === null) {
          console.error('❌ [ULTIMATE DEBUG] CRITICAL: Verified score has NULL event_participant_id!');
        } else if (verifyScore.event_participant_id === participant.id) {
          console.log('✅ [ULTIMATE DEBUG] SUCCESS: event_participant_id matches!');
        } else {
          console.error('❌ [ULTIMATE DEBUG] MISMATCH: event_participant_id does not match!');
          console.error(`Expected: ${participant.id}, Got: ${verifyScore.event_participant_id}`);
        }
      }
      
      // STEP 7: Final debug check
      console.log('\n🔍 [ULTIMATE DEBUG] STEP 7: Final state check...');
      const finalDebugResult = await debugEventParticipant(eventId, competitor.id);
      
      if (finalDebugResult.success) {
        console.log('✅ [ULTIMATE DEBUG] Final state verified');
      } else {
        console.error('❌ [ULTIMATE DEBUG] Final state check failed:', finalDebugResult.error);
      }
      
      console.log('🏁 [ULTIMATE DEBUG] ===== SCORE SAVE PROCESS COMPLETE =====\n');
      
      // Refresh and close
      const refreshResult = await refreshEventStateNoHomeFixed(eventId);
      console.log('🔄 [ULTIMATE DEBUG] Refresh result:', refreshResult);
      
      onScoreSaved();
      
    } catch (error) {
      console.error('❌ [ULTIMATE DEBUG] Unexpected error:', error);
      Alert.alert('Error', 'Unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 [ULTIMATE DEBUG] Modal closing');
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor (ULTIMATE DEBUG)</Text>
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