import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TiebreakerCompetitorCardProps {
  competitor: any;
  isInTieGroup: boolean;
  isSelected: boolean;
  tieBreakerMode: boolean;
  onPress: () => void;
  onTieBreakerSelect: () => void;
}

export default function TiebreakerCompetitorCard({
  competitor,
  isInTieGroup,
  isSelected,
  tieBreakerMode,
  onPress,
  onTieBreakerSelect
}: TiebreakerCompetitorCardProps) {
  const handlePress = () => {
    if (tieBreakerMode && isInTieGroup) {
      onTieBreakerSelect();
    } else if (!tieBreakerMode) {
      onPress();
    }
  };

  const getCardStyle = () => {
    let style = [styles.card];
    
    if (tieBreakerMode && isInTieGroup) {
      style.push(styles.tieGroupCard);
      if (isSelected) {
        style.push(styles.selectedCard);
      }
    }
    
    return style;
  };

  const getRankDisplay = () => {
    const rank = competitor.final_rank || competitor.rank;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank?.toString() || '-';
  };

  return (
    <TouchableOpacity
      style={getCardStyle()}
      onPress={handlePress}
      disabled={tieBreakerMode && !isInTieGroup}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{getRankDisplay()}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>{competitor.name}</Text>
        <Text style={styles.scoreText}>
          Score: {competitor.totalScore?.toFixed(1) || '0.0'}
        </Text>
        {competitor.medal && (
          <Text style={styles.medalText}>{competitor.medal}</Text>
        )}
      </View>
      
      {tieBreakerMode && isInTieGroup && (
        <View style={styles.selectionIndicator}>
          <Text style={styles.selectionText}>
            {isSelected ? '✅' : '⭕'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tieGroupCard: {
    borderWidth: 2,
    borderColor: '#FF6B35'
  },
  selectedCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF6B35'
  },
  rankContainer: {
    width: 40,
    alignItems: 'center'
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  medalText: {
    fontSize: 14,
    marginTop: 2
  },
  selectionIndicator: {
    width: 30,
    alignItems: 'center'
  },
  selectionText: {
    fontSize: 20
  }
});