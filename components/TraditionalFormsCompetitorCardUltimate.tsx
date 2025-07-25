import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { traditionalFormsStyles } from './TraditionalFormsStyles';

interface TraditionalFormsCompetitorCardUltimateProps {
  competitor: any;
  index: number;
  tieBreakerActive: boolean;
  isInActiveTieGroup: boolean;
  isSelected: boolean;
  onPress: () => void;
  eventId: string;
}

export default function TraditionalFormsCompetitorCardUltimate({
  competitor,
  index,
  tieBreakerActive,
  isInActiveTieGroup,
  isSelected,
  onPress,
  eventId
}: TraditionalFormsCompetitorCardUltimateProps) {
  
  const handlePress = () => {
    console.log('🔄 CompetitorCard: Card pressed for:', competitor.name);
    console.log('🔄 CompetitorCard: TieBreakerActive:', tieBreakerActive);
    console.log('🔄 CompetitorCard: IsInActiveTieGroup:', isInActiveTieGroup);
    console.log('🔄 CompetitorCard: IsSelected:', isSelected);
    
    // Temporarily comment out all logic and just log the tap
    console.log('✅ CompetitorCard: TAP REGISTERED for:', competitor.name);
    
    // Call the onPress handler
    onPress();
  };
  
  const totalScore = competitor.total_score || competitor.totalScore || 0;
  const finalRank = competitor.final_rank || competitor.rank;
  const hasBeenScored = totalScore > 0;
  
  // Determine card styling based on tiebreaker state
  const isGrayedOut = tieBreakerActive && !isInActiveTieGroup;
  const isHighlighted = tieBreakerActive && isInActiveTieGroup;
  
  // Medal logic
  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };
  
  const medal = getMedal(finalRank);
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        traditionalFormsStyles.competitorCard,
        {
          opacity: isGrayedOut ? 0.5 : 1,
          backgroundColor: isHighlighted ? (isSelected ? '#E3F2FD' : '#F5F5F5') : 'white',
          borderColor: isHighlighted ? (isSelected ? '#2196F3' : '#E0E0E0') : '#E0E0E0',
          borderWidth: isHighlighted ? 2 : 1,
        }
      ]}
    >
      <View style={traditionalFormsStyles.competitorInfo}>
        <View style={traditionalFormsStyles.competitorHeader}>
          <Text style={traditionalFormsStyles.competitorName}>
            {medal} {competitor.name}
          </Text>
          {finalRank && (
            <Text style={traditionalFormsStyles.competitorRank}>
              #{finalRank}
            </Text>
          )}
        </View>
        
        <View style={traditionalFormsStyles.competitorDetails}>
          <Text style={traditionalFormsStyles.competitorClass}>
            {competitor.class || 'No Class'}
          </Text>
          <Text style={traditionalFormsStyles.competitorScore}>
            Score: {totalScore.toFixed(1)}
          </Text>
        </View>
        
        {isSelected && tieBreakerActive && (
          <View style={traditionalFormsStyles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={traditionalFormsStyles.selectedText}>Selected</Text>
          </View>
        )}
      </View>
      
      {hasBeenScored && !tieBreakerActive && (
        <Ionicons name="create-outline" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );
}