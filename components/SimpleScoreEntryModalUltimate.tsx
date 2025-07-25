import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { rankSanitizer } from '../app/lib/rankSanitizer';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
  tournament_competitor_id?: string;
  tournament_competitor?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Judge {
  id: string;
  role: string;
  name: string;
}

interface SimpleScoreEntryModalUltimateProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
}

const DEFAULT_JUDGES: Judge[] = [
  { id: 'judge-b', role: 'Judge B', name: '' },
  { id: 'judge-c', role: 'Judge C', name: '' },
  { id: 'judge-a', role: 'Judge A', name: '' },
];

export default function SimpleScoreEntryModalUltimate({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalUltimateProps) {
  const insets = useSafeAreaInsets();
  const [judges, setJudges] = useState<Judge[]>(DEFAULT_JUDGES);
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [judgeAScore, setJudgeAScore] = useState('');
  const [saving, setSaving] = useState(false);
  
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);
  const judgeARef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && tournamentId) {
      loadJudges();
      setJudgeBScore('');
      setJudgeCScore('');
      setJudgeAScore('');
      // Auto-focus Judge B input field when modal opens
      setTimeout(() => {
        judgeBRef.current?.focus();
      }, 100);
    }
  }, [visible, tournamentId]);

  const loadJudges = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('judge_a, judge_b, judge_c')
        .eq('id', tournamentId)
        .single();

      if (error) {
        console.error('Error loading judges:', error);
        return;
      }

      const loadedJudges = [
        { id: 'judge-b', role: 'Judge B', name: data.judge_b || '' },
        { id: 'judge-c', role: 'Judge C', name: data.judge_c || '' },
        { id: 'judge-a', role: 'Judge A', name: data.judge_a || '' },
      ];
      
      setJudges(loadedJudges);
    } catch (error) {
      console.error('Error loading judges:', error);
    }
  };

  const validateScore = (score: string): boolean => {
    const num = parseInt(score);
    return !isNaN(num) && num >= 0 && num <= 9;
  };

  const handleScoreChange = (score: string, setter: (s: string) => void, nextRef?: React.RefObject<TextInput>) => {
    if (score === '' || validateScore(score)) {
      setter(score);
      if (score !== '' && nextRef?.current) {
        nextRef.current?.focus();
      }
    }
  };

  const canSave = judgeBScore !== '' && judgeCScore !== '' && judgeAScore !== '' &&
                  validateScore(judgeBScore) && validateScore(judgeCScore) && validateScore(judgeAScore);

  const getCompetitorId = () => {
    return competitor.tournament_competitor_id || competitor.id;
  };

  const handleSave = async () => {
    if (saving || !canSave) return;
    
    setSaving(true);
    
    try {
      const competitorId = getCompetitorId();
      
      await ensureEventParticipant(eventId, competitorId, 'traditional_forms');
      
      const totalScore = parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore);
      
      const { error: insertError } = await supabase
        .from('event_scores')
        .insert({
          tournament_id: tournamentId,
          event_id: eventId,
          tournament_competitor_id: competitorId,
          judge_a_score: parseInt(judgeAScore),
          judge_b_score: parseInt(judgeBScore),
          judge_c_score: parseInt(judgeCScore),
          total_score: totalScore,
          rank: 0,
          placement: null,
          medal: null,
          final_rank: null // Ensure we don't insert invalid rank values
        });
      
      if (insertError) {
        throw insertError;
      }
      
      await updateFinalRanks(eventId);
      
      onScoreSaved();
      onClose();
    } catch (err: any) {
      console.error('Score save error:', err);
      Alert.alert('Error', `Failed to save score: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) {
      Alert.alert('Saving in Progress', 'Please wait for the save to complete.');
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, backgroundColor: 'white' }}
      >
        <View style={{ 
          flex: 1, 
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20
        }}>
          {/* Drag Handle */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: '#E0E0E0',
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 20
          }} />
          
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 30 
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#000000',
              textAlign: 'center',
              flex: 1
            }}>
              Score Competitor
            </Text>
            <TouchableOpacity 
              onPress={handleClose}
              style={{
                position: 'absolute',
                right: 0,
                padding: 8,
                borderRadius: 20,
                backgroundColor: '#F5F5F5'
              }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          {/* Competitor Name */}
          <View style={{ marginBottom: 30, alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: '#000000',
              textAlign: 'center'
            }}>
              {competitor.tournament_competitor?.name || competitor.name}
            </Text>
          </View>
          
          {/* Judge Inputs */}
          <View style={{ marginBottom: 30 }}>
            {/* Judge A */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#000000', 
                marginBottom: 8 
              }}>
                {judges[2].name || judges[2].role}
              </Text>
              <TextInput
                ref={judgeARef}
                style={{
                  borderWidth: 2,
                  borderColor: '#D32F2F',
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  height: 48
                }}
                value={judgeAScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeAScore)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
                placeholderTextColor="#999999"
              />
            </View>
            
            {/* Judge B */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#000000', 
                marginBottom: 8 
              }}>
                {judges[0].name || judges[0].role}
              </Text>
              <TextInput
                ref={judgeBRef}
                style={{
                  borderWidth: 2,
                  borderColor: '#D32F2F',
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  height: 48
                }}
                value={judgeBScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
                placeholderTextColor="#999999"
              />
            </View>
            
            {/* Judge C */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#000000', 
                marginBottom: 8 
              }}>
                {judges[1].name || judges[1].role}
              </Text>
              <TextInput
                ref={judgeCRef}
                style={{
                  borderWidth: 2,
                  borderColor: '#D32F2F',
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 18,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  height: 48
                }}
                value={judgeCScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeCScore, judgeARef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
                placeholderTextColor="#999999"
              />
            </View>
          </View>
          
          {/* Total Score Display */}
          {canSave && (
            <View style={{ 
              backgroundColor: '#F8F9FA', 
              padding: 16, 
              borderRadius: 8, 
              marginBottom: 30,
              borderWidth: 1,
              borderColor: '#E0E0E0'
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: '#000000', 
                textAlign: 'center' 
              }}>
                Total Score: {(parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore))}
              </Text>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                flex: 1,
                backgroundColor: '#F5F5F5',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ 
                color: '#000000', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave || saving}
              style={{
                flex: 1,
                backgroundColor: canSave && !saving ? '#D32F2F' : '#D1D5DB',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 16, 
                fontWeight: 'bold' 
              }}>
                {saving ? 'Saving...' : 'Save Score'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}