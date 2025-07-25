import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { ensureEventParticipant } from '../app/lib/supabaseHelpers';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import { validateUUID } from '../app/lib/utils';
import { waitForEventToExist } from '../app/lib/retryHelpers';
import { confirmScoreInsert } from '../app/lib/scoreConfirmationHelpers';
import { logEventId } from '../app/lib/eventIdLogger';
import ModalWrapper from './ModalWrapper';

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
}

function cleanUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null;
  const cleaned = uuid.trim().replace(/[\"\'\/]/g, '');
  return validateUUID(cleaned) ? cleaned : null;
}

export default function SimpleScoreEntryModalWithRetry({
  visible,
  onClose,
  competitor,
  eventId,
  tournamentId,
  onScoreSaved
}: SimpleScoreEntryModalProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [saving, setSaving] = useState(false);
  
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
      console.log('🔍 [getEventParticipantId] Looking up participant:', { eventId, competitorId });
      
      const { data: participant, error } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .maybeSingle();
      
      if (error) {
        console.error('❌ [getEventParticipantId] Lookup error:', error);
        throw error;
      }
      
      if (participant) {
        console.log('✅ [getEventParticipantId] Found participant:', participant.id);
        return participant.id;
      }
      
      throw new Error('Event participant not found');
    } catch (error) {
      console.error('❌ [getEventParticipantId] Failed:', error);
      throw error;
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
    
    logEventId('SimpleScoreEntryModalWithRetry - handleSave START', cleanEventId, { competitorId: cleanCompetitorId });
    
    setSaving(true);

    try {
      console.log('🔄 [handleSave] Validating event exists with retry logic...');
      await waitForEventToExist(cleanEventId, { maxRetries: 5, delayMs: 500 });
      
      logEventId('SimpleScoreEntryModalWithRetry - ensureEventParticipant', cleanEventId, { competitorId: cleanCompetitorId });
      await ensureEventParticipant(cleanEventId, cleanCompetitorId, 'traditional_forms');
      
      const eventParticipantId = await getEventParticipantId(cleanEventId, cleanCompetitorId);
      
      if (!eventParticipantId) {
        throw new Error('Failed to get event_participant_id');
      }
      
      const totalScore = parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore);
      
      console.log(`🔄 Saving score for participant ${eventParticipantId} under event ${cleanEventId}`);
      
      const { data: existingScore, error: checkError } = await supabase
        .from('event_scores')
        .select('id')
        .eq('event_participant_id', eventParticipantId)
        .maybeSingle();
      
      if (checkError) {
        throw checkError;
      }
      
      if (existingScore) {
        logEventId('SimpleScoreEntryModalWithRetry - updateScore', cleanEventId, { scoreId: existingScore.id });
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
        
        if (updateError) throw updateError;
        console.log('✅ [handleSave] Score updated successfully');
      } else {
        logEventId('SimpleScoreEntryModalWithRetry - insertScore', cleanEventId, { competitorId: cleanCompetitorId });
        console.log('🆕 [handleSave] Inserting new score for event_id:', cleanEventId);
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
      
      // Confirm score insert with retry logic instead of artificial delay
      console.log('🔄 [handleSave] Confirming score insert...');
      const scoreConfirmed = await confirmScoreInsert(cleanEventId, cleanCompetitorId, {
        maxRetries: 3,
        delayMs: 100
      });
      
      if (!scoreConfirmed) {
        throw new Error('Score insert could not be confirmed');
      }
      
      console.log('🔄 [handleSave] Updating final ranks...');
      await updateFinalRanks(cleanEventId, false);
      console.log('✅ [handleSave] Final ranks updated successfully');
      
      logEventId('SimpleScoreEntryModalWithRetry - handleSave SUCCESS', cleanEventId);
      
      onScoreSaved();
      onClose();
    } catch (err: any) {
      logEventId('SimpleScoreEntryModalWithRetry - handleSave ERROR', cleanEventId, { error: err?.message });
      console.error('❌ [handleSave] Save failed:', err);
      
      Alert.alert(
        'Score Save Failed',
        `Failed to save score: ${err?.message || 'Unknown error'}\n\nPlease try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, margin: 20, maxWidth: 400, width: '90%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Score Entry</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>{competitor.name}</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge A</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                textAlign: 'center'
              }}
              value={judgeAScore}
              onChangeText={(text) => handleScoreChange(text, setJudgeAScore, judgeBRef)}
              keyboardType="numeric"
              maxLength={1}
              placeholder="0-9"
            />
          </View>
          
          <View style={{ flex: 1, marginHorizontal: 5 }}>
            <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge B</Text>
            <TextInput
              ref={judgeBRef}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                textAlign: 'center'
              }}
              value={judgeBScore}
              onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
              keyboardType="numeric"
              maxLength={1}
              placeholder="0-9"
            />
          </View>
          
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Judge C</Text>
            <TextInput
              ref={judgeCRef}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                textAlign: 'center'
              }}
              value={judgeCScore}
              onChangeText={(text) => handleScoreChange(text, setJudgeCScore)}
              keyboardType="numeric"
              maxLength={1}
              placeholder="0-9"
            />
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#f0f0f0',
              padding: 15,
              borderRadius: 8,
              marginRight: 10
            }}
            onPress={onClose}
          >
            <Text style={{ textAlign: 'center', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: canSave ? '#007AFF' : '#ccc',
              padding: 15,
              borderRadius: 8,
              marginLeft: 10
            }}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            <Text style={{ textAlign: 'center', fontSize: 16, color: 'white' }}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}