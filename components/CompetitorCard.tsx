import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TieBreakerInfoIcon from './TieBreakerInfoIcon';

interface Competitor {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  school: string;
  avatar?: string;
  tie_breaker_status?: string;
  has_video?: boolean;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onPress: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function CompetitorCard({ competitor, onPress }: CompetitorCardProps) {
  const initials = getInitials(competitor.name);
  const backgroundColor = getColorFromName(competitor.name);
  
  const locationInfo = competitor.location && 
    competitor.location.trim() !== '' && 
    competitor.location !== 'Unknown' 
    ? competitor.location 
    : (competitor.school && 
       competitor.school.trim() !== '' && 
       competitor.school !== 'Unknown School' &&
       !competitor.school.includes('Unknown')
       ? competitor.school 
       : '');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {competitor.avatar ? (
            <Image
              source={{ uri: competitor.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor }]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.header}>
            <View style={styles.nameColumn}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{competitor.name}</Text>
                {competitor.tie_breaker_status && (
                  <TieBreakerInfoIcon status={competitor.tie_breaker_status} />
                )}
              </View>
            </View>
            {locationInfo && (
              <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">
                {locationInfo}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actionSection}>
          <Ionicons 
            name="videocam" 
            size={20} 
            color={competitor.has_video ? "#EF4444" : "#FFFFFF"} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameColumn: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  location: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
    flexShrink: 1,
    maxWidth: 120,
  },
  actionSection: {
    marginLeft: 8,
  },
});