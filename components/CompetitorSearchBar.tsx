import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CompetitorSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function CompetitorSearchBar({ value, onChangeText }: CompetitorSearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#666666" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search competitors…"
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#999999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
});