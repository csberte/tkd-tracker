import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeRank, getRankEmoji, getPlacementText } from '../app/lib/rankUtils';
import VideoActionButtonsWithClipboardFix from './VideoActionButtonsWithClipboardFix';

interface TraditionalFormsCompetitorCardProps {
  competitor: any;
  onPress: (competitor: any) => void;
  tieBreakerActive?: boolean;
  selectedWinners?: string[];
  onTieBreakerSelect?: (competitorId: string) => void;
  eventId: string;
  eventName?: string;
  tournamentName?: string;
  tournamentClass?: string;
  onVideoUploaded?: () => void;
}

export default function TraditionalFormsCompetitorCardWithClipboardFix({
  competitor,
  onPress,
  tieBreakerActive,
  selectedWinners = [],
  onTieBreakerSelect,
  eventId,
  eventName,
  tournamentName,
  tournamentClass,
  onVideoUploaded
}: TraditionalFormsCompetitorCardProps) {
  const name = competitor?.name || `${competitor?.first_name || ''} ${competitor?.last_name || ''}`.trim();
  const totalScore = competitor?.total_score || competitor?.totalScore || 0;
  const hasBeenScored = totalScore > 0;
  
  // Use normalized rank (integer)
  const rank = normalizeRank(competitor?.final_rank || competitor?.rank);
  const isSelected = selectedWinners.includes(competitor?.id || competitor?.tournament_competitor_id);
  
  // Get medal emoji and placement text
  const medalEmoji = rank && rank <= 3 ? getRankEmoji(rank) : null;
  const placementText = rank && rank <= 3 ? getPlacementText(rank) : null;
  
  const handlePress = () => {
    if (tieBreakerActive && onTieBreakerSelect) {
      onTieBreakerSelect(competitor?.id || competitor?.tournament_competitor_id);
    } else {
      onPress(competitor);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        tieBreakerActive && styles.tieBreakerCard,
        isSelected && styles.selectedCard
      ]} 
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{name}</Text>
          {hasBeenScored && (
            <View style={styles.scoreSection}>
              <Text style={styles.score}>Score: {totalScore}</Text>
              {medalEmoji && (
                <View style={styles.medalSection}>
                  <Text style={styles.medal}>{medalEmoji}</Text>
                  {placementText && (
                    <Text style={styles.placement}>{placementText}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        
        {tieBreakerActive && (
          <View style={styles.tieBreakerIndicator}>
            <Ionicons 
              name={isSelected ? "checkmark-circle" : "radio-button-off"} 
              size={24} 
              color={isSelected ? "#34C759" : "#999"} 
            />
          </View>
        )}
      </View>
      
      {hasBeenScored && !tieBreakerActive && (
        <VideoActionButtonsWithClipboardFix
          competitor={competitor}
          eventId={eventId}
          eventName={eventName}
          tournamentName={tournamentName}
          tournamentClass={tournamentClass}
          onVideoUploaded={onVideoUploaded}
          style={styles.videoActions}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tieBreakerCard: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  selectedCard: {
    borderColor: '#34C759',
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  score: {
    fontSize: 14,
    color: '#666',
  },
  medalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  medal: {
    fontSize: 16,
  },
  placement: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tieBreakerIndicator: {
    marginLeft: 12,
  },
  videoActions: {
    marginTop: 12,
  },
});