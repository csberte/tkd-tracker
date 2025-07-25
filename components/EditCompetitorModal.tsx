import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';
import ImagePickerFixed from './ImagePickerFixed';
import AnimatedModal from './AnimatedModal';

interface EditCompetitorModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competitor: any;
}

export default function EditCompetitorModal({ visible, onClose, onSuccess, competitor }: EditCompetitorModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (competitor) {
      setName(competitor.name || '');
      setLocation(competitor.location || '');
      setAge(competitor.age ? competitor.age.toString() : '');
      setSchool(competitor.school || '');
      setAvatarUrl(competitor.avatar || '');
    }
  }, [competitor]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('competitors')
        .update({
          name: name.trim(),
          location: location.trim() || null,
          age: age ? parseInt(age) : null,
          school: school.trim() || null,
          avatar: avatarUrl.trim() || null,
        })
        .eq('id', competitor.id);

      if (error) {
        console.error('Error updating competitor:', error);
        Alert.alert('Error', 'Failed to update competitor');
      } else {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error updating competitor:', error);
      Alert.alert('Error', 'Failed to update competitor');
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
            <Text style={styles.title}>Edit Competitor</Text>
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
                placeholder="Enter competitor name"
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
              <ImagePickerFixed
                value={avatarUrl}
                onImageSelected={setAvatarUrl}
                tableName="competitors"
                recordId={competitor?.id?.toString()}
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