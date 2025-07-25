import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform, Keyboard, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import VideoManagementSection from './VideoManagementSection';
import { editTraditionalFormsModalStyles as styles } from './EditTraditionalFormsModalStyles';

// FIX #2: UUID validation helper
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
}

// FIX #2: Clean UUID helper
function cleanUUID(uuid: string): string | null {
  if (!uuid || typeof uuid !== 'string') return null;
  const cleaned = uuid.trim().replace(/[\"\'\\/]/g, '');
  return isValidUUID(cleaned) ? cleaned : null;
}

export default function EditTraditionalFormsModalPart1({
  visible, onClose, scoreId, competitorName, competitorId, eventId, tournamentId, onScoreUpdated, onVideoStatusChanged, competitorRank
}: any) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [scoreC, setScoreC] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortedCompetitors, setSortedCompetitors] = useState([]);
  
  const judgeBRef = useRef<TextInput>(null);
  const judgeCRef = useRef<TextInput>(null);
  const judgeARef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && scoreId) {
      loadScore();
      loadSortedCompetitors();
    }
  }, [visible, scoreId]);

  const loadScore = async () => {
    try {
      const { data, error } = await supabase
        .from('event_scores')
        .select('judge_a_score, judge_b_score, judge_c_score')
        .eq('id', scoreId)
        .single();

      if (error) throw error;
      if (data) {
        setScoreA(data.judge_a_score?.toString() || '');
        setScoreB(data.judge_b_score?.toString() || '');
        setScoreC(data.judge_c_score?.toString() || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load score data');
    }
  };

  const loadSortedCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('event_scores')
        .select(`
          id,
          competitor_id,
          total_score,
          event_participants!inner(
            competitor_id,
            tournament_competitors!event_participants_competitor_id_fkey(
              name
            )
          )
        `)
        .eq('event_id', eventId)
        .order('total_score', { ascending: false });

      if (error) throw error;
      if (data) {
        const competitors = data.map((score, index) => ({
          id: score.competitor_id,
          competitor_id: score.competitor_id,
          competitor_name: score.event_participants?.tournament_competitors?.name || 'Unknown',
          total_score: score.total_score || 0,
          rank: index + 1
        }));
        setSortedCompetitors(competitors);
      }
    } catch (error) {
      console.error('Competitors load failed:', error);
    }
  };

  const validateScore = (text: string): string => {
    const filtered = text.replace(/[^0-9]/g, '');
    const num = parseInt(filtered);
    if (isNaN(num) || num < 0 || num > 9) {
      return '';
    }
    return filtered;
  };

  const handleScoreChange = (text: string, judge: 'B' | 'C' | 'A', nextRef?: React.RefObject<TextInput>) => {
    const validatedText = validateScore(text);
    
    if (judge === 'B') {
      setScoreB(validatedText);
    } else if (judge === 'C') {
      setScoreC(validatedText);
    } else {
      setScoreA(validatedText);
    }

    if (validatedText.length === 1 && nextRef?.current) {
      nextRef.current.focus();
    }
    
    if (validatedText.length === 1 && judge === 'A') {
      Keyboard.dismiss();
    }
  };

  const handleSave = async () => {
    if (loading || isDeleting) return;
    
    const a = parseFloat(scoreA) || 0;
    const b = parseFloat(scoreB) || 0;
    const c = parseFloat(scoreC) || 0;

    if (a < 0 || a > 9 || b < 0 || b > 9 || c < 0 || c > 9) {
      Alert.alert('Invalid Score', 'Scores must be between 0 and 9');
      return;
    }

    // FIX #2: Validate scoreId and eventId
    const cleanScoreId = cleanUUID(scoreId);
    const cleanEventId = cleanUUID(eventId);
    
    if (!cleanScoreId) {
      console.error('[EditModal] Invalid scoreId:', scoreId);
      Alert.alert('Error', 'Invalid score ID');
      return;
    }
    
    if (!cleanEventId) {
      console.error('[EditModal] Invalid eventId:', eventId);
      Alert.alert('Error', 'Invalid event ID');
      return;
    }

    setLoading(true);
    try {
      const totalScore = a + b + c;
      
      if (__DEV__) {
        console.log('[EditModal] Save payload:', {
          cleanScoreId,
          cleanEventId,
          judge_a_score: a,
          judge_b_score: b,
          judge_c_score: c,
          total_score: totalScore
        });
      }
      
      const { error } = await supabase
        .from('event_scores')
        .update({
          judge_a_score: a,
          judge_b_score: b,
          judge_c_score: c,
          total_score: totalScore
        })
        .eq('id', cleanScoreId);

      if (error) throw error;
      
      await updateFinalRanks(cleanEventId);
      
      if (typeof onScoreUpdated === 'function') {
        onScoreUpdated();
      }
      
      Alert.alert('Success', 'Score updated successfully');
      handleClose();
    } catch (error) {
      console.error('[EditModal] Save failed:', error);
      Alert.alert('Error', `Failed to update score: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading || isDeleting) return;
    
    setIsDeleting(true);
    setLoading(false);
    
    Alert.alert(
      'Delete Score',
      'Are you sure you want to delete this score?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsDeleting(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const cleanScoreId = cleanUUID(scoreId);
              const cleanCompetitorId = cleanUUID(competitorId);
              const cleanEventId = cleanUUID(eventId);
              
              if (!cleanScoreId || !cleanCompetitorId || !cleanEventId) {
                console.error('[EditModal] Invalid IDs for delete');
                Alert.alert('Error', 'Invalid data for deletion');
                return;
              }
              
              if (__DEV__) {
                console.log('[EditModal] Delete payload:', {
                  cleanScoreId,
                  cleanCompetitorId,
                  cleanEventId
                });
              }

              const { error: scoreError } = await supabase
                .from('event_scores')
                .delete()
                .eq('id', cleanScoreId);

              if (scoreError) throw scoreError;

              const { error: participantError } = await supabase
                .from('event_participants')
                .delete()
                .eq('competitor_id', cleanCompetitorId)
                .eq('event_id', cleanEventId);

              if (participantError) {
                console.warn('Participant delete warning:', participantError.message);
              }
              
              await updateFinalRanks(cleanEventId);
              
              if (typeof onScoreUpdated === 'function') {
                onScoreUpdated();
              }
              
              Alert.alert('Success', 'Score deleted successfully');
              handleClose();
            } catch (error) {
              console.error('[EditModal] Delete failed:', error);
              Alert.alert('Error', 'Failed to delete score');
            } finally {
              setIsDeleting(false);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (loading || isDeleting) {
      Alert.alert(
        'Operation in Progress',
        'An operation is in progress. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close Anyway', onPress: () => {
            setLoading(false);
            setIsDeleting(false);
            if (typeof onClose === 'function') {
              onClose();
            }
          }}
        ]
      );
    } else {
      setLoading(false);
      setIsDeleting(false);
      if (typeof onClose === 'function') {
        onClose();
      }
    }
  };

  const totalScore = (parseFloat(scoreA) || 0) + (parseFloat(scoreB) || 0) + (parseFloat(scoreC) || 0);
  const judgeScores = [parseFloat(scoreA) || 0, parseFloat(scoreB) || 0, parseFloat(scoreC) || 0];

  return {
    scoreA,
    scoreB,
    scoreC,
    loading,
    isDeleting,
    sortedCompetitors,
    judgeBRef,
    judgeCRef,
    judgeARef,
    handleScoreChange,
    handleSave,
    handleDelete,
    handleClose,
    totalScore,
    judgeScores
  };
}