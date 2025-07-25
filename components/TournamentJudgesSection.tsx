import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';

interface Judge {
  id: string;
  role: string;
  name: string;
}

interface TournamentJudgesSectionProps {
  tournamentId: string;
  showInfoBubble?: boolean;
  judges?: Judge[];
  onJudgesUpdate?: (judges: Judge[]) => void;
  editable?: boolean;
}

const DEFAULT_JUDGES: Judge[] = [
  { id: 'judge-b', role: 'Judge B', name: '' },
  { id: 'judge-c', role: 'Judge C', name: '' },
  { id: 'judge-a', role: 'Judge A', name: '' },
];

export default function TournamentJudgesSection({
  tournamentId,
  showInfoBubble = false,
  judges,
  onJudgesUpdate,
  editable = true
}: TournamentJudgesSectionProps) {
  const [currentJudges, setCurrentJudges] = useState<Judge[]>(judges || DEFAULT_JUDGES);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJudges, setEditingJudges] = useState<Judge[]>(currentJudges);
  const [loading, setLoading] = useState(false);

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
      
      setCurrentJudges(loadedJudges);
      setEditingJudges(loadedJudges);
    } catch (error) {
      console.error('Error loading judges:', error);
    }
  };

  const saveJudges = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          judge_a: editingJudges.find(j => j.id === 'judge-a')?.name || '',
          judge_b: editingJudges.find(j => j.id === 'judge-b')?.name || '',
          judge_c: editingJudges.find(j => j.id === 'judge-c')?.name || '',
        })
        .eq('id', tournamentId);

      if (error) {
        Alert.alert('Error', 'Failed to save judges');
        return;
      }

      setCurrentJudges([...editingJudges]);
      setIsEditing(false);
      
      if (onJudgesUpdate) {
        onJudgesUpdate(editingJudges);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save judges');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      saveJudges();
    } else {
      setEditingJudges([...currentJudges]);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setEditingJudges([...currentJudges]);
    setIsEditing(false);
  };

  const handleJudgeNameChange = (judgeId: string, name: string) => {
    setEditingJudges(prev => 
      prev.map(judge => 
        judge.id === judgeId ? { ...judge, name } : judge
      )
    );
  };

  const displayJudges = isEditing ? editingJudges : currentJudges;

  return (
    <View style={componentStyles.sectionContainer}>
      <View style={componentStyles.section}>
        <View style={componentStyles.sectionHeader}>
          <View style={componentStyles.titleContainer}>
            <Text style={componentStyles.sectionTitle}>Tournament Judges</Text>
          </View>
          {editable && (
            <View style={componentStyles.editButtonsContainer}>
              {isEditing && (
                <TouchableOpacity onPress={handleCancel} style={componentStyles.cancelButton}>
                  <Ionicons name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={handleEditToggle} 
                style={componentStyles.editButton}
                disabled={loading}
              >
                <Ionicons 
                  name={isEditing ? "checkmark" : "pencil"} 
                  size={18} 
                  color={loading ? "#999" : "#007AFF"} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={componentStyles.judgesContainer}>
          {displayJudges.map((judge) => (
            <View key={judge.id} style={componentStyles.judgeCard}>
              {isEditing ? (
                <View style={componentStyles.editingContainer}>
                  <TextInput
                    style={componentStyles.judgeInput}
                    value={judge.name}
                    onChangeText={(text) => handleJudgeNameChange(judge.id, text)}
                    placeholder={judge.role}
                    placeholderTextColor="#999"
                  />
                  <Text style={componentStyles.judgeRole}>{judge.role}</Text>
                </View>
              ) : (
                <View style={componentStyles.displayContainer}>
                  <Text style={componentStyles.judgeName}>
                    {judge.name || judge.role}
                  </Text>
                  {judge.name && (
                    <Text style={componentStyles.judgeRole}>{judge.role}</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const componentStyles = StyleSheet.create({
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
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
  },
  editingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  displayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  judgeInput: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
    marginBottom: 4,
    minWidth: 60,
    color: '#333',
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