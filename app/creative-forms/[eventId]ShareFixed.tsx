import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { shareVideoFixed } from '../../components/ShareVideoHelperFixed';

interface Competitor {
  id: string;
  name: string;
  final_rank?: number;
  total_score?: number;
  judge_a_score?: number;
  judge_b_score?: number;
  judge_c_score?: number;
}

export default function CreativeFormsShareFixed() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      setEvent(eventData);

      const { data: scoresData } = await supabase
        .from('event_scores')
        .select(`
          tournament_competitor_id,
          final_rank,
          total_score,
          judge_a_score,
          judge_b_score,
          judge_c_score,
          tournament_competitors!inner(name)
        `)
        .eq('event_id', eventId)
        .order('final_rank', { ascending: true });

      const formattedCompetitors = (scoresData || []).map(score => ({
        id: score.tournament_competitor_id,
        name: score.tournament_competitors.name,
        final_rank: score.final_rank,
        total_score: score.total_score,
        judge_a_score: score.judge_a_score,
        judge_b_score: score.judge_b_score,
        judge_c_score: score.judge_c_score
      }));

      setCompetitors(formattedCompetitors);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (competitor: Competitor) => {
    if (!event || !competitor.id) {
      Alert.alert('Share Error', 'Missing event or competitor information.');
      return;
    }

    setSharing(competitor.id);
    
    try {
      const { data: videoData } = await supabase
        .from('videos')
        .select('video_url')
        .eq('event_id', eventId)
        .eq('competitor_id', competitor.id)
        .single();

      const videoUrl = videoData?.video_url;
      if (!videoUrl) {
        Alert.alert('Share Error', 'No video found for this competitor.');
        return;
      }

      await shareVideoFixed({
        videoUrl,
        competitorName: competitor.name,
        eventName: event.name,
        tournamentName: 'Tournament',
        judgeScores: {
          judge_a_score: competitor.judge_a_score || 0,
          judge_b_score: competitor.judge_b_score || 0,
          judge_c_score: competitor.judge_c_score || 0
        },
        totalScore: competitor.total_score,
        rank: competitor.final_rank,
        eventId: eventId,
        competitor: {
          id: competitor.id,
          tournament_competitor_id: competitor.id,
          name: competitor.name
        }
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share video');
    } finally {
      setSharing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{event?.name || 'Creative Forms'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {competitors.map((competitor) => {
          const rank = competitor.final_rank;
          const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
          
          return (
            <View key={competitor.id} style={styles.competitorCard}>
              <View style={styles.competitorHeader}>
                <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                <View style={styles.competitorInfo}>
                  <Text style={styles.competitorName}>{competitor.name}</Text>
                  <Text style={styles.competitorRank}>Rank: {rank || 'N/A'}</Text>
                </View>
              </View>
              
              {competitor.total_score && (
                <Text style={styles.score}>
                  Score: {competitor.total_score}
                  {competitor.judge_a_score && competitor.judge_b_score && competitor.judge_c_score && 
                    ` (${competitor.judge_b_score}, ${competitor.judge_c_score}, ${competitor.judge_a_score})`
                  }
                </Text>
              )}
              
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare(competitor)}
                disabled={sharing === competitor.id}
              >
                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                <Text style={styles.shareText}>
                  {sharing === competitor.id ? 'Sharing...' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  content: { flex: 1, padding: 16 },
  competitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  competitorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rankEmoji: { fontSize: 24, marginRight: 12 },
  competitorInfo: { flex: 1 },
  competitorName: { fontSize: 16, fontWeight: 'bold', color: '#000000' },
  competitorRank: { fontSize: 14, color: '#666666' },
  score: { fontSize: 14, color: '#333333', marginBottom: 12 },
  shareButton: {
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  shareText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666666' },
});