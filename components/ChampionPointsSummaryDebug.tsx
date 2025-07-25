import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { calculateTournamentPoints } from '../app/lib/tournamentPoints';

interface SeasonalPointsData {
  id: string;
  event_id: string;
  event_type: string;
  event_name: string;
  final_rank: number;
  judge_b_score: number;
  judge_c_score: number;
  judge_a_score: number;
  tournament_name: string;
  tournament_class: string;
  tournament_date: string;
  points: number;
  total_competitors: number;
}

export default function ChampionPointsSummaryDebug({ championId }: { championId: string }) {
  const [pointsData, setPointsData] = useState<SeasonalPointsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (championId) {
      loadSeasonalPointsWithDebug();
    }
  }, [championId]);

  const loadSeasonalPointsWithDebug = async () => {
    try {
      console.log('[DEBUG] Starting query for champion:', championId);
      setDebugInfo(`Querying for champion: ${championId}`);
      
      // Direct query to match the exact data structure
      const { data: eventScores, error } = await supabase
        .from('event_scores')
        .select(`
          id,
          event_id,
          tournament_competitor_id,
          final_rank,
          judge_b_score,
          judge_c_score,
          judge_a_score,
          tournament_competitors!inner (
            id,
            champion_id
          ),
          events!inner (
            id,
            name,
            event_type,
            tournament_id
          ),
          tournaments!inner (
            id,
            name,
            date,
            tournament_class
          )
        `)
        .eq('tournament_competitors.champion_id', championId)
        .not('final_rank', 'is', null);

      console.log('[DEBUG] Query result:', { data: eventScores, error });
      setDebugInfo(prev => prev + `\nQuery result: ${eventScores?.length || 0} records, error: ${error?.message || 'none'}`);

      if (error) {
        console.error('[DEBUG] Query error:', error);
        return;
      }

      if (!eventScores || eventScores.length === 0) {
        console.log('[DEBUG] No event scores found');
        setDebugInfo(prev => prev + '\nNo event scores found');
        return;
      }

      // Process the data
      const processedScores = eventScores.map(score => {
        const points = calculateTournamentPoints(
          score.tournaments?.tournament_class || '',
          score.final_rank,
          1 // Default to 1 competitor for now
        );

        return {
          id: score.id,
          event_id: score.event_id,
          event_type: score.events?.event_type || 'unknown',
          event_name: score.events?.name || 'Unknown Event',
          final_rank: score.final_rank,
          judge_b_score: score.judge_b_score || 0,
          judge_c_score: score.judge_c_score || 0,
          judge_a_score: score.judge_a_score || 0,
          tournament_name: score.tournaments?.name || 'Unknown Tournament',
          tournament_class: score.tournaments?.tournament_class || '',
          tournament_date: score.tournaments?.date || '',
          points,
          total_competitors: 1
        };
      });

      console.log('[DEBUG] Processed scores:', processedScores);
      setDebugInfo(prev => prev + `\nProcessed ${processedScores.length} scores`);
      setPointsData(processedScores);
      
    } catch (error) {
      console.error('[DEBUG] Unexpected error:', error);
      setDebugInfo(prev => prev + `\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading seasonal points...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.debugText}>Debug Info: {debugInfo}</Text>
      
      {pointsData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scored events found</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.totalText}>Found {pointsData.length} events</Text>
          {pointsData.map((item, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventName}>{item.tournament_name}</Text>
              <Text>Rank: #{item.final_rank} | Points: {item.points}</Text>
              <Text>Score: {item.judge_b_score + item.judge_c_score + item.judge_a_score}</Text>
              <Text>Class: {item.tournament_class}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
});