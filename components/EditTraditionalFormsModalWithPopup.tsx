import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import VideoManagementSectionWithPopup from './VideoManagementSectionWithPopup';

interface EditTraditionalFormsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCompetitor: any;
  eventId: string;
  tournamentId: string;
  onScoreUpdated: () => void;
}

export default function EditTraditionalFormsModalWithPopup({
  visible, onClose, selectedCompetitor, eventId, tournamentId, onScoreUpdated
}: EditTraditionalFormsModalProps) {
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (visible && selectedCompetitor) {
      loadScoreData();
    }
  }, [visible, selectedCompetitor]);

  const loadScoreData = async () => {
    if (!selectedCompetitor || !eventId) return;
    
    setLoading(true);
    try {
      const competitorId = selectedCompetitor.tournament_competitor_id || selectedCompetitor.id;
      const { data, error } = await supabase
        .from('event_scores')
        .select('*')
        .eq('event_id', eventId)
        .eq('tournament_competitor_id', competitorId)
        .single();
      
      if (data && !error) {
        setScoreData(data);
        setHasVideo(data.has_video || false);
      }
    } catch (error) {
      console.error('Error loading score data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpdate = (videoStatus: boolean) => {
    setHasVideo(videoStatus);
  };

  const handleClose = () => {
    onClose();
    onScoreUpdated();
  };

  if (!selectedCompetitor) return null;

  const competitorName = selectedCompetitor.name || 'Unknown Competitor';
  const competitorId = selectedCompetitor.tournament_competitor_id || selectedCompetitor.id;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Competitor</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.competitorInfo}>
            <Text style={styles.competitorName}>{competitorName}</Text>
            {scoreData && (
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>Total Score: {scoreData.total_score || 0}</Text>
                <Text style={styles.scoreLabel}>Rank: #{scoreData.final_rank || 'N/A'}</Text>
                {scoreData.judge_a_score !== null && (
                  <Text style={styles.judgeScores}>
                    Judge Scores: A:{scoreData.judge_a_score} B:{scoreData.judge_b_score} C:{scoreData.judge_c_score}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          {scoreData && (
            <VideoManagementSectionWithPopup
              competitorId={competitorId}
              eventId={eventId}
              tournamentId={tournamentId}
              scoreId={scoreData.id}
              competitorName={competitorName}
              eventName="Traditional Forms"
              judgeScores={[scoreData.judge_a_score, scoreData.judge_b_score, scoreData.judge_c_score]}
              totalScore={scoreData.total_score}
              rank={scoreData.final_rank}
              onVideoUpdate={handleVideoUpdate}
              competitor={selectedCompetitor}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0'
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  content: { flex: 1 },
  competitorInfo: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  competitorName: { fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 8 },
  scoreInfo: { gap: 4 },
  scoreLabel: { fontSize: 16, color: '#333' },
  judgeScores: { fontSize: 14, color: '#666', marginTop: 4 }
});