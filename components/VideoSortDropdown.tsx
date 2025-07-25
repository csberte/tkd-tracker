import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SortOption = 'date' | 'tournament' | 'event' | 'competitor';

interface VideoSortDropdownProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const sortOptions = [
  { value: 'date' as SortOption, label: 'Date', icon: 'calendar' },
  { value: 'tournament' as SortOption, label: 'Tournament', icon: 'trophy' },
  { value: 'event' as SortOption, label: 'Event', icon: 'ribbon' },
  { value: 'competitor' as SortOption, label: 'Competitor', icon: 'person' },
];

export default function VideoSortDropdown({ 
  sortBy, 
  onSortChange, 
  showModal, 
  setShowModal 
}: VideoSortDropdownProps) {
  const currentSort = sortOptions.find(option => option.value === sortBy);
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.sortPill}
        onPress={() => setShowModal(!showModal)}
      >
        <Ionicons name="calendar" size={16} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.sortText}>{currentSort?.label}</Text>
        <Ionicons 
          name={showModal ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
      
      {showModal && (
        <View style={styles.dropdown}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                sortBy === option.value && styles.selectedOption
              ]}
              onPress={() => {
                onSortChange(option.value);
                setShowModal(false);
              }}
            >
              <Text style={[
                styles.optionText,
                sortBy === option.value && styles.selectedText
              ]}>
                {option.label}
              </Text>
              {sortBy === option.value && (
                <Ionicons name="checkmark" size={16} color="#FF0000" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 3,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
  },
  icon: {
    marginRight: 6,
  },
  sortText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 150,
    zIndex: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  selectedText: {
    color: '#FF0000',
    fontWeight: '600',
  },
});