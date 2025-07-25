import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { useAuth } from './AuthProvider';
import CustomImagePicker from './ImagePicker';
import AnimatedModal from './AnimatedModal';

interface AddChampionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  refreshChampions?: () => void;
}

export default function AddChampionModal({ visible, onClose, onSuccess, refreshChampions }: AddChampionModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a champion');
      return;
    }

    setLoading(true);
    console.log('Adding new champion:', { name: name.trim(), location, school, user_id: user.id });
    
    try {
      const { data, error } = await supabase
        .from('champions')
        .insert({
          name: name.trim(),
          location: location.trim() || null,
          school: school.trim() || null,
          avatar: avatarUrl || null,
          wins: 0,
          losses: 0,
          email: '',
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding champion:', error);
        Alert.alert('Error', 'Failed to add champion');
      } else {
        console.log('Champion added successfully:', data);
        
        // CRITICAL FIX: Now update avatar with real champion ID if avatar was uploaded
        if (avatarUrl && data.id) {
          console.log('Updating champion avatar with real ID:', data.id);
          const { error: updateError } = await supabase
            .from('champions')
            .update({ avatar: avatarUrl })
            .eq('id', data.id);
          
          if (updateError) {
            console.error('Error updating champion avatar:', updateError);
          } else {
            console.log('Champion avatar updated successfully');
          }
        }
        
        clearForm();
        
        // Call both refresh functions
        if (refreshChampions) {
          console.log('Calling refreshChampions...');
          await refreshChampions();
          console.log('refreshChampions completed');
        }
        
        console.log('Calling onSuccess...');
        await onSuccess();
        console.log('onSuccess completed');
        
        onClose();
      }
    } catch (error) {
      console.error('Error adding champion:', error);
      Alert.alert('Error', 'Failed to add champion');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName('');
    setLocation('');
    setSchool('');
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
            <Text style={styles.title}>Add Champion</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={loading}>
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
                placeholder="Enter champion name"
                autoFocus
              />
            </View>

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
                tableName="champions"
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