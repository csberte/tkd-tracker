import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Switch, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTournament } from '../app/lib/supabaseHelpers';
import { useAuth } from './AuthProvider';
import DatePicker from './DatePicker';
import Dropdown from './Dropdown';
import AnimatedModal from './AnimatedModal';
import { styles } from './AddTournamentModalStyles';

interface AddTournamentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TOURNAMENT_CLASSES = [
  'AAA - Worlds',
  'AA - Nationals', 
  'A - Regional',
  'B - Regional',
  'C - Inner-School',
  'Other'
];

const SEASONS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028'
];

const { height: screenHeight } = Dimensions.get('window');

export default function AddTournamentModal({ visible, onClose, onSuccess }: AddTournamentModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [tournamentClass, setTournamentClass] = useState('A - Regional');
  const [season, setSeason] = useState('2025-2026');
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleArchivedChange = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Archive this tournament?',
        'This tournament will not appear in the current-season list. You can unarchive it later.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setArchived(false) },
          { text: 'Archive', style: 'destructive', onPress: () => setArchived(true) },
        ]
      );
    } else {
      setArchived(false);
    }
  };

  const handleInfoPress = () => {
    Alert.alert(
      'What is "Archived"?',
      'Archived tournaments will be hidden from the Current Season list and shown only in the Archived tab.'
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !date.trim() || !user) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log('[DEBUG] Submitting tournament with class:', tournamentClass);
      
      await createTournament({
        name: name.trim(),
        location: location.trim(),
        date,
        class: tournamentClass,
        season,
        archived,
        user_id: user.id
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding tournament:', error);
      Alert.alert('Error', 'Failed to add tournament');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setLocation('');
    setDate('');
    setTournamentClass('A - Regional');
    setSeason('2025-2026');
    setArchived(false);
    setFocusedField('');
  };

  const formValid = name.trim() && date.trim();
  const needsScroll = screenHeight < 780;

  const renderContent = () => (
    <>
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Tournament Name
          <Text style={styles.asterisk}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'name' && styles.inputFocused
          ]}
          placeholder="Enter tournament name"
          placeholderTextColor="#999999"
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField('')}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'location' && styles.inputFocused
          ]}
          placeholder="Enter location"
          placeholderTextColor="#999999"
          value={location}
          onChangeText={setLocation}
          onFocus={() => setFocusedField('location')}
          onBlur={() => setFocusedField('')}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Date
          <Text style={styles.asterisk}>*</Text>
        </Text>
        <View style={styles.datePickerContainer}>
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Select Date (YYYY-MM-DD)"
          />
          <Ionicons 
            name="calendar" 
            size={20} 
            color="#D4AF37" 
            style={styles.calendarIcon}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Tournament Class
          <Text style={styles.asterisk}>*</Text>
        </Text>
        <View style={styles.dropdownContainer}>
          <Dropdown
            value={tournamentClass}
            options={TOURNAMENT_CLASSES}
            onSelect={setTournamentClass}
            placeholder="Select Tournament Class"
            zIndex={2000}
          />
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color="#666" 
            style={styles.dropdownIcon}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Season
          <Text style={styles.asterisk}>*</Text>
        </Text>
        <View style={styles.dropdownContainer}>
          <Dropdown
            value={season}
            options={SEASONS}
            onSelect={setSeason}
            placeholder="Select Season"
            zIndex={1000}
          />
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color="#666" 
            style={styles.dropdownIcon}
          />
        </View>
      </View>

      <View style={styles.archiveSection}>
        <Text style={styles.fieldLabel}>Archived</Text>
        <View style={styles.switchRow}>
          <Switch
            value={archived}
            onValueChange={handleArchivedChange}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={archived ? '#f5dd4b' : '#f4f3f4'}
          />
          <TouchableOpacity style={styles.infoIcon} onPress={handleInfoPress}>
            <Ionicons name="information-circle-outline" size={20} color="#5AA2E6" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.overlay}>
        <AnimatedModal visible={visible} style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Tournament</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {needsScroll ? (
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          ) : (
            <View style={styles.content}>
              {renderContent()}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!formValid || loading) && styles.submitButtonDisabled,
                buttonPressed && styles.submitButtonPressed
              ]}
              onPress={handleSubmit}
              disabled={!formValid || loading}
              onPressIn={() => setButtonPressed(true)}
              onPressOut={() => setButtonPressed(false)}
              activeOpacity={1}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Tournament'}
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedModal>
      </View>
    </Modal>
  );
}