import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { useAuth } from './AuthProvider';
import CustomImagePicker from './ImagePicker';
import AnimatedModal from './AnimatedModal';

interface AddCompetitorModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  refreshCompetitors?: () => void;
  tournamentId?: string; // Made optional
}

export default function AddCompetitorModal({ visible, onClose, onSuccess, refreshCompetitors, tournamentId }: AddCompetitorModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      clearForm();
    }
  }, [visible]);

  const handleAddCompetitor = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      if (tournamentId) {
        // Adding to tournament - use tournament_competitors table
        if (tournamentId.startsWith('temp-')) {
          Alert.alert('Error', 'Invalid tournament ID. Please save the tournament first.');
          return;
        }

        const { data, error } = await supabase
          .from('tournament_competitors')
          .insert({
            tournament_id: tournamentId,
            name: name.trim(),
            location: location.trim() || null,
            age: age ? parseInt(age) : null,
            school: school.trim() || null,
            avatar: avatarUrl || null,
            source_type: 'manual'
          })
          .select()
          .single();

        if (error) {
          Alert.alert('Error', `Failed to add competitor: ${error.message}`);
          return;
        }

        // Update avatar with real competitor ID if needed
        if (avatarUrl && data.id) {
          await supabase
            .from('tournament_competitors')
            .update({ avatar: avatarUrl })
            .eq('id', data.id);
        }
      } else {
        // Adding to global competitors - use competitors table
        const { data, error } = await supabase
          .from('competitors')
          .insert({
            user_id: user.id,
            name: name.trim(),
            email: email.trim() || null,
            location: location.trim() || null,
            age: age ? parseInt(age) : null,
            school: school.trim() || null,
            avatar: avatarUrl || null
          })
          .select()
          .single();

        if (error) {
          Alert.alert('Error', `Failed to add competitor: ${error.message}`);
          return;
        }

        // Update avatar with real competitor ID if needed
        if (avatarUrl && data.id) {
          await supabase
            .from('competitors')
            .update({ avatar: avatarUrl })
            .eq('id', data.id);
        }
      }
      
      clearForm();
      onSuccess();
      if (refreshCompetitors) {
        await refreshCompetitors();
      }
      onClose();
    } catch (error) {
      console.error('Error adding competitor:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName('');
    setLocation('');
    setAge('');
    setSchool('');
    setEmail('');
    setAvatarUrl('');
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.overlay}>
        <AnimatedModal visible={visible} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Competitor</Text>
            <TouchableOpacity onPress={handleAddCompetitor} disabled={loading}>
              <Text style={[styles.saveButton, loading && styles.disabledButton]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter competitor name"
                autoFocus
              />
            </View>

            {!tournamentId && (
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Enter age"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>School</Text>
              <TextInput
                style={styles.input}
                value={school}
                onChangeText={setSchool}
                placeholder="Enter school"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Avatar</Text>
              <CustomImagePicker
                value={avatarUrl}
                onImageSelected={setAvatarUrl}
                tableName="competitors"
                recordId={undefined}
              />
            </View>
          </View>
        </AnimatedModal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    fontSize: 16,
    color: '#FF0000',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#CCCCCC',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});