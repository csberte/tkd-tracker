import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { autoRankCalculator } from '../app/lib/autoRankCalculator';
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

interface SimpleScoreEntryModalUltimateFixedProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  onScoreSubmitted: () => void;
}

export default function SimpleScoreEntryModalUltimateFixed({
  visible,
  onClose,
  competitor,
  eventId,
  onScoreSubmitted
}: SimpleScoreEntryModalUltimateFixedProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);
  const judgeARef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Reset scores when modal opens
      setJudgeAScore('');
      setJudgeBScore('');
      setJudgeCScore('');
      setErrorMessage('');
      
      // Focus Judge B after a short delay
      setTimeout(() => {
        judgeBRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleScoreChange = (value: string, judge: 'A' | 'B' | 'C') => {
    // Only allow whole numbers 0-9
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length > 1) return; // Only single digit
    
    const numValue = parseInt(sanitized);
    if (sanitized !== '' && (isNaN(numValue) || numValue < 0 || numValue > 9)) {
      return;
    }
    
    switch (judge) {
      case 'A':
        setJudgeAScore(sanitized);
        break;
      case 'B':
        setJudgeBScore(sanitized);
        // Auto-advance to Judge C
        if (sanitized !== '') {
          setTimeout(() => judgeCRef.current?.focus(), 50);
        }
        break;
      case 'C':
        setJudgeCScore(sanitized);
        // Auto-advance to Judge A
        if (sanitized !== '') {
          setTimeout(() => judgeARef.current?.focus(), 50);
        }
        break;
    }
  };

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
      setErrorMessage('');
      
      console.log('[SimpleScoreEntry] Starting save process for eventId:', eventId);
      
      const scoreA = parseInt(judgeAScore);
      const scoreB = parseInt(judgeBScore);
      const scoreC = parseInt(judgeCScore);
      
      if (isNaN(scoreA) || isNaN(scoreB) || isNaN(scoreC)) {
        Alert.alert('Error', 'Please enter scores for all judges');
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
      
      console.log('[SimpleScoreEntry] Event data validated, inserting score...');
      
      // Ensure event participant exists with correct tournament_competitor_id
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .upsert({
          event_id: eventId,
          tournament_competitor_id: competitorInfo.id,
          event_type: 'traditional_forms'
        }, {
          onConflict: ['event_id', 'tournament_competitor_id']
        })
        .select();
      
      if (participantError) {
        console.error('Error ensuring event participant:', participantError);
        setErrorMessage('Failed to add competitor to event. Please try again.');
        return;
      }
      
      // Insert or update score in event_scores table
      const scoreData = {
        event_id: eventId,
        tournament_id: eventData.tournament_id,
        tournament_competitor_id: competitorInfo.id,
        judge_a_score: scoreA,
        judge_b_score: scoreB,
        judge_c_score: scoreC,
        total_score: totalScore,
        rank: 0,
        final_rank: 0
      };
      
      console.log('[SimpleScoreEntry] Inserting score data:', scoreData);
      
      const { data, error } = await supabase
        .from('event_scores')
        .upsert(scoreData, {
          onConflict: ['event_id', 'tournament_competitor_id']
        })
        .select();
      
      if (error || !data || data.length === 0) {
        console.error('Error saving score:', error);
        setErrorMessage('Failed to save score. Please try again.');
        return;
      }
      
      console.log('[SimpleScoreEntry] Score saved successfully, triggering auto-rank calculation...');
      
      // CRITICAL FIX: Ensure autoRankCalculator runs after score insertion
      try {
        await autoRankCalculator(eventId);
        console.log('[SimpleScoreEntry] Auto-ranking completed successfully');
      } catch (rankError) {
        console.error('[SimpleScoreEntry] Auto-ranking failed:', rankError);
        // Don't fail the entire operation if ranking fails
      }
      
      onScoreSubmitted();
      onClose();
      
    } catch (error) {
      console.error('Error in handleSave:', error);
      setErrorMessage('Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const competitorInfo = getCompetitorInfo();

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <SafeAreaView style={[styles.modalContent, { marginTop: insets.top + 8 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score Competitor</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.competitorName}>{competitorInfo.name}</Text>
        
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        
        <View style={styles.horizontalScoresContainer}>
          <View style={styles.judgeInputGroup}>
            <Text style={styles.judgeLabel}>Judge B</Text>
            <TextInput
              ref={judgeBRef}
              style={[styles.scoreInput, judgeBScore && styles.scoreInputFocused]}
              value={judgeBScore}
              onChangeText={(value) => handleScoreChange(value, 'B')}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          </View>
          
          <View style={styles.judgeInputGroup}>
            <Text style={styles.judgeLabel}>Judge C</Text>
            <TextInput
              ref={judgeCRef}
              style={[styles.scoreInput, judgeCScore && styles.scoreInputFocused]}
              value={judgeCScore}
              onChangeText={(value) => handleScoreChange(value, 'C')}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          </View>
          
          <View style={styles.judgeInputGroup}>
            <Text style={styles.judgeLabel}>Judge A</Text>
            <TextInput
              ref={judgeARef}
              style={[styles.scoreInput, judgeAScore && styles.scoreInputFocused]}
              value={judgeAScore}
              onChangeText={(value) => handleScoreChange(value, 'A')}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
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
      </SafeAreaView>
    </ModalWrapper>
  );
}
