import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
  tournament_competitor_id?: string;
  tournament_competitor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  total_score?: number;
  final_rank?: number;
  points_earned?: number;
}

interface TraditionalFormsCompetitorListFixedProps {
  competitors: Competitor[];
  onScoreCompetitor: (competitor: Competitor) => void;
  eventId: string;
}

export function TraditionalFormsCompetitorListFixed({
  competitors,
  onScoreCompetitor,
  eventId
}: TraditionalFormsCompetitorListFixedProps) {
  
  const renderCompetitorCard = (competitor: Competitor, index: number) => {
    const hasScore = competitor.total_score !== null && competitor.total_score !== undefined;
    const hasRank = competitor.final_rank !== null && competitor.final_rank !== undefined;
    const hasPoints = competitor.points_earned !== null && competitor.points_earned !== undefined;
    
    return (
      <View
        key={competitor.id}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 4 }}>
              {competitor.tournament_competitor?.name || competitor.name}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {hasRank ? (
                <View style={{
                  backgroundColor: '#34C759',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginRight: 8
                }}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                    Rank #{competitor.final_rank}
                  </Text>
                </View>
              ) : (
                <View style={{
                  backgroundColor: '#FF9500',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginRight: 8
                }}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                    No Rank
                  </Text>
                </View>
              )}
              
              {hasScore && (
                <Text style={{ color: '#666', fontSize: 14 }}>
                  Score: {competitor.total_score?.toFixed(1)}
                </Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {hasPoints ? (
                <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
                  Points: {competitor.points_earned}
                </Text>
              ) : (
                <Text style={{ color: '#FF3B30', fontSize: 14, fontWeight: '600' }}>
                  Points: Not Calculated
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => onScoreCompetitor(competitor)}
            style={{
              backgroundColor: hasScore ? '#FF9500' : '#007AFF',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Ionicons 
              name={hasScore ? 'create-outline' : 'add-circle-outline'} 
              size={20} 
              color="white" 
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {hasScore ? 'Edit' : 'Score'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {!hasScore && (
          <View style={{
            backgroundColor: '#F8F9FA',
            padding: 12,
            borderRadius: 8,
            marginTop: 12
          }}>
            <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
              Tap "Score" to enter judges' scores
            </Text>
          </View>
        )}
        
        {hasScore && !hasRank && (
          <View style={{
            backgroundColor: '#FFF3CD',
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#FF9500'
          }}>
            <Text style={{ color: '#856404', fontSize: 14, fontWeight: '600' }}>
              ⚠️ Score saved but rank not calculated
            </Text>
            <Text style={{ color: '#856404', fontSize: 12, marginTop: 4 }}>
              Use "Recalculate Rankings" button above
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  if (competitors.length === 0) {
    return (
      <View style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        marginTop: 20
      }}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={{ fontSize: 18, color: '#666', marginTop: 16, textAlign: 'center' }}>
          No competitors found
        </Text>
        <Text style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>
          Add competitors to this event to start scoring
        </Text>
      </View>
    );
  }
  
  // Sort competitors by final_rank (ascending), with null values at the bottom
  const sortedCompetitors = competitors
    .sort((a, b) => {
      const rankA = a.final_rank ?? 999;
      const rankB = b.final_rank ?? 999;
      return rankA - rankB;
    });
  
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#000' }}>
          Competitors ({competitors.length})
        </Text>
        
        {sortedCompetitors.map((competitor, index) => renderCompetitorCard(competitor, index))}
      </View>
    </ScrollView>
  );
}