import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScoredCompetitor } from '../app/lib/tieBreaker';

interface TieGroupSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tiedGroups: Record<number, string[]>;
  completedTieGroups: Record<number, string[]>;
  displayCompetitors: ScoredCompetitor[];
  onSelectTieGroup: (score: number, isRedo: boolean) => void;
}

interface TieGroup {
  score: number;
  competitors: ScoredCompetitor[];
  isCompleted: boolean;
}

export default function TieGroupSelectionModal({
  visible,
  onClose,
  tiedGroups,
  completedTieGroups,
  displayCompetitors,
  onSelectTieGroup
}: TieGroupSelectionModalProps) {
  
  const getAllTieGroups = (): TieGroup[] => {
    const groups: TieGroup[] = [];
    
    // Add active tie groups
    Object.entries(tiedGroups).forEach(([score, competitorIds]) => {
      const competitors = displayCompetitors.filter(c => competitorIds.includes(c.id));
      if (competitors.length > 1) {
        groups.push({
          score: Number(score),
          competitors,
          isCompleted: false
        });
      }
    });
    
    // Add completed tie groups
    Object.entries(completedTieGroups).forEach(([score, competitorIds]) => {
      const competitors = displayCompetitors.filter(c => competitorIds.includes(c.id));
      if (competitors.length > 1) {
        groups.push({
          score: Number(score),
          competitors,
          isCompleted: true
        });
      }
    });
    
    // Sort by score descending
    return groups.sort((a, b) => b.score - a.score);
  };
  
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };
  
  const renderTieGroup = ({ item }: { item: TieGroup }) => {
    const { score, competitors, isCompleted } = item;
    const representativeRank = competitors[0]?.rank || 1;
    const competitorNames = competitors.map(c => c.competitor_name).join(', ');
    
    return (
      <TouchableOpacity
        style={[styles.tieGroupItem, isCompleted && styles.completedTieGroup]}
        onPress={() => onSelectTieGroup(score, isCompleted)}
      >
        <View style={styles.tieGroupHeader}>
          <Text style={styles.medalEmoji}>{getMedalEmoji(representativeRank)}</Text>
          <View style={styles.tieGroupInfo}>
            <Text style={styles.competitorNames}>{competitorNames}</Text>
            <Text style={styles.scoreText}>({score} pts)</Text>
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>Resolved</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const allGroups = getAllTieGroups();
  const hasActiveGroups = allGroups.some(g => !g.isCompleted);
  const hasCompletedGroups = allGroups.some(g => g.isCompleted);
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {hasActiveGroups ? 'Select Tie Breaker Group:' : 'Redo Tie Breaker:'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={allGroups}
            renderItem={renderTieGroup}
            keyExtractor={(item) => `${item.score}-${item.isCompleted}`}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
          
          {allGroups.length === 0 && (
            <Text style={styles.noGroupsText}>No tie groups available</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1
  },
  closeButton: {
    padding: 4
  },
  list: {
    maxHeight: 300
  },
  tieGroupItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFC107'
  },
  completedTieGroup: {
    borderColor: '#28A745',
    backgroundColor: '#F8FFF9'
  },
  tieGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  medalEmoji: {
    fontSize: 24,
    marginRight: 12
  },
  tieGroupInfo: {
    flex: 1
  },
  competitorNames: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  scoreText: {
    fontSize: 14,
    color: '#666666'
  },
  completedBadge: {
    backgroundColor: '#28A745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  noGroupsText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginTop: 20
  }
});