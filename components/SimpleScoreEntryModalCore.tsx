import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { validateEventExists } from '../app/lib/eventValidationCore';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface SimpleScoreEntryModalCoreProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

export default function SimpleScoreEntryModalCore({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalCoreProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [validatedEventId, setValidatedEventId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && eventId) {
      validateEventIdCore();
    }
  }, [visible, eventId]);

  const validateEventIdCore = async () => {
    try {
      console.log('[SimpleScoreEntryCore] Validating event_id:', eventId);
      
      const validation = await validateEventExists(eventId);
      
      if (validation.valid) {
        setValidatedEventId(eventId);
        setValidationError(null);
        console.log('[SimpleScoreEntryCore] ✅ Event validated:', eventId);
      } else {
        setValidatedEventId(null);
        setValidationError(validation.error || 'Invalid event ID');
        console.error('[SimpleScoreEntryCore] ❌ Event validation failed:', validation.error);
      }
    } catch (error) {
      console.error('[SimpleScoreEntryCore] ❌ Validation error:', error);
      setValidatedEventId(null);
      setValidationError('Failed to validate event ID');
    }
  };

  const handleSave = async () => {
    if (!validatedEventId) {
      Alert.alert('Error', 'Invalid event ID. Cannot save score.');
      return;
    }

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
      
      console.log('[SimpleScoreEntryCore] Saving score with validated event_id:', validatedEventId);
      
      // Add to event_participants with validated event_id
      const { error: participantError } = await supabase
        .from('event_participants')
        .upsert({
          event_id: validatedEventId,
          tournament_competitor_id: competitor.id,
          tournament_id: tournamentId,
          event_type: 'traditional_forms'
        }, {
          onConflict: ['event_id', 'tournament_competitor_id']
        });
      
      if (participantError) {
        console.error('[SimpleScoreEntryCore] ❌ Participant error:', participantError);
        
        if (participantError.message && participantError.message.includes('foreign key constraint')) {
          Alert.alert('Error', `Invalid event ID: ${validatedEventId}. Event does not exist in database.`);
          return;
        }
        
        Alert.alert('Error', `Failed to add participant: ${participantError.message}`);
        return;
      }
      
      // Save the score
      const { error: scoreError } = await supabase
        .from('event_scores')
        .insert({
          event_id: validatedEventId,
          tournament_competitor_id: competitor.id,
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore,
          rank: 0
        });
      
      if (scoreError) {
        console.error('[SimpleScoreEntryCore] ❌ Score error:', scoreError);
        
        if (scoreError.message && scoreError.message.includes('foreign key constraint')) {
          Alert.alert('Error', `Invalid event ID: ${validatedEventId}. Event does not exist in database.`);
          return;
        }
        
        Alert.alert('Error', `Failed to save score: ${scoreError.message}`);
        return;
      }
      
      console.log('[SimpleScoreEntryCore] ✅ Score saved successfully');
      onScoreSaved();
      
    } catch (error) {
      console.error('[SimpleScoreEntryCore] ❌ Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (validationError) {
    return (
      <ModalWrapper visible={visible} onClose={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Validation Error</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.competitorName}>Cannot score competitor</Text>
          <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
            {validationError}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            Event ID: {eventId}
          </Text>
          
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.competitorName}>{competitor.name}</Text>
        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 10 }}>
          Validated Event ID: {validatedEventId || 'Validating...'}
        </Text>
        
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
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, (saving || !validatedEventId) && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || !validatedEventId}
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