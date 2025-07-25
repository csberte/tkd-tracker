import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Image, Alert, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import ScoreCompetitorModalPart1 from './ScoreCompetitorModalPart1';
import VideoManagementSectionFixed from './VideoManagementSectionFixed';
import { supabase } from '../app/lib/supabase';
import { styles } from './ScoreCompetitorModalStyles';

interface Judge {
  id: string;
  role: string;
  name: string;
}

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

const DEFAULT_JUDGES: Judge[] = [
  { id: 'judge-b', role: 'Judge B', name: '' },
  { id: 'judge-c', role: 'Judge C', name: '' },
  { id: 'judge-a', role: 'Judge A', name: '' },
];

export default function ScoreCompetitorModalFixed(props: ScoreCompetitorModalProps) {
  const { visible, selectedCompetitor, eventId, tournamentId } = props;
  const [judges, setJudges] = useState<Judge[]>(DEFAULT_JUDGES);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const {
    judgeBScore, judgeCScore, judgeAScore, saving, isDeleting, canSave,
    handleSave, handleClose, handleScoreChange, setJudgeBScore,
    setJudgeCScore, setJudgeAScore, judgeBRef, judgeCRef, judgeARef, handleDelete
  } = ScoreCompetitorModalPart1(props);

  useEffect(() => {
    if (visible && tournamentId) {
      loadJudges();
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

  if (!visible || !selectedCompetitor?.id) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const hasExistingScore = judgeAScore || judgeBScore || judgeCScore;
  const modalTitle = hasExistingScore ? 'Edit Score' : 'Score Entry';

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Header Row */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                {selectedCompetitor.avatar ? (
                  <Image source={{ uri: selectedCompetitor.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                      {getInitials(selectedCompetitor.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.titleContainer}>
                  <Text style={styles.competitorName}>{selectedCompetitor.name}</Text>
                  <Text style={styles.title}>{modalTitle}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Judges Row */}
            <View style={styles.scoreFields}>
              <View style={styles.scoreField}>
                <Text style={styles.judgeLabel}>{judges[0].name || judges[0].role}</Text>
                <TextInput ref={judgeBRef} style={styles.scoreInput} value={judgeBScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeBScore, judgeCRef)}
                  keyboardType="numeric" maxLength={1} placeholder="0-9" />
              </View>
              <View style={styles.scoreField}>
                <Text style={styles.judgeLabel}>{judges[1].name || judges[1].role}</Text>
                <TextInput ref={judgeCRef} style={styles.scoreInput} value={judgeCScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeCScore, judgeARef)}
                  keyboardType="numeric" maxLength={1} placeholder="0-9" />
              </View>
              <View style={styles.scoreField}>
                <Text style={styles.judgeLabel}>{judges[2].name || judges[2].role}</Text>
                <TextInput ref={judgeARef} style={styles.scoreInput} value={judgeAScore}
                  onChangeText={(text) => handleScoreChange(text, setJudgeAScore)}
                  keyboardType="numeric" maxLength={1} placeholder="0-9" />
              </View>
            </View>
            
            {canSave && (
              <View style={styles.totalScoreContainer}>
                <Text style={styles.totalScoreLabel}>Total Score</Text>
                <Text style={styles.totalScoreValue}>
                  {(parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore)).toFixed(1)}
                </Text>
              </View>
            )}
            
            <VideoManagementSectionFixed 
              competitorId={selectedCompetitor.id} 
              eventId={props.eventId}
              tournamentId={props.tournamentId || ''} 
              scoreId="" 
              competitorName={selectedCompetitor.name}
              eventName="Traditional Forms" 
              judgeScores={[parseInt(judgeAScore) || 0, parseInt(judgeBScore) || 0, parseInt(judgeCScore) || 0]}
              totalScore={parseInt(judgeAScore) + parseInt(judgeBScore) + parseInt(judgeCScore) || 0}
              rank={selectedCompetitor.placement} 
              competitor={selectedCompetitor}
              event={{ name: 'Traditional Forms' }} 
              sortedCompetitors={[]} 
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
              <TouchableOpacity 
                onPress={handleSave} 
                disabled={!canSave || saving || isDeleting}
                style={{ 
                  flex: 1, 
                  backgroundColor: canSave && !saving && !isDeleting ? '#10B981' : '#D1D5DB', 
                  padding: 16, 
                  borderRadius: 8 
                }}
              >
                <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDelete} 
                disabled={saving || isDeleting}
                style={{ 
                  flex: 1, 
                  backgroundColor: saving || isDeleting ? '#D1D5DB' : '#EF4444', 
                  padding: 16, 
                  borderRadius: 8 
                }}
              >
                <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                  {isDeleting ? 'Deleting...' : 'Delete Entry'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}