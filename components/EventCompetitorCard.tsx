import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TieBreakerInfoIcon from './TieBreakerInfoIcon';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  school?: string;
  tie_breaker_status?: string;
  has_video?: boolean;
}

interface Props {
  competitor: Competitor;
  onRemove: (id: string) => void;
  animatedValue?: Animated.Value;
}

export default function EventCompetitorCard({ competitor, onRemove, animatedValue }: Props) {
  const getSourceColor = () => {
    switch (competitor.source_type) {
      case 'Champion': return '#FFD700';
      case 'Competitor': return '#007AFF';
      default: return '#666666';
    }
  };

  const cardStyle = animatedValue ? {
    opacity: animatedValue,
    transform: [{
      scale: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1]
      })
    }]
  } : {};

  return (
    <Animated.View style={[styles.container, cardStyle]}>
      {competitor.tie_breaker_status && (
        <View style={styles.tieBreakerIconContainer}>
          <TieBreakerInfoIcon status={competitor.tie_breaker_status} />
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {competitor.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name}>{competitor.name}</Text>
          {competitor.school && (
            <Text style={styles.school}>{competitor.school}</Text>
          )}
          <View style={[styles.badge, { backgroundColor: getSourceColor() }]}>
            <Text style={styles.badgeText}>{competitor.source_type}</Text>
          </View>
        </View>
        
        <View style={styles.actionSection}>
          <Ionicons 
            name="videocam" 
            size={18} 
            color={competitor.has_video ? "#EF4444" : "#FFFFFF"} 
            style={styles.videoIcon}
          />
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => onRemove(competitor.id)}
          >
            <Ionicons name="trash" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative'
  },
  tieBreakerIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666'
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2
  },
  school: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  videoIcon: {
    marginRight: 4
  },
  removeButton: {
    padding: 8
  }
});