import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { promoteCompetitor } from '../app/lib/promoteCompetitor';
import ConfirmationModal from './ConfirmationModal';
import PromotionModal from './PromotionModal';

interface TournamentCompetitor {
  id: string;
  name: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  source_id?: string;
  avatar?: string;
  tournament_competitor_id?: string;
  school?: string;
  location?: string;
  has_video?: boolean;
}

interface HorizontalCompetitorCardProps {
  competitor: TournamentCompetitor;
  onPress: () => void;
  onDelete?: () => void;
  tournamentId?: string;
  refreshCompetitors?: () => void;
  refreshChampions?: () => void;
  refreshTournamentCompetitors?: () => void;
  setCompetitors?: (fn: (old: TournamentCompetitor[]) => TournamentCompetitor[]) => void;
}

function getBadgeIcon(sourceType: string) {
  const badge = {
    Champion: "🥋",
    Competitor: "🤺", 
    Other: "👤"
  }[sourceType] || "👤";
  
  return <Text style={styles.badgeEmoji}>{badge}</Text>;
}

function getInitials(name: string): string {
  try {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  } catch (error) {
    return '??';
  }
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

export default function HorizontalCompetitorCard({ 
  competitor, 
  onPress, 
  onDelete,
  tournamentId,
  refreshCompetitors,
  refreshChampions,
  refreshTournamentCompetitors,
  setCompetitors
}: HorizontalCompetitorCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(competitor?.avatar || null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [currentSourceType, setCurrentSourceType] = useState(competitor.source_type);

  if (!competitor) {
    return null;
  }

  const competitorName = competitor.name || 'Unknown Competitor';
  const tournamentCompetitorId = competitor.id;
  const initials = getInitials(competitorName);
  const avatarBackgroundColor = getColorFromName(competitorName);
  const textColor = getTextColor(avatarBackgroundColor);

  useEffect(() => {
    setCurrentSourceType(competitor.source_type);
    setAvatarUrl(competitor?.avatar || null);
    
    if (!avatarUrl && competitor.source_id && competitor.source_type !== 'Other') {
      loadAvatar();
    }
  }, [competitor]);

  const loadAvatar = async () => {
    if (!competitor.source_id || competitor.source_type === 'Other') {
      return;
    }
    
    try {
      const table = competitor.source_type === 'Champion' ? 'champions' : 'competitors';
      
      const { data, error } = await supabase
        .from(table)
        .select('avatar')
        .eq('id', competitor.source_id)
        .single();
      
      if (error) {
        return;
      }
      
      if (data?.avatar) {
        setAvatarUrl(data.avatar);
      }
    } catch (error) {
      console.log('[Avatar] Error loading avatar:', error);
    }
  };

  const handleRefresh = async () => {
    if (refreshTournamentCompetitors) {
      await refreshTournamentCompetitors();
    }
    if (refreshChampions) {
      await refreshChampions();
    }
    if (refreshCompetitors) {
      await refreshCompetitors();
    }
  };

  const handlePromoteToChampion = async () => {
    try {
      const result = await promoteCompetitor(
        supabase,
        tournamentCompetitorId,
        "Champion",
        { 
          name: competitor.name, 
          avatar: competitor.avatar, 
          school: competitor.school,
          location: competitor.location
        }
      );
      
      setCurrentSourceType('Champion');
      setShowPromotionModal(false);
      
      if (setCompetitors) {
        setCompetitors(prev => prev.map(comp => 
          comp.id === competitor.id 
            ? { ...comp, source_type: 'Champion' as const, source_id: result.source_id }
            : comp
        ));
      }
      
      Alert.alert('Success', `${competitor.name} promoted to Champion`);
      await handleRefresh();
    } catch (error) {
      console.error('Promotion error:', error);
      Alert.alert('Error', 'Failed to promote to Champion');
    }
  };

  const handlePromoteToCompetitor = async () => {
    try {
      const result = await promoteCompetitor(
        supabase,
        tournamentCompetitorId,
        "Competitor",
        { 
          name: competitor.name, 
          avatar: competitor.avatar, 
          school: competitor.school,
          location: competitor.location
        }
      );
      
      setCurrentSourceType('Competitor');
      setShowPromotionModal(false);
      
      if (setCompetitors) {
        setCompetitors(prev => prev.map(comp => 
          comp.id === competitor.id 
            ? { ...comp, source_type: 'Competitor' as const, source_id: result.source_id }
            : comp
        ));
      }
      
      Alert.alert('Success', `${competitor.name} promoted to Competitor`);
      await handleRefresh();
    } catch (error) {
      console.error('Promotion error:', error);
      Alert.alert('Error', 'Failed to promote to Competitor');
    }
  };

  const handleDelete = async () => {
    if (!tournamentCompetitorId) {
      Alert.alert('Delete failed', 'Invalid competitor ID');
      return;
    }

    try {
      const { error: eventError } = await supabase
        .from('event_participants')
        .delete()
        .eq('competitor_id', tournamentCompetitorId);

      if (eventError) {
        console.error('[Delete] Event participants error →', eventError.message);
      }

      const { error } = await supabase
        .from('tournament_competitors')
        .delete()
        .eq('id', tournamentCompetitorId);

      if (error) {
        Alert.alert('Delete failed', error.message);
        return;
      }

      setConfirmOpen(false);
      if (refreshTournamentCompetitors) {
        await refreshTournamentCompetitors();
      }
      if (onDelete) onDelete();
    } catch (error) {
      Alert.alert('Delete failed', 'An unexpected error occurred');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={onPress}>
        {currentSourceType === 'Other' && (
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => setShowPromotionModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#666" />
          </TouchableOpacity>
        )}
        
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatarImage}
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: avatarBackgroundColor }]}>
                <Text style={[styles.initials, { color: textColor }]}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.badge}>
            {getBadgeIcon(currentSourceType)}
          </View>
        </View>
        
        <Text style={styles.name} numberOfLines={2}>{competitorName}</Text>
        
        <View style={styles.actionRow}>
          <Ionicons 
            name="videocam" 
            size={16} 
            color={competitor.has_video ? "#EF4444" : "#FFFFFF"} 
            style={styles.videoIcon}
          />
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => setConfirmOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <ConfirmationModal
        visible={confirmOpen}
        title="Remove Competitor?"
        message={`Are you sure you want to remove ${competitorName} from this tournament?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
      
      <PromotionModal
        visible={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onPromoteToChampion={handlePromoteToChampion}
        onPromoteToCompetitor={handlePromoteToCompetitor}
        competitorName={competitorName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  videoIcon: {
    marginLeft: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  moreButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    zIndex: 1,
  },
});