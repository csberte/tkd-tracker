import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { promoteCompetitor } from '../app/lib/promoteCompetitor';
import PromotionModal from './PromotionModal';
import ConfirmationModal from './ConfirmationModal';
import EditCompetitorModal from './EditCompetitorModal';
import TieBreakerInfoIcon from './TieBreakerInfoIcon';

interface TournamentCompetitor {
  id: string;
  name: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  source_id?: string;
  avatar?: string;
  school?: string;
  tie_breaker_status?: string;
}

interface Props {
  competitor: TournamentCompetitor;
  onUpdate?: () => void;
  onDelete?: () => void;
  tournamentId: string;
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

const getRoleEmoji = (type: string) => {
  switch (type) {
    case 'Champion': return '🥋';
    case 'Competitor': return '🤺';
    case 'Other': return '👤';
    default: return '👤';
  }
};

export default function TournamentCompetitorCard({ competitor, onUpdate, onDelete, tournamentId }: Props) {
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const initials = getInitials(competitor.name);
  const backgroundColor = getColorFromName(competitor.name);
  const shouldShowSchool = competitor.school && competitor.school.trim() !== '' && !competitor.school.includes('Unknown');

  const handlePromoteToChampion = async () => {
    try {
      await promoteCompetitor(
        supabase,
        competitor.id,
        "Champion",
        { name: competitor.name, avatar: competitor.avatar, school: competitor.school }
      );
      
      setShowPromotionModal(false);
      onUpdate?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to promote to champion');
    }
  };

  const handlePromoteToCompetitor = async () => {
    try {
      await promoteCompetitor(
        supabase,
        competitor.id,
        "Competitor",
        { name: competitor.name, avatar: competitor.avatar, school: competitor.school }
      );
      
      setShowPromotionModal(false);
      onUpdate?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to promote to competitor');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('tournament_competitors')
        .delete()
        .eq('id', competitor.id)
        .eq('tournament_id', tournamentId);

      if (error) {
        Alert.alert('Error', 'Failed to delete competitor');
      } else {
        setShowDeleteModal(false);
        onDelete?.();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete competitor');
    }
  };

  const handleCardPress = () => {
    if (competitor.source_type === 'Other') {
      setShowEditModal(true);
    }
  };

  const handleEditSuccess = () => {
    onUpdate?.();
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handleCardPress}
      activeOpacity={competitor.source_type === 'Other' ? 0.7 : 1}
    >
      {competitor.tie_breaker_status && (
        <View style={styles.tieBreakerIconContainer}>
          <TieBreakerInfoIcon status={competitor.tie_breaker_status} />
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => setShowPromotionModal(true)}
      >
        <Ionicons name="ellipsis-vertical" size={16} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => setShowDeleteModal(true)}
      >
        <Ionicons name="trash" size={16} color="#FF3B30" />
      </TouchableOpacity>

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
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{getRoleEmoji(competitor.source_type)}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{competitor.name}</Text>
          {shouldShowSchool && (
            <Text style={styles.school} numberOfLines={1} ellipsizeMode="tail">
              {competitor.school}
            </Text>
          )}
        </View>
      </View>
      
      <PromotionModal
        visible={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onPromoteToChampion={handlePromoteToChampion}
        onPromoteToCompetitor={handlePromoteToCompetitor}
        competitorName={competitor.name}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Competitor"
        message="Are you sure you want to delete this competitor from the tournament? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDestructive
      />

      {competitor.source_type === 'Other' && (
        <EditCompetitorModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
          competitor={{
            id: competitor.source_id || competitor.id,
            name: competitor.name,
            avatar: competitor.avatar,
            school: competitor.school,
            location: '',
            age: null
          }}
        />
      )}
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
    position: 'relative',
    width: 120,
    height: 120,
    aspectRatio: 1,
  },
  tieBreakerIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2
  },
  moreButton: {
    position: 'absolute',
    top: 8,
    left: 32,
    padding: 4,
    zIndex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emojiContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 14,
  },
  info: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },
  school: {
    fontSize: 10,
    color: '#FF0000',
    fontWeight: '600',
    textAlign: 'center',
  },
});