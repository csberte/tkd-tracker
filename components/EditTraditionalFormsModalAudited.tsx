import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { updateFinalRanks } from '../app/lib/eventHelpersRest';
import VideoManagementSectionFixed from './VideoManagementSectionFixed';
import { editTraditionalFormsModalStyles as styles } from './EditTraditionalFormsModalStyles';

interface EditTraditionalFormsModalProps {
  visible: boolean;
  onClose?: () => void;
  selectedCompetitor?: any;
  eventId: string;
  tournamentId: string;
  onScoreUpdated?: () => void;
  onVideoStatusChanged?: (hasVideo: boolean) => void;
  scoreId?: string;
  competitorName?: string;
  competitorId?: string;
  competitorRank?: number;
}

export default function EditTraditionalFormsModalAudited({
  visible, onClose, selectedCompetitor, eventId, tournamentId, onScoreUpdated, onVideoStatusChanged,
  scoreId: legacyScoreId, competitorName: legacyCompetitorName, competitorId: legacyCompetitorId, competitorRank: legacyCompetitorRank
}: EditTraditionalFormsModalProps) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [scoreId, setScoreId] = useState('');
  
  const competitorId = selectedCompetitor?.competitor_id || selectedCompetitor?.id || legacyCompetitorId || '';
  const competitorName = selectedCompetitor?.name || legacyCompetitorName || 'Unknown';
  const competitorRank = selectedCompetitor?.final_rank || selectedCompetitor?.rank || legacyCompetitorRank;
  const currentScoreId = legacyScoreId || scoreId;

  console.log('EditTraditionalFormsModalAudited - Score fields audit:', {
    scoreId: currentScoreId,
    eventId,
    competitorId,
    selectedCompetitor
  });

  useEffect(() => {
    if (visible && (selectedCompetitor || legacyScoreId)) {
      loadScore();
    }
  }, [visible, selectedCompetitor, legacyScoreId]);

  const loadScore = async () => {
    try {
      console.log('🔍 Loading score for competitor:', competitorId);
      
      const { data, error } = await supabase
        .from('event_scores')
        .select('id, judge_a_score, judge_b_score, judge_c_score')
        .eq('competitor_id', competitorId)
        .eq('event_id', eventId)
        .single();

      if (error) {
        console.error('❌ Error loading score:', error);
        return;
      }
      
      if (data) {
        setScoreId(data.id);
        setJudgeAScore(data.judge_a_score?.toString() || '');
        setJudgeBScore(data.judge_b_score?.toString() || '');
        setJudgeCScore(data.judge_c_score?.toString() || '');
        console.log('✅ Loaded score using CORRECT judge_*_score fields:', data);
      }
    } catch (error) {
      console.error('❌ Error loading score:', error);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    
    const a = parseFloat(judgeAScore) || 0;
    const b = parseFloat(judgeBScore) || 0;
    const c = parseFloat(judgeCScore) || 0;

    if (a < 0 || a > 9 || b < 0 || b > 9 || c < 0 || c > 9) {
      Alert.alert('Invalid Score', 'Scores must be between 0 and 9');
      return;
    }

    const updateScoreId = currentScoreId || scoreId;
    
    if (!updateScoreId) {
      console.error('❌ No scoreId found for competitor:', selectedCompetitor);
      Alert.alert('Error', 'Cannot save score - no score ID available.');
      return;
    }

    console.log('✅ Using scoreId for update:', updateScoreId);
    
    setLoading(true);
    try {
      const totalScore = a + b + c;
      
      console.log('🔄 Updating score with CORRECT judge_*_score fields:', {
        scoreId: updateScoreId,
        judge_a_score: a,
        judge_b_score: b,
        judge_c_score: c,
        total_score: totalScore
      });
      
      const { error } = await supabase
        .from('event_scores')
        .update({
          judge_a_score: a,
          judge_b_score: b,
          judge_c_score: c,
          total_score: totalScore
        })
        .eq('id', updateScoreId);

      if (error) {
        console.error('❌ Score update failed:', error);
        throw error;
      }
      
      console.log('✅ Score update successful using judge_*_score fields');
      
      await updateFinalRanks(eventId);
      
      if (typeof onScoreUpdated === 'function') {
        onScoreUpdated();
      }
      
      Alert.alert('Success', 'Score updated successfully');
      handleClose();
    } catch (error) {
      console.error('❌ Save error:', error);
      Alert.alert('Error', `Failed to update score: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const totalScore = (parseFloat(judgeAScore) || 0) + (parseFloat(judgeBScore) || 0) + (parseFloat(judgeCScore) || 0);
  const saveDisabled = !currentScoreId && !scoreId;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFFFFF' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Score (Audited)</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            <Text style={styles.competitorName}>{competitorName}</Text>
            {saveDisabled && (
              <View style={{ backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: '#856404', fontSize: 14 }}>⚠️ No score ID available. Save button is disabled.</Text>
              </View>
            )}
            <View style={styles.scoreSection}>
              <Text style={styles.sectionTitle}>Judge Scores (Using judge_*_score fields)</Text>
              <View style={styles.scoreInputRow}>
                <View style={styles.scoreInputContainer}>
                  <Text style={styles.scoreLabel}>Judge A</Text>
                  <TextInput style={styles.scoreInput} value={judgeAScore} onChangeText={setJudgeAScore} keyboardType="number-pad" placeholder="0" maxLength={1} />
                </View>
                <View style={styles.scoreInputContainer}>
                  <Text style={styles.scoreLabel}>Judge B</Text>
                  <TextInput style={styles.scoreInput} value={judgeBScore} onChangeText={setJudgeBScore} keyboardType="number-pad" placeholder="0" maxLength={1} />
                </View>
                <View style={styles.scoreInputContainer}>
                  <Text style={styles.scoreLabel}>Judge C</Text>
                  <TextInput style={styles.scoreInput} value={judgeCScore} onChangeText={setJudgeCScore} keyboardType="number-pad" placeholder="0" maxLength={1} />
                </View>
              </View>
              <View style={styles.totalScoreContainer}>
                <Text style={styles.totalScoreLabel}>Total Score</Text>
                <Text style={styles.totalScoreValue}>{totalScore.toFixed(1)}</Text>
              </View>
            </View>
            <VideoManagementSectionFixed competitorId={competitorId} eventId={eventId} tournamentId={tournamentId} scoreId={currentScoreId} competitorName={competitorName} eventName="Traditional Forms" totalScore={totalScore} rank={competitorRank} onVideoStatusChange={onVideoStatusChanged} />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.saveButton, saveDisabled && { opacity: 0.5 }]} onPress={handleSave} disabled={loading || saveDisabled}>
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : saveDisabled ? 'Save Disabled (No Score ID)' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}