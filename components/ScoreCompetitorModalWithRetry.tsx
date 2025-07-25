import React, { useState, useRef, useEffect } from 'react';
import { Alert, TextInput } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import { waitForEventToExist } from '../app/lib/retryHelpers';
import { logEventId } from '../app/lib/eventIdLogger';

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
  selectedCompetitor: Competitor | null;
  eventId: string;
  tournamentId?: string;
  onScoreSaved?: () => void;
  onScoreUpdated?: () => void;
}

function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
}

function cleanUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null;
  const cleaned = uuid.trim().replace(/[\"\'\/]/g, '');
  return isValidUUID(cleaned) ? cleaned : null;
}

export default function ScoreCompetitorModalWithRetry({
  visible,
  onClose,
  selectedCompetitor,
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

  useEffect(() => {
    if (visible && selectedCompetitor) {
      loadExistingScore();
      setSaving(false);
      setIsDeleting(false);
    }
  }, [visible, selectedCompetitor]);

  const loadExistingScore = async () => {
    if (!selectedCompetitor?.id || !eventId) return;
    
    try {
      const { data: existingScores, error } = await supabase
        .from('event_scores')
        .select('judge_a_score, judge_b_score, judge_c_score')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', selectedCompetitor.id);
      
      if (error) {
        console.error('Error loading existing score:', error);
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
      console.error('Error loading existing score:', error);
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
    if (saving || isDeleting || !canSave || !selectedCompetitor) return;
    
    const cleanCompetitorId = cleanUUID(selectedCompetitor?.id);
    const cleanEventId = cleanUUID(eventId);
    const cleanTournamentId = cleanUUID(tournamentId || '');
    
    if (!cleanCompetitorId || !cleanEventId || !cleanTournamentId) {
      Alert.alert('Error', 'Invalid IDs');
      return;
    }
    
    logEventId('ScoreCompetitorModal - handleSave START', cleanEventId, { competitorId: cleanCompetitorId });
    
    setSaving(true);

    try {
      console.log('🔄 [handleSave] Validating event exists with retry logic...');
      await waitForEventToExist(cleanEventId, { maxRetries: 5, delayMs: 500 });
      
      logEventId('ScoreCompetitorModal - ensureEventParticipant', cleanEventId, { competitorId: cleanCompetitorId });
      await ensureEventParticipant(cleanEventId, cleanCompetitorId, 'traditional_forms');
      
      const { data: existingScore } = await supabase
        .from('event_scores')
        .select('id')
        .eq('event_id', cleanEventId)
        .eq('tournament_competitor_id', cleanCompetitorId)
        .maybeSingle();
      
      const totalScore = parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore);
      
      if (existingScore) {
        logEventId('ScoreCompetitorModal - updateScore', cleanEventId, { scoreId: existingScore.id });
        console.log('🔄 [handleSave] Updating existing score for event_id:', cleanEventId);
        const { error: updateError } = await supabase
          .from('event_scores')
          .update({
            judge_a_score: parseInt(judgeAScore),
            judge_b_score: parseInt(judgeBScore),
            judge_c_score: parseInt(judgeCScore),
            total_score: totalScore
          })
          .eq('id', existingScore.id);
        
        if (updateError) {
          console.error('❌ [handleSave] Score update failed:', updateError);
          throw updateError;
        }
        console.log('✅ [handleSave] Score updated successfully');
      } else {
        logEventId('ScoreCompetitorModal - insertScore', cleanEventId, { competitorId: cleanCompetitorId });
        console.log('🆕 [handleSave] Inserting new score for event_id:', cleanEventId);
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
        
        if (insertError) {
          console.error('❌ [handleSave] Score insert failed:', insertError);
          if (insertError.code === '23503' && insertError.message.includes('event_scores_event_id_fkey')) {
            console.error('❌ [handleSave] FOREIGN KEY CONSTRAINT: event_id does not exist in events table');
            throw new Error(`Event not found: ${cleanEventId}`);
          }
          throw insertError;
        }
        console.log('✅ [handleSave] Score inserted successfully');
      }
      
      const scoreChanged = !originalScores || 
        originalScores.judge_a_score !== parseInt(judgeAScore) ||
        originalScores.judge_b_score !== parseInt(judgeBScore) ||
        originalScores.judge_c_score !== parseInt(judgeCScore);
      
      await updateFinalRanks(cleanEventId, !scoreChanged, originalScores || undefined);
      
      logEventId('ScoreCompetitorModal - handleSave SUCCESS', cleanEventId);
      
      if (onScoreSaved) onScoreSaved();
      if (onScoreUpdated) onScoreUpdated();
      handleClose();
    } catch (err) {
      logEventId('ScoreCompetitorModal - handleSave ERROR', cleanEventId, { error: err?.message });
      console.error('❌ [handleSave] Save error:', err);
      Alert.alert('Error', `Failed to save score: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving || isDeleting || !selectedCompetitor) return;
    
    const cleanCompetitorId = cleanUUID(selectedCompetitor?.id);
    const cleanEventId = cleanUUID(eventId);
    
    if (!cleanCompetitorId || !cleanEventId) return;
    
    logEventId('ScoreCompetitorModal - handleDelete', cleanEventId, { competitorId: cleanCompetitorId });
    
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this competitor entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error: scoreDeleteError } = await supabase
                .from('event_scores')
                .delete()
                .eq('event_id', cleanEventId)
                .eq('tournament_competitor_id', cleanCompetitorId);
              
              if (scoreDeleteError) throw scoreDeleteError;
              
              const { error: participantDeleteError } = await supabase
                .from('event_participants')
                .delete()
                .eq('event_id', cleanEventId)
                .eq('tournament_competitor_id', cleanCompetitorId);
              
              if (participantDeleteError) throw participantDeleteError;
              
              await updateFinalRanks(cleanEventId, false);
              if (onScoreUpdated) onScoreUpdated();
              handleClose();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', `Failed to delete entry: ${err?.message || 'Unknown error'}`);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (saving || isDeleting) {
      Alert.alert(
        'Operation in Progress',
        'An operation is in progress. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close Anyway', onPress: () => {
            setSaving(false);
            setIsDeleting(false);
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            onClose();
          }}
        ]
      );
    } else {
      setSaving(false);
      setIsDeleting(false);
      onClose();
    }
  };

  return {
    judgeBScore,
    judgeCScore,
    judgeAScore,
    saving,
    isDeleting,
    canSave,
    handleSave,
    handleDelete,
    handleClose,
    handleScoreChange,
    setJudgeBScore,
    setJudgeCScore,
    setJudgeAScore,
    judgeBRef,
    judgeCRef,
    judgeARef
  };
}