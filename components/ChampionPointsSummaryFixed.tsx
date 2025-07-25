import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getChampionSeasonalPoints } from '../app/lib/championSeasonalPointsFixed';

interface SeasonalPointsData {
  id: string;
  event_id: string;
  event_type: string;
  event_name: string;
  final_rank: number;
  score_total: number;
  judge_a_score: number;
  judge_b_score: number;
  judge_c_score: number;
  tournament_name: string;
  tournament_class: string;
  tournament_date: string;
  points: number;
  total_competitors: number;
}

export default function ChampionPointsSummaryFixed({ championId }: { championId: string }) {
  const [pointsData, setPointsData] = useState<SeasonalPointsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 [ChampionPointsSummaryFixed] Component mounted with championId:', championId);
    
    if (championId) {
      loadSeasonalPoints();
    } else {
      console.log('❌ [ChampionPointsSummaryFixed] No championId provided');
      setError('No champion ID provided');
      setLoading(false);
    }
  }, [championId]);

  const loadSeasonalPoints = async () => {
    try {
      console.log('🚀 [ChampionPointsSummaryFixed] Starting to load seasonal points for:', championId);
      setLoading(true);
      setError(null);
      
      const data = await getChampionSeasonalPoints(championId);
      console.log('📊 [ChampionPointsSummaryFixed] Received data:', data);
      console.log('📈 [ChampionPointsSummaryFixed] Data count:', data.length);
      
      if (data.length === 0) {
        console.log('⚠️ [ChampionPointsSummaryFixed] No results returned from query');
        setError(`No scored events found for Champion ID: ${championId}`);
      }
      
      setPointsData(data);
    } catch (error) {
      console.error('💥 [ChampionPointsSummaryFixed] Error loading points:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getClassColor = (tournamentClass: string) => {
    switch (tournamentClass?.toUpperCase()) {
      case 'AAA': return '#FFD700';
      case 'AA': return '#C0C0C0';
      case 'A': return '#CD7F32';
      case 'B': return '#0066CC';
      case 'C': return '#808080';
      default: return '#CCCCCC';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading seasonal points...</Text>
        <Text style={styles.debugText}>Champion ID: {championId}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.debugText}>Champion ID: {championId}</Text>
        <Text style={styles.debugText}>Check console for detailed logs</Text>
      </View>
    );
  }

  if (!pointsData.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scored events found</Text>
        <Text style={styles.debugText}>Champion ID: {championId}</Text>
        <Text style={styles.debugText}>Check console for detailed logs</Text>
      </View>
    );
  }

  const eventTypeGroups = pointsData.reduce((groups, item) => {
    const eventType = item.event_type || 'Unknown Event';
    if (!groups[eventType]) {
      groups[eventType] = [];
    }
    groups[eventType].push(item);
    return groups;
  }, {} as Record<string, SeasonalPointsData[]>);

  const totalPoints = pointsData.reduce((sum, item) => sum + item.points, 0);

  return (
    <View style={styles.container}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total Season Points: {totalPoints}</Text>
        <Text style={styles.debugText}>Found {pointsData.length} events for Champion ID: {championId}</Text>
      </View>
      
      {Object.entries(eventTypeGroups).map(([eventType, events]) => {
        const eventTypePoints = events.reduce((sum, item) => sum + item.points, 0);
        
        return (
          <View key={eventType} style={styles.eventTypeContainer}>
            <Text style={styles.eventTypeTitle}>
              {eventType.replace('_', ' ')}: {eventTypePoints} pts
            </Text>
            
            {events.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.eventItemContainer}>
                <View 
                  style={[
                    styles.colorBar, 
                    { backgroundColor: getClassColor(item.tournament_class) }
                  ]} 
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.medalRank}>
                      {getMedalEmoji(item.final_rank)}
                    </Text>
                    <Text style={[
                      styles.pointsEarned,
                      item.points === 0 && styles.zeroPoints
                    ]}>
                      {item.points} pts
                    </Text>
                  </View>
                  <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                  <Text style={styles.eventName}>{item.event_name}</Text>
                  <Text style={styles.scoreDetails}>
                    Score: {item.score_total} ({item.judge_a_score},{item.judge_b_score},{item.judge_c_score})
                  </Text>
                  <Text style={styles.tournamentInfo}>
                    Class {item.tournament_class} - {new Date(item.tournament_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  loadingContainer: { flexDirection: 'column', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 8, color: '#666' },
  errorContainer: { padding: 16, alignItems: 'center', backgroundColor: '#ffebee', borderRadius: 8 },
  errorText: { color: '#d32f2f', fontSize: 14, textAlign: 'center' },
  emptyContainer: { padding: 16, alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8 },
  emptyText: { color: '#999', fontStyle: 'italic', fontSize: 16 },
  debugText: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  totalContainer: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 16 },
  totalText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  eventTypeContainer: { marginBottom: 16 },
  eventTypeTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: '#333', textTransform: 'capitalize' },
  eventItemContainer: { flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 6, marginBottom: 8, marginLeft: 8, overflow: 'hidden' },
  colorBar: { width: 5 },
  eventContent: { flex: 1, padding: 12 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  medalRank: { fontSize: 14, fontWeight: '500' },
  pointsEarned: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  zeroPoints: { color: '#999', fontWeight: 'normal' },
  tournamentName: { fontSize: 13, fontWeight: '500', marginBottom: 2, color: '#333' },
  eventName: { fontSize: 12, color: '#666', marginBottom: 4 },
  scoreDetails: { fontSize: 11, color: '#555', marginBottom: 4, fontFamily: 'monospace' },
  tournamentInfo: { fontSize: 12, color: '#888' },
});