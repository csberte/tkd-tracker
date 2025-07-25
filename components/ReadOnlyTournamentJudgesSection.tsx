import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import JudgeInfoModal from './JudgeInfoModal';

interface Judge {
  id: string;
  role: string;
  name: string;
}

interface ReadOnlyTournamentJudgesSectionProps {
  tournamentId: string;
}

const DEFAULT_JUDGES: Judge[] = [
  { id: 'judge-b', role: 'Judge B', name: '' },
  { id: 'judge-c', role: 'Judge C', name: '' },
  { id: 'judge-a', role: 'Judge A', name: '' },
];

export default function ReadOnlyTournamentJudgesSection({
  tournamentId
}: ReadOnlyTournamentJudgesSectionProps) {
  const [judges, setJudges] = useState<Judge[]>(DEFAULT_JUDGES);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadJudges();
    }
  }, [tournamentId]);

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

  const handleInfoPress = (judge: Judge) => {
    setSelectedJudge(judge);
    setShowInfoModal(true);
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tournament Judges</Text>
        </View>
        
        <View style={styles.judgesContainer}>
          {judges.map((judge) => (
            <View key={judge.id} style={styles.judgeCard}>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => handleInfoPress(judge)}
              >
                <Ionicons name="information-circle" size={18} color="#3C91E6" />
              </TouchableOpacity>
              <View style={styles.judgeContent}>
                <Text style={styles.judgeName}>
                  {judge.name || judge.role}
                </Text>
                {judge.name && (
                  <Text style={styles.judgeRole}>{judge.role}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
      
      {/* Horizontal divider below judges section */}
      <View style={styles.judgesDivider} />
      
      <JudgeInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        judgeRole={selectedJudge?.role || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  judgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  judgeCard: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  judgeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  judgeName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
    marginBottom: 2,
  },
  judgeRole: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  judgesDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});