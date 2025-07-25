import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoManagementSectionFixed from './VideoManagementSectionFixed';
import { updateFinalRanks } from '../app/lib/updateFinalRanks';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedCompetitor: any;
  eventId: string;
  tournamentId: string;
  onScoreUpdated: () => void;
}

export default function EditTraditionalFormsModalFixed({
  visible,
  onClose,
  selectedCompetitor,
  eventId,
  tournamentId,
  onScoreUpdated
}: Props) {
  const [judgeAScore, setJudgeAScore] = useState('');
  const [judgeBScore, setJudgeBScore] = useState('');
  const [judgeCScore, setJudgeCScore] = useState('');
  const [totalScore, setTotalScore] = useState(0);
  const [rank, setRank] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scoreId, setScoreId] = useState(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');

  // Early return for null/undefined selectedCompetitor
  if (!selectedCompetitor) {
    console.warn("No selected competitor passed to EditTraditionalFormsModalFixed");
    return null;
  }

  useEffect(() => {
    if (visible && selectedCompetitor) {
      console.log('[EditModal] Loading score for:', selectedCompetitor.id);
      loadScoreData();
    }
  }, [visible, selectedCompetitor]);

  const loadScoreData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const competitorId = selectedCompetitor.tournament_competitor_id || selectedCompetitor.id;
      
      const { data: scoreData, error: scoreError } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .single();
      
      if (scoreError) {
        console.error('[EditModal] Score load error:', scoreError);
        setError('Failed to load score data');
        return;
      }
      
      if (scoreData) {
        setScoreId(scoreData.id);
        setJudgeAScore(scoreData.judge_a_score?.toString() || '');
        setJudgeBScore(scoreData.judge_b_score?.toString() || '');
        setJudgeCScore(scoreData.judge_c_score?.toString() || '');
        setTotalScore(scoreData.total_score || 0);
        setRank(scoreData.rank || 0);
        setPoints(scoreData.points || 0);
        setHasVideo(scoreData.has_video || false);
        setVideoUrl(scoreData.video_url || '');
      }
    } catch (error) {
      console.error('[EditModal] Load error:', error);
      setError('Failed to load score data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const a = parseFloat(judgeAScore) || 0;
    const b = parseFloat(judgeBScore) || 0;
    const c = parseFloat(judgeCScore) || 0;
    return a + b + c;
  };

  useEffect(() => {
    setTotalScore(calculateTotal());
  }, [judgeAScore, judgeBScore, judgeCScore]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updatedData = {
        judge_a_score: parseFloat(judgeAScore) || 0,
        judge_b_score: parseFloat(judgeBScore) || 0,
        judge_c_score: parseFloat(judgeCScore) || 0,
        total_score: calculateTotal(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('event_scores')
        .update(updatedData)
        .eq('id', scoreId);
      
      if (error) {
        throw error;
      }
      
      // Update final ranks after score change
      await updateFinalRanks(eventId);
      
      onScoreUpdated();
      onClose();
    } catch (error) {
      console.error('[EditModal] Save error:', error);
      Alert.alert('Error', 'Failed to update score');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Score',
      'Are you sure you want to delete this score?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const { error } = await supabase
                .from('event_scores')
                .delete()
                .eq('id', scoreId);
              
              if (error) {
                throw error;
              }
              
              // Update final ranks after deletion
              await updateFinalRanks(eventId);
              
              onScoreUpdated();
              onClose();
            } catch (error) {
              console.error('[EditModal] Delete error:', error);
              Alert.alert('Error', 'Failed to delete score');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Score</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.competitorInfo}>
                <Text style={styles.competitorName}>{selectedCompetitor?.name}</Text>
                <Text style={styles.competitorDetails}>Rank: #{rank} | Points: {points}</Text>
              </View>
              
              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>Judge Scores</Text>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Judge A:</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={judgeAScore}
                    onChangeText={setJudgeAScore}
                    keyboardType="numeric"
                    placeholder="0.0"
                  />
                </View>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Judge B:</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={judgeBScore}
                    onChangeText={setJudgeBScore}
                    keyboardType="numeric"
                    placeholder="0.0"
                  />
                </View>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Judge C:</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={judgeCScore}
                    onChangeText={setJudgeCScore}
                    keyboardType="numeric"
                    placeholder="0.0"
                  />
                </View>
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Score:</Text>
                  <Text style={styles.totalValue}>{totalScore.toFixed(1)}</Text>
                </View>
              </View>
              
              <VideoManagementSectionFixed
                eventId={eventId}
                competitorId={selectedCompetitor?.tournament_competitor_id || selectedCompetitor?.id}
                tournamentId={tournamentId}
                scoreId={scoreId}
                competitorName={selectedCompetitor?.name}
                eventName="Traditional Forms"
                judgeScores={[parseFloat(judgeAScore) || 0, parseFloat(judgeBScore) || 0, parseFloat(judgeCScore) || 0]}
                totalScore={totalScore}
                rank={rank}
                onVideoUpdate={(hasVideo) => setHasVideo(hasVideo)}
                onVideoStatusChange={(status) => setHasVideo(status)}
              />
            </>
          )}
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  competitorInfo: {
    marginBottom: 20,
  },
  competitorName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  competitorDetails: {
    fontSize: 14,
    color: '#666',
  },
  scoresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 16,
    width: 80,
  },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 80,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footer: {
    paddingTop: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});