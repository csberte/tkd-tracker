import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TournamentClassBadgeProps {
  tournamentClass: string;
}

const getClassColor = (tournamentClass: string): string => {
  const classAbbr = tournamentClass.split(' ')[0]?.toUpperCase();
  switch (classAbbr) {
    case 'AAA':
      return '#FFD700'; // Gold
    case 'AA':
      return '#C0C0C0'; // Silver
    case 'A':
      return '#CD7F32'; // Bronze
    case 'B':
      return '#007BFF'; // Blue
    case 'C':
      return '#808080'; // Gray
    default:
      return '#808080'; // Default gray
  }
};

const getClassAbbreviation = (tournamentClass: string): string => {
  const classAbbr = tournamentClass.split(' ')[0]?.toUpperCase();
  return classAbbr || 'C';
};

export default function TournamentClassBadge({ tournamentClass }: TournamentClassBadgeProps) {
  const backgroundColor = getClassColor(tournamentClass);
  const abbreviation = getClassAbbreviation(tournamentClass);

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.badgeText}>{abbreviation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});