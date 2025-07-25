import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';
import ImagePickerFixed from './ImagePickerFixed';
import AnimatedModal from './AnimatedModal';

interface EditChampionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  champion: any;
}

export default function EditChampionModal({ visible, onClose, onSuccess, champion }: EditChampionModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (champion) {
      setName(champion.name || '');
      setLocation(champion.location || '');
      setSchool(champion.school || '');
      setAvatarUrl(champion.avatar || '');
    }
  }, [champion]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('champions')
        .update({
          name: name.trim(),
          location: location.trim() || null,
          school: school.trim() || null,
          avatar: avatarUrl.trim() || null,
        })
        .eq('id', champion.id);

      if (error) {
        console.error('Error updating champion:', error);
        Alert.alert('Error', 'Failed to update champion');
      } else {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error updating champion:', error);
      Alert.alert('Error', 'Failed to update champion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.overlay}>
        <AnimatedModal visible={visible} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Champion</Text>
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
              <ImagePickerFixed
                value={avatarUrl}
                onImageSelected={setAvatarUrl}
                tableName="champions"
                recordId={champion?.id?.toString()}
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