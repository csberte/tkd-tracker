import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface Champion {
  id: string;
  name: string;
  belt: string;
  wins: number;
  losses: number;
  avatar?: string;
}

interface ChampionCardProps {
  champion: Champion;
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
  const colors = ['#D32F2F', '#000000', '#757575', '#FFFFFF'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getTextColor(backgroundColor: string): string {
  return backgroundColor === '#FFFFFF' || backgroundColor === '#757575' ? '#000000' : '#FFFFFF';
}

export default function ChampionCard({ champion, onPress }: ChampionCardProps) {
  const initials = getInitials(champion.name);
  const backgroundColor = getColorFromName(champion.name);
  const textColor = getTextColor(backgroundColor);
  
  // Check if belt/school info should be displayed - remove "Belt" suffix
  const shouldShowBelt = champion.belt && 
    champion.belt.trim() !== '' && 
    champion.belt !== 'Unknown School' &&
    !champion.belt.includes('Unknown');

  // Remove "Belt" suffix from display
  const displayBelt = shouldShowBelt ? champion.belt.replace(/ Belt$/i, '') : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {champion.avatar ? (
            <Image
              source={{ uri: champion.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor }]}>
              <Text style={[styles.initials, { color: textColor }]}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{champion.name}</Text>
            {shouldShowBelt && (
              <Text style={styles.belt} numberOfLines={1} ellipsizeMode="tail">
                {displayBelt}
              </Text>
            )}
          </View>
          <View style={styles.stats}>
            <Text style={styles.stat}>Wins: {champion.wins}</Text>
            <Text style={styles.stat}>Losses: {champion.losses}</Text>
          </View>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  belt: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
    flexShrink: 1,
    maxWidth: 120,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 14,
    color: '#666666',
  },
});