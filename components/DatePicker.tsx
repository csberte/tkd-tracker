import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarModal from './CalendarModal';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, placeholder = 'Select Date (YYYY-MM-DD)' }: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleDateSelect = (date: string) => {
    onChange(date);
    setShowCalendar(false);
    setIsFocused(false);
  };

  const handlePress = () => {
    setShowCalendar(true);
    setIsFocused(true);
  };

  const handleClose = () => {
    setShowCalendar(false);
    setIsFocused(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.container,
          isFocused && styles.containerFocused
        ]} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>
      
      <CalendarModal
        visible={showCalendar}
        onClose={handleClose}
        onDateSelect={handleDateSelect}
        selectedDate={value}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    minHeight: 48,
  },
  containerFocused: {
    borderColor: '#E4002B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholder: {
    color: '#999999',
  },
});