import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

interface EventCardProps {
  eventType: string;
  isAdded: boolean;
  participantCount?: number;
  onPress?: () => void;
  tournamentId?: string;
  disabled?: boolean;
}

export default function EventCard({ eventType, isAdded, participantCount = 0, onPress, disabled = false }: EventCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={disabled ? 1 : 0.9}
      disabled={disabled}
    >
      <Animated.View 
        style={[
          styles.card,
          disabled && styles.disabledCard,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={[styles.redStripe, disabled && styles.disabledStripe]} />
        <View style={styles.content}>
          <Text style={[styles.eventText, disabled && styles.disabledText]}>
            {eventType}
          </Text>
          {participantCount > 0 && (
            <Text style={[styles.participantText, disabled && styles.disabledText]}>
              {participantCount} Participant{participantCount !== 1 ? 's' : ''}
            </Text>
          )}
          {disabled && (
            <Text style={styles.loadingText}>
              Loading...
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#FF3B30',
    shadowOffset: { width: -4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  disabledCard: {
    backgroundColor: '#F5F5F5',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  redStripe: {
    width: 4,
    backgroundColor: '#DC3545',
  },
  disabledStripe: {
    backgroundColor: '#CCCCCC',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  eventText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  disabledText: {
    color: '#999999',
  },
  participantText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    fontStyle: 'italic',
  },
});