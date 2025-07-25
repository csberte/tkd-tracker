import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';

interface Champion {
  id: string;
  name: string;
  email: string;
}

interface AddTournamentCompetitorModalFixedProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: string;
}

export default function AddTournamentCompetitorModalFixed({
  visible,
  onClose,
  onSuccess,
  tournamentId
}: AddTournamentCompetitorModalFixedProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [showChampionList, setShowChampionList] = useState(false);

  useEffect(() => {
    if (visible) {
      loadChampions();
    }
  }, [visible]);

  const loadChampions = async () => {
    try {
      const { data, error } = await supabase
        .from('champions')
        .select('id, name, email')
        .order('name');
      
      if (error) {
        console.error('Error loading champions:', error);
      } else {
        setChampions(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSelectChampion = (champion: Champion) => {
    setSelectedChampion(champion);
    setName(champion.name);
    setEmail(champion.email);
    setShowChampionList(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }

    setLoading(true);
    
    try {
      let championId = selectedChampion?.id;
      
      // If no champion selected, try to find or create one
      if (!championId) {
        // Check if champion exists by name
        const { data: existingChampion } = await supabase
          .from('champions')
          .select('id')
          .eq('name', name.trim())
          .single();
        
        if (existingChampion) {
          championId = existingChampion.id;
        } else {
          // Create new champion
          const { data: newChampion, error: championError } = await supabase
            .from('champions')
            .insert({
              name: name.trim(),
              email: email.trim(),
              wins: 0,
              losses: 0
            })
            .select('id')
            .single();
          
          if (championError) {
            console.error('Error creating champion:', championError);
            Alert.alert('Error', 'Failed to create champion');
            return;
          }
          
          championId = newChampion.id;
        }
      }

      // Add tournament competitor with champion_id
      const { error } = await supabase
        .from('tournament_competitors')
        .insert({
          tournament_id: tournamentId,
          name: name.trim(),
          email: email.trim(),
          champion_id: championId // Ensure champion_id is always set
        });

      if (error) {
        console.error('Error adding competitor:', error);
        Alert.alert('Error', 'Failed to add competitor');
        return;
      }

      Alert.alert('Success', 'Competitor added successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setSelectedChampion(null);
    setShowChampionList(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Competitor</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Select Existing Champion (Optional)</Text>
            <TouchableOpacity 
              style={styles.championSelector}
              onPress={() => setShowChampionList(!showChampionList)}
            >
              <Text style={styles.championSelectorText}>
                {selectedChampion ? selectedChampion.name : 'Select a champion or create new'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            {showChampionList && (
              <View style={styles.championList}>
                {champions.map((champion) => (
                  <TouchableOpacity
                    key={champion.id}
                    style={styles.championItem}
                    onPress={() => handleSelectChampion(champion)}
                  >
                    <Text style={styles.championName}>{champion.name}</Text>
                    <Text style={styles.championEmail}>{champion.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter competitor name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding...' : 'Add Competitor'}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  championSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  championSelectorText: {
    fontSize: 16,
    color: '#374151',
  },
  championList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
  },
  championItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  championName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  championEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});