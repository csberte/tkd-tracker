import React, { useState, useRef } from 'react';
import { TextInput, Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { calculateAndSaveFinalRanksWithRetry } from '../app/lib/eventHelpersRestWithRetry';
import { refreshEventState } from '../app/lib/refreshEventState';
import { validateUUID } from '../app/lib/utils';
import { waitForEventToExist } from '../app/lib/retryHelpers';
import { logEventId } from '../app/lib/eventIdLogger';
import SimpleScoreEntryModalUI from './SimpleScoreEntryModalFinalUI';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface SimpleScoreEntryModalProps {
  visible: boolean;
  onClose: () => void;
  competitor: Competitor;
  eventId: string;
  tournamentId: string;
  onScoreSaved: () => void;
  loadData?: () => Promise<any[]>;
}

function cleanUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null;
  const cleaned = uuid.trim().replace(/[\"\'\/]/g, '');
  return validateUUID(cleaned) ? cleaned : null;
}

export default function SimpleScoreEntryModalFinalComplete({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved,
  loadData
}: SimpleScoreEntryModalProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState<'syncing' | 'waiting_for_visibility' | 'failed' | null>(null);
  
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);

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

  const canSave = judgeAScore !== '' && judgeBScore !== '' && judgeCScore !== '' &&
                  validateScore(judgeAScore) && validateScore(judgeBScore) && validateScore(judgeCScore);

  const getEventParticipantId = async (eventId: string, competitorId: string) => {
    try {
      const { data: participant, error } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .maybeSingle();
      
      if (error) throw error;
      if (participant) return participant.id;
      throw new Error('Event participant not found');
    } catch (error) {
      console.error('❌ [getEventParticipantId] Failed:', error);
      throw error;
    }
  };

  const insertSimpleScore = async (eventParticipantId: string, cleanEventId: string, cleanTournamentId: string, cleanCompetitorId: string) => {
    const totalScore = parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore);
    
    const { data: existingScore, error: checkError } = await supabase
      .from('event_scores')
      .select('id')
      .eq('event_participant_id', eventParticipantId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
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
      console.log('✅ [insertSimpleScore] Score updated successfully');
    } else {
      const { error: insertError } = await supabase
        .from('event_scores')
        .insert({
          event_participant_id: eventParticipantId,
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
      console.log('✅ [insertSimpleScore] Score inserted successfully');
    }
  };

  const handleSave = async () => {
    if (saving || !canSave) return;
    
    const cleanCompetitorId = cleanUUID(competitor.id);
    const cleanEventId = cleanUUID(eventId);
    const cleanTournamentId = cleanUUID(tournamentId);
    
    if (!cleanCompetitorId || !cleanEventId || !cleanTournamentId) {
      Alert.alert('Error', 'Invalid IDs provided');
      return;
    }
    
    logEventId('SimpleScoreEntryModalFinalComplete - handleSave START', cleanEventId, { competitorId: cleanCompetitorId });
    
    setSaving(true);

    try {
      await waitForEventToExist(cleanEventId, { maxRetries: 5, delayMs: 500 });
      await ensureEventParticipant(cleanEventId, cleanCompetitorId, 'traditional_forms');
      
      const eventParticipantId = await getEventParticipantId(cleanEventId, cleanCompetitorId);
      if (!eventParticipantId) throw new Error('Failed to get event_participant_id');
      
      await insertSimpleScore(eventParticipantId, cleanEventId, cleanTournamentId, cleanCompetitorId);
      await calculateAndSaveFinalRanksWithRetry(cleanEventId);
      
      console.log('🔄 [handleSave] Calling refreshEventState after score submission...');
      const refreshResult = await refreshEventState(cleanEventId);
      
      if (refreshResult.success) {
        console.log('✅ [handleSave] Event state refreshed successfully');
      } else {
        console.warn('⚠️ [handleSave] Event state refresh failed:', refreshResult.error);
      }
      
      logEventId('SimpleScoreEntryModalFinalComplete - handleSave SUCCESS', cleanEventId);
      
      // Call onScoreSaved to trigger parent component refresh
      onScoreSaved();
      onClose();
      
    } catch (err: any) {
      logEventId('SimpleScoreEntryModalFinalComplete - handleSave ERROR', cleanEventId, { error: err?.message });
      console.error('❌ [handleSave] Save failed:', err);
      
      Alert.alert(
        'Score Save Failed',
        `Failed to save score: ${err?.message || 'Unknown error'}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    const cleanCompetitorId = cleanUUID(competitor.id);
    const cleanEventId = cleanUUID(eventId);
    
    if (cleanCompetitorId && cleanEventId) {
      console.log('🔄 [handleRetry] Refreshing event state...');
      const refreshResult = await refreshEventState(cleanEventId);
      
      if (refreshResult.success) {
        onScoreSaved();
      }
    }
  };

  const handleCancelSync = () => {
    setSyncingStatus(null);
  };

  return (
    <SimpleScoreEntryModalUI
      visible={visible}
      onClose={onClose}
      competitor={competitor}
      judgeAScore={judgeAScore}
      judgeBScore={judgeBScore}
      judgeCScore={judgeCScore}
      setJudgeAScore={setJudgeAScore}
      setJudgeBScore={setJudgeBScore}
      setJudgeCScore={setJudgeCScore}
      judgeBRef={judgeBRef}
      judgeCRef={judgeCRef}
      handleScoreChange={handleScoreChange}
      canSave={canSave}
      saving={saving}
      handleSave={handleSave}
      syncingStatus={syncingStatus}
      handleRetry={handleRetry}
      handleCancelSync={handleCancelSync}
    />
  );
}
