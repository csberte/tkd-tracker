import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest2EnhancedSeasonalPoints';

interface Props {
  visible: boolean;
  onClose: () => void;
  competitor: any;
  eventId: string;
  onScoreSubmitted: () => void;
  useSeasonalPoints?: boolean;
}

export default function SimpleScoreEntryModalEnhanced({
  visible, onClose, competitor, eventId, onScoreSubmitted, useSeasonalPoints = false
}: Props) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ judgeA: '', judgeB: '', judgeC: '' });
  
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);
  const judgeARef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setJudgeAScore('');
      setJudgeBScore('');
      setJudgeCScore('');
      setErrors({ judgeA: '', judgeB: '', judgeC: '' });
    }
  }, [visible]);

  const validateScore = (value: string): { isValid: boolean; error: string } => {
    if (value === '') return { isValid: true, error: '' };
    
    const num = parseInt(value);
    if (isNaN(num) || value.includes('.') || num < 0 || num > 9) {
      return { isValid: false, error: 'Must be whole number from 0 to 9' };
    }
    return { isValid: true, error: '' };
  };

  const handleScoreChange = (value: string, judge: 'A' | 'B' | 'C') => {
    const validation = validateScore(value);
    
    if (judge === 'A') {
      setJudgeAScore(value);
      setErrors(prev => ({ ...prev, judgeA: validation.error }));
    } else if (judge === 'B') {
      setJudgeBScore(value);
      setErrors(prev => ({ ...prev, judgeB: validation.error }));
      // Auto-advance to Judge C after valid input
      if (validation.isValid && value !== '' && judgeCRef.current) {
        judgeCRef.current.focus();
      }
    } else {
      setJudgeCScore(value);
      setErrors(prev => ({ ...prev, judgeC: validation.error }));
      // Auto-advance to Judge A after valid input
      if (validation.isValid && value !== '' && judgeARef.current) {
        judgeARef.current.focus();
      }
    }
  };

  const handleSubmit = async () => {
    const scoreA = parseInt(judgeAScore);
    const scoreB = parseInt(judgeBScore);
    const scoreC = parseInt(judgeCScore);

    if (isNaN(scoreA) || isNaN(scoreB) || isNaN(scoreC)) {
      return;
    }

    if (errors.judgeA || errors.judgeB || errors.judgeC) {
      return;
    }

    setSaving(true);
    try {
      // Create event participant with event_type
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
        throw participantError;
      }

      const totalScore = scoreA + scoreB + scoreC;
      
      // Create event score
      const { error: scoreError } = await supabase
        .from('event_scores')
        .insert({
          event_id: eventId,
          event_participant_id: participantData.id,
          tournament_competitor_id: competitor.id,
          judge_a_score: scoreA,
          judge_b_score: scoreB,
          judge_c_score: scoreC,
          total_score: totalScore
        });

      if (scoreError) {
        throw scoreError;
      }
      
      // Update final ranks with seasonal points calculation
      if (useSeasonalPoints) {
        await updateFinalRanks(eventId);
      }
      
      // Reset form and close modal
      setJudgeAScore('');
      setJudgeBScore('');
      setJudgeCScore('');
      setErrors({ judgeA: '', judgeB: '', judgeC: '' });
      onScoreSubmitted();
      onClose();
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Score Entry</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: 16, marginBottom: 20 }}>Competitor: {competitor?.name}</Text>
          
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>Judge B Score (0-9)</Text>
            <TextInput
              ref={judgeBRef}
              style={{ borderWidth: 1, borderColor: errors.judgeB ? '#D32F2F' : '#ddd', borderRadius: 5, padding: 10, fontSize: 16 }}
              value={judgeBScore}
              onChangeText={(value) => handleScoreChange(value, 'B')}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={1}
              autoFocus
            />
            {errors.judgeB ? <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 2 }}>{errors.judgeB}</Text> : null}
          </View>
          
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>Judge C Score (0-9)</Text>
            <TextInput
              ref={judgeCRef}
              style={{ borderWidth: 1, borderColor: errors.judgeC ? '#D32F2F' : '#ddd', borderRadius: 5, padding: 10, fontSize: 16 }}
              value={judgeCScore}
              onChangeText={(value) => handleScoreChange(value, 'C')}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={1}
            />
            {errors.judgeC ? <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 2 }}>{errors.judgeC}</Text> : null}
          </View>
          
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>Judge A Score (0-9)</Text>
            <TextInput
              ref={judgeARef}
              style={{ borderWidth: 1, borderColor: errors.judgeA ? '#D32F2F' : '#ddd', borderRadius: 5, padding: 10, fontSize: 16 }}
              value={judgeAScore}
              onChangeText={(value) => handleScoreChange(value, 'A')}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={1}
            />
            {errors.judgeA ? <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 2 }}>{errors.judgeA}</Text> : null}
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#ccc', padding: 15, borderRadius: 5, flex: 1, marginRight: 10 }}
              onPress={onClose}
            >
              <Text style={{ textAlign: 'center', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ backgroundColor: '#D32F2F', padding: 15, borderRadius: 5, flex: 1, opacity: saving ? 0.5 : 1 }}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={{ textAlign: 'center', fontSize: 16, color: 'white' }}>
                {saving ? 'Saving...' : 'Save Score'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}