import React, { useEffect, useRef } from 'react';
import { Animated, Platform, TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TournamentCompetitorCard from './TournamentCompetitorCard';

interface TournamentCompetitor {
  id: string;
  name: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  source_id?: string;
  avatar?: string;
  school?: string;
}

interface AnimatedHorizontalCompetitorCardProps {
  competitor: TournamentCompetitor;
  index: number;
  onPress: () => void;
  tournamentId?: string;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export default function AnimatedHorizontalCompetitorCard({ 
  competitor, 
  index, 
  onPress, 
  tournamentId,
  onUpdate,
  onDelete 
}: AnimatedHorizontalCompetitorCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const nativeDriverAvailable = Platform.OS !== 'web' && Animated?.__isNative !== false;
    const delay = index * 75;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: nativeDriverAvailable,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: nativeDriverAvailable,
      })
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TournamentCompetitorCard
        competitor={competitor}
        onUpdate={onUpdate}
        onDelete={onDelete}
        tournamentId={tournamentId || ''}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    marginRight: 12,
  },
});