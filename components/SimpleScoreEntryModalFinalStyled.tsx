import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';
import { calculateSeasonalPoints } from '../app/lib/seasonalPointsFixed';
import { getAllParticipantsInEvent } from '../app/lib/eventHelpersRest2EnhancedFixed';

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

interface SimpleScoreEntryModalProps {
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

export default function SimpleScoreEntryModalFinalStyled({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalProps) {
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
          medal: null
        });
      
      if (insertError) {
        throw insertError;
      }
      
      await updateFinalRanks(eventId);
      
      onScoreSaved();
      onClose();
    } catch (err) {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000000' }}>Score Entry</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
                {competitor.tournament_competitor?.name || competitor.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#666666', marginTop: 4 }}>Traditional Forms</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000000', marginBottom: 8 }}>
                  {judges[0].name || judges[0].role}
                </Text>
                <TextInput
                  ref={judgeBRef}
                  style={{ borderWidth: 2, borderColor: '#D32F2F', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', backgroundColor: '#FFFFFF' }}
                  value={judgeBScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
                  keyboardType="numeric"
                  maxLength={1}
                  placeholder="0-9"
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 5 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000000', marginBottom: 8 }}>
                  {judges[1].name || judges[1].role}
                </Text>
                <TextInput
                  ref={judgeCRef}
                  style={{ borderWidth: 2, borderColor: '#D32F2F', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', backgroundColor: '#FFFFFF' }}
                  value={judgeCScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeCScore, judgeARef)}
                  keyboardType="numeric"
                  maxLength={1}
                  placeholder="0-9"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000000', marginBottom: 8 }}>
                  {judges[2].name || judges[2].role}
                </Text>
                <TextInput
                  ref={judgeARef}
                  style={{ borderWidth: 2, borderColor: '#D32F2F', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', backgroundColor: '#FFFFFF' }}
                  value={judgeAScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeAScore)}
                  keyboardType="numeric"
                  maxLength={1}
                  placeholder="0-9"
                />
              </View>
            </View>
            
            <View style={{ height: 1, backgroundColor: '#000000', marginBottom: 20, opacity: 0.2 }} />
            
            {canSave && (
              <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, marginBottom: 30, borderWidth: 1, borderColor: '#E0E0E0' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000000', textAlign: 'center' }}>
                  Total Score: {(parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore)).toFixed(1)}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave || saving}
              style={{
                backgroundColor: canSave && !saving ? '#D32F2F' : '#D1D5DB',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                {saving ? 'Saving...' : 'Save Score'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}