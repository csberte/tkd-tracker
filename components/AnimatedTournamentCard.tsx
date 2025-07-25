import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TournamentClassBadge from './TournamentClassBadge';
import EditTournamentModal from './EditTournamentModal';
import { supabase } from '../app/lib/supabase';

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
  season?: string;
  archived?: boolean;
  class?: string;
}

interface AnimatedTournamentCardProps {
  tournament: Tournament;
  index: number;
  onPress: (id: string) => void;
  onUpdate?: () => void;
}

const isUpcoming = (date: string): boolean => {
  const tournamentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tournamentDate > today;
};

export default function AnimatedTournamentCard({
  tournament,
  index,
  onPress,
  onUpdate
}: AnimatedTournamentCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Tournament',
      `Are you sure you want to delete "${tournament.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    
    // Animate deletion (left to right)
    const nativeDriverAvailable = Platform.OS !== 'web' && Animated?.__isNative !== false;
    Animated.parallel([
      Animated.timing(deleteAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: nativeDriverAvailable,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: nativeDriverAvailable,
      })
    ]).start(async () => {
      try {
        const { error } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', tournament.id);

        if (error) throw error;
        onUpdate?.();
      } catch (error) {
        console.error('Error deleting tournament:', error);
        Alert.alert('Error', 'Failed to delete tournament');
        setIsDeleting(false);
      }
    });
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    onUpdate?.();
  };

  const showUpcoming = isUpcoming(tournament.date);

  return (
    <>
      <Animated.View
        style={[
          styles.tournamentCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { translateX: deleteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 300]
              })}
            ]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => onPress(tournament.id)}
          activeOpacity={0.7}
          style={styles.cardContent}
          disabled={isDeleting}
        >
          <View style={styles.cardLayout}>
            <TournamentClassBadge tournamentClass={tournament.class || 'C'} />
            <View style={styles.contentSection}>
              <View style={styles.headerRow}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                {tournament.season && (
                  <Text style={styles.season}>{tournament.season}</Text>
                )}
              </View>
              {tournament.location && (
                <Text style={styles.tournamentLocation}>{tournament.location}</Text>
              )}
              <Text style={styles.tournamentDate}>
                {new Date(tournament.date).toLocaleDateString()}
              </Text>
              {tournament.class && (
                <Text style={styles.tournamentClass}>{tournament.class}</Text>
              )}
              {showUpcoming && (
                <Text style={styles.upcomingTag}>UPCOMING</Text>
              )}
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleEdit}
                style={styles.editButton}
                disabled={isDeleting}
              >
                <Ionicons name="pencil" size={18} color="#666666" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.deleteButton}
                disabled={isDeleting}
              >
                <Ionicons name="trash" size={18} color="#FF0000" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <EditTournamentModal
        visible={showEditModal}
        tournament={tournament}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 12,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  season: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  tournamentClass: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 4,
  },
  upcomingTag: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
  },
});