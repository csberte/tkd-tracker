import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { sanitizeFinalRank } from '../app/lib/rankSanitizer';
import ModalWrapper from './ModalWrapper';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  tournament_competitors?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface SimpleScoreEntryModalFinalFixedProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  onScoreSubmitted: () => void;
}

export default function SimpleScoreEntryModalFinalFixed({
  visible,
  onClose,
  competitor,
  eventId,
  onScoreSubmitted
}: SimpleScoreEntryModalFinalFixedProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);

  const getCompetitorInfo = () => {
    if (competitor.tournament_competitors) {
      return {
        id: competitor.tournament_competitor_id || competitor.id,
        name: competitor.tournament_competitors.name,
        avatar: competitor.tournament_competitors.avatar
      };
    }
    return {
      id: competitor.id,
      name: competitor.name,
      avatar: competitor.avatar
    };
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
      const competitorInfo = getCompetitorInfo();
      
      // Get tournament_id from event
      const { data: eventData } = await supabase
        .from('events')
        .select('tournament_id')
        .eq('id', eventId)
        .single();
      
      if (!eventData) {
        Alert.alert('Error', 'Failed to get tournament information');
        return;
      }
      
      // Insert or update score in event_scores table using upsert with onConflict
      const { error } = await supabase
        .from('event_scores')
        .upsert({
          event_id: eventId,
          tournament_id: eventData.tournament_id,
          tournament_competitor_id: competitorInfo.id,
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore,
          rank: 0, // Temporary rank, will be updated by updateFinalRanks
          final_rank: 0 // Will be updated as integer by updateFinalRanks
        }, {
          onConflict: ['event_id', 'tournament_competitor_id']
        });
      
      if (error) {
        console.error('[SimpleScoreEntry] Error saving score:', error);
        Alert.alert('Error', 'Failed to save score. Please try again.');
        return;
      }
      
      // Update all final ranks and points for this event
      await updateFinalRanks(eventId);
      
      onScoreSubmitted();
      onClose();
      
    } catch (error) {
      console.error('[SimpleScoreEntry] Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const competitorInfo = getCompetitorInfo();

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.competitorName}>{competitorInfo.name}</Text>
        
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