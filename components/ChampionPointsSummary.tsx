import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getChampionSeasonalPoints } from '../app/lib/championSeasonalPoints';
import { sortTournaments } from '../app/lib/tournamentSorter';

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

export default function ChampionPointsSummary({ championId }: { championId: string }) {
  const [pointsData, setPointsData] = useState<SeasonalPointsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (championId) {
      loadSeasonalPoints();
    }
  }, [championId]);

  const loadSeasonalPoints = async () => {
    try {
      const data = await getChampionSeasonalPoints(championId);
      console.log('[ChampionPointsSummary] Loaded seasonal points:', data.length, 'events');
      setPointsData(data);
    } catch (error) {
      console.error('[ChampionPointsSummary] Error loading points:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get medal emoji
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading seasonal points...</Text>
      </View>
    );
  }

  if (!pointsData.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No events scored yet this season.</Text>
        <Text style={styles.emptySubtitle}>When this Champion competes and earns points, they'll appear here.</Text>
      </View>
    );
  }

  // Calculate total points
  const totalPoints = pointsData.reduce((sum, item) => sum + item.points, 0);

  // Group by event type
  const eventTypeGroups = pointsData.reduce((groups, item) => {
    const eventType = item.event_type || 'Unknown Event';
    if (!groups[eventType]) {
      groups[eventType] = [];
    }
    groups[eventType].push(item);
    return groups;
  }, {} as Record<string, SeasonalPointsData[]>);

  return (
    <View style={styles.container}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total Season Points: {totalPoints}</Text>
      </View>
      
      {Object.entries(eventTypeGroups).map(([eventType, events]) => {
        const eventTypePoints = events.reduce((sum, item) => sum + item.points, 0);
        
        // Apply unified tournament sorting within each event type
        const sortedEvents = sortTournaments(events);
        
        return (
          <View key={eventType} style={styles.eventTypeContainer}>
            <Text style={styles.eventTypeTitle}>
              {eventType}: {eventTypePoints} pts
            </Text>
            
            {sortedEvents.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.eventItem}>
                <Text style={styles.tournamentName}>{item.tournament_name}</Text>
                <Text style={styles.eventDetails}>
                  {getMedalEmoji(item.final_rank)} Rank {item.final_rank} • {item.points} points
                </Text>
                <Text style={styles.judgeScores}>
                  Scores: B:{item.judge_b_score} C:{item.judge_c_score} A:{item.judge_a_score}
                </Text>
                <Text style={styles.tournamentInfo}>
                  Class {item.tournament_class} • {new Date(item.tournament_date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
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
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  totalContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventTypeContainer: {
    marginBottom: 16,
  },
  eventTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    marginLeft: 8,
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  judgeScores: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  tournamentInfo: {
    fontSize: 12,
    color: '#aaa',
  },
});