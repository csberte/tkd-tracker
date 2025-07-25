import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';

type FilterType = 'All' | 'Champions' | 'Competitors' | 'Other';

interface CompetitorFilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function CompetitorFilterPills({ activeFilter, onFilterChange }: CompetitorFilterPillsProps) {
  const filters: FilterType[] = ['All', 'Champions', 'Competitors', 'Other'];
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handleFilterPress = (filter: FilterType) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onFilterChange(filter);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.pill,
            activeFilter === filter && styles.activePill
          ]}
          onPress={() => handleFilterPress(filter)}
        >
          <Text style={[
            styles.pillText,
            activeFilter === filter && styles.activePillText
          ]}>
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 6,
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activePill: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  activePillText: {
    color: '#FFFFFF',
  },
});