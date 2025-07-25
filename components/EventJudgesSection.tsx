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

interface EventJudgesSectionProps {
  eventId: string;
}

export default function EventJudgesSection({ eventId }: EventJudgesSectionProps) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedJudgeRole, setSelectedJudgeRole] = useState('');
  const [eventType, setEventType] = useState<string>('');

  useEffect(() => {
    if (eventId) {
      loadJudges();
    }
  }, [eventId]);

  const loadJudges = async () => {
    try {
      // Get tournament_id and event_type from the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('tournament_id, event_type')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData?.tournament_id) {
        console.error('Error loading event data:', eventError);
        setJudges(getPlaceholderJudges());
        setLoading(false);
        return;
      }

      setEventType(eventData.event_type);

      // Get judges from tournament
      const { data, error } = await supabase
        .from('tournaments')
        .select('judge_a, judge_b, judge_c')
        .eq('id', eventData.tournament_id)
        .single();

      if (error) {
        console.error('Error loading judges:', error);
        setJudges(getPlaceholderJudges());
        return;
      }

      // Create judges array with actual data in B, C, A order
      const loadedJudges = [
        { id: 'judge-b', role: 'Judge B', name: data.judge_b || '' },
        { id: 'judge-c', role: 'Judge C', name: data.judge_c || '' },
        { id: 'judge-a', role: 'Judge A', name: data.judge_a || '' },
      ];
      
      // Check if any judges have names assigned
      const hasAssignedJudges = loadedJudges.some(judge => judge.name.trim() !== '');
      
      if (hasAssignedJudges) {
        setJudges(loadedJudges);
      } else {
        // No judges assigned, use placeholders
        setJudges(getPlaceholderJudges());
      }
    } catch (error) {
      console.error('Error loading judges:', error);
      setJudges(getPlaceholderJudges());
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderJudges = (): Judge[] => {
    return [
      { id: 'judge-b-placeholder', role: 'Judge B', name: '' },
      { id: 'judge-c-placeholder', role: 'Judge C', name: '' },
      { id: 'judge-a-placeholder', role: 'Judge A', name: '' },
    ];
  };

  const handleInfoPress = (judgeRole: string) => {
    setSelectedJudgeRole(judgeRole);
    setShowInfoModal(true);
  };

  if (loading) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Event Judges</Text>
      <View style={styles.judgesContainer}>
        {judges.map((judge) => (
          <View key={judge.id} style={styles.judgeCard}>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => handleInfoPress(judge.role)}
            >
              <Ionicons name="information-circle" size={16} color="#89CFF0" />
            </TouchableOpacity>
            <Text style={styles.judgeName}>{judge.name}</Text>
            <Text style={styles.judgeRole}>{judge.role}</Text>
          </View>
        ))}
      </View>
      <JudgeInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        judgeRole={selectedJudgeRole}
        eventType={eventType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  judgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  judgeCard: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
});