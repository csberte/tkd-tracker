import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { TraditionalFormsCompetitorListFixed } from '../../components/TraditionalFormsCompetitorListFixed';
import { SimpleScoreEntryModalFixed } from '../../components/SimpleScoreEntryModalFixed';
import { autoRankCalculator } from '../lib/autoRankCalculator';
import { fetchAllScoresForEvent, recalculateFinalRanks } from '../lib/debugHelpersFixed';

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

export default function TraditionalFormsEventScreenFixed() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, tournaments(*)')
        .eq('id', eventId)
        .single();
      
      if (eventError) {
        console.error('Error loading event:', eventError);
        return;
      }
      
      setEventInfo(event);
      
      const { data: scores, error: scoresError } = await supabase
        .from('event_scores')
        .select(`
          *,
          tournament_competitors(
            id,
            name,
            avatar
          )
        `)
        .eq('event_id', eventId)
        .order('final_rank', { ascending: true, nullsLast: true })
        .order('total_score', { ascending: false });
      
      if (scoresError) {
        console.error('Error loading scores:', scoresError);
        return;
      }
      
      const competitorList: Competitor[] = scores?.map(score => ({
        id: score.tournament_competitor_id,
        name: score.tournament_competitors?.name || 'Unknown',
        avatar: score.tournament_competitors?.avatar,
        source_type: 'tournament_competitor',
        tournament_competitor_id: score.tournament_competitor_id,
        tournament_competitor: {
          id: score.tournament_competitor_id,
          name: score.tournament_competitors?.name || 'Unknown',
          avatar: score.tournament_competitors?.avatar
        },
        total_score: score.total_score,
        final_rank: score.final_rank,
        points_earned: score.points_earned
      })) || [];
      
      setCompetitors(competitorList);
      
    } catch (error) {
      console.error('Error loading event data:', error);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreCompetitor = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setScoreModalVisible(true);
  };

  const handleScoreSaved = () => {
    loadEventData();
  };

  const handleRecalculateRanks = async () => {
    if (!eventId || recalculating) return;
    
    setRecalculating(true);
    
    try {
      console.log('🏆 Manual rank recalculation triggered for event:', eventId);
      await recalculateFinalRanks(eventId);
      
      Alert.alert('Success', 'Rankings and points have been recalculated!');
      await loadEventData();
      
    } catch (error) {
      console.error('❌ Failed to recalculate ranks:', error);
      Alert.alert('Error', 'Failed to recalculate rankings');
    } finally {
      setRecalculating(false);
    }
  };

  const handleDebugScores = async () => {
    if (!eventId) return;
    
    try {
      console.log('🧪 Debug: Showing all scores for event:', eventId);
      await fetchAllScoresForEvent(eventId);
      Alert.alert('Debug Complete', 'Check console for detailed score information');
    } catch (error) {
      console.error('❌ Debug failed:', error);
      Alert.alert('Error', 'Debug operation failed');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: '#666',
            padding: 10,
            borderRadius: 8,
            marginBottom: 20,
            alignSelf: 'flex-start'
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>⬅ Back</Text>
        </TouchableOpacity>
        
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
          {eventInfo?.name || 'Traditional Forms Event'}
        </Text>
        
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
          Tournament: {eventInfo?.tournaments?.name || 'Unknown'}
        </Text>
        
        <View style={{ marginBottom: 20, gap: 10 }}>
          <Button 
            title="🧪 Show All Scores" 
            onPress={() => fetchAllScoresForEvent(eventId || '')} 
          />
          <Button 
            title="🔁 Recalculate Rankings" 
            onPress={() => recalculateFinalRanks(eventId || '')} 
          />
        </View>
        
        <TraditionalFormsCompetitorListFixed
          competitors={competitors}
          onScoreCompetitor={handleScoreCompetitor}
          eventId={eventId || ''}
        />
      </ScrollView>
      
      {selectedCompetitor && (
        <SimpleScoreEntryModalFixed
          visible={scoreModalVisible}
          onClose={() => {
            setScoreModalVisible(false);
            setSelectedCompetitor(null);
          }}
          competitor={selectedCompetitor}
          eventId={eventId || ''}
          tournamentId={eventInfo?.tournament_id || ''}
          onScoreSaved={handleScoreSaved}
        />
      )}
    </View>
  );
}