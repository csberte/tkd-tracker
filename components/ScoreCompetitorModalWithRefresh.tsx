import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import { refreshEventState } from '../app/lib/refreshEventState';
import { waitForEventToExist } from '../app/lib/retryHelpers';
import { logEventId, printEventIdTrace } from '../app/lib/eventIdLogger';
import { printEventIdTrace as debugTrace } from '../app/lib/debugHelpers';
import { guardDownstreamOperation } from '../app/lib/eventIdGuard';
import { validateUUID } from '../app/lib/utils';
import { styles } from './ScoreCompetitorModalStyles';

interface Competitor {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  source_type: string;
  placement?: number;
  medal?: string;
}

interface ScoreCompetitorModalProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId?: string;
  onScoreSaved?: () => void;
  onScoreUpdated?: () => void;
}

function cleanUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null;
  const cleaned = uuid.trim().replace(/[\"\'\/]/g, '');
  return validateUUID(cleaned) ? cleaned : null;
}

export default function ScoreCompetitorModalWithRefresh({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved,
  onScoreUpdated
}: ScoreCompetitorModalProps) {
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [judgeAScore, setJudgeAScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalScores, setOriginalScores] = useState<{judge_a_score?: number; judge_b_score?: number; judge_c_score?: number} | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);
  const judgeARef = useRef<TextInput>(null);

  debugTrace(eventId, 'ScoreCompetitorModalWithRefresh - received eventId prop');

  useEffect(() => {
    if (visible && competitor) {
      debugTrace(eventId, 'ScoreCompetitorModalWithRefresh - useEffect visible');
      loadExistingScore();
      setSaving(false);
      setIsDeleting(false);
    }
  }, [visible, competitor]);

  const loadExistingScore = async () => {
    if (!competitor?.id || !eventId) return;
    
    try {
      debugTrace(eventId, 'ScoreCompetitorModalWithRefresh - loadExistingScore');
      const { data: existingScores, error } = await supabase
        .from('event_scores')
        .select('judge_a_score, judge_b_score, judge_c_score')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitor.id);
      
      if (error) {
        setJudgeAScore('');
        setJudgeBScore('');
        setJudgeCScore('');
        setOriginalScores(null);
        return;
      }
      
      if (existingScores && existingScores.length > 0) {
        const score = existingScores[0];
        setJudgeAScore(score.judge_a_score?.toString() || '');
        setJudgeBScore(score.judge_b_score?.toString() || '');
        setJudgeCScore(score.judge_c_score?.toString() || '');
        setOriginalScores({
          judge_a_score: score.judge_a_score,
          judge_b_score: score.judge_b_score,
          judge_c_score: score.judge_c_score
        });
      } else {
        setJudgeAScore('');
        setJudgeBScore('');
        setJudgeCScore('');
        setOriginalScores(null);
      }
    } catch (error) {
      setJudgeAScore('');
      setJudgeBScore('');
      setJudgeCScore('');
      setOriginalScores(null);
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

  const handleSave = async () => {
    if (saving || isDeleting || !canSave || !competitor) return;
    
    const cleanCompetitorId = cleanUUID(competitor?.id);
    const cleanEventId = cleanUUID(eventId);
    const cleanTournamentId = cleanUUID(tournamentId || '');
    
    debugTrace(cleanEventId, 'ScoreCompetitorModalWithRefresh - handleSave START');
    
    if (!cleanCompetitorId || !cleanEventId || !cleanTournamentId) {
      debugTrace(eventId, 'ScoreCompetitorModalWithRefresh - Invalid IDs');
      Alert.alert('Error', 'Invalid IDs');
      return;
    }
    
    setSaving(true);

    try {
      await guardDownstreamOperation(cleanEventId, 'ScoreCompetitorModalWithRefresh-handleSave');
      await waitForEventToExist(cleanEventId, { maxRetries: 5, delayMs: 500 });
      await ensureEventParticipant(cleanEventId, cleanCompetitorId, 'traditional_forms');
      
      const { data: existingScore } = await supabase
        .from('event_scores')
        .select('id')
        .eq('event_id', cleanEventId)
        .eq('tournament_competitor_id', cleanCompetitorId)
        .maybeSingle();
      
      const totalScore = parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore);
      
      if (existingScore) {
        const { error: updateError } = await supabase
          .from('event_scores')
          .update({
            judge_a_score: parseInt(judgeAScore),
            judge_b_score: parseInt(judgeBScore),
            judge_c_score: parseInt(judgeCScore),
            total_score: totalScore
          })
          .eq('id', existingScore.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('event_scores')
          .insert({
            tournament_id: cleanTournamentId,
            event_id: cleanEventId,
            tournament_competitor_id: cleanCompetitorId,
            judge_a_score: parseInt(judgeAScore),
            judge_b_score: parseInt(judgeBScore),
            judge_c_score: parseInt(judgeCScore),
            total_score: totalScore,
            rank: 0,
            placement: null,
            medal: null
          });
        
        if (insertError) throw insertError;
      }
      
      const scoreChanged = !originalScores || 
        originalScores.judge_a_score !== parseInt(judgeAScore) ||
        originalScores.judge_b_score !== parseInt(judgeBScore) ||
        originalScores.judge_c_score !== parseInt(judgeCScore);
      
      await updateFinalRanks(cleanEventId, !scoreChanged, originalScores || undefined);
      
      console.log('🔄 [handleSave] Calling refreshEventState after score submission...');
      const refreshResult = await refreshEventState(cleanEventId);
      
      if (refreshResult.success) {
        console.log('✅ [handleSave] Event state refreshed successfully');
      } else {
        console.warn('⚠️ [handleSave] Event state refresh failed:', refreshResult.error);
      }
      
      if (onScoreSaved) onScoreSaved();
      if (onScoreUpdated) onScoreUpdated();
      handleClose();
    } catch (err) {
      Alert.alert('Error', `Failed to save score: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSaving(false);
    setIsDeleting(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Score {competitor?.name}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.scoreInputContainer}>
            <View style={styles.scoreInputRow}>
              <Text style={styles.judgeLabel}>Judge A</Text>
              <TextInput
                ref={judgeARef}
                style={styles.scoreInput}
                value={judgeAScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeAScore, judgeBRef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
            
            <View style={styles.scoreInputRow}>
              <Text style={styles.judgeLabel}>Judge B</Text>
              <TextInput
                ref={judgeBRef}
                style={styles.scoreInput}
                value={judgeBScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
            
            <View style={styles.scoreInputRow}>
              <Text style={styles.judgeLabel}>Judge C</Text>
              <TextInput
                ref={judgeCRef}
                style={styles.scoreInput}
                value={judgeCScore}
                onChangeText={(text) => handleScoreChange(text, setJudgeCScore)}
                keyboardType="numeric"
                maxLength={1}
                placeholder="0-9"
              />
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.disabledButton]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Score'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
