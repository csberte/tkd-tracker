import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

interface CollapsibleSectionProps {
  title: string;
  events: SeasonalPointsData[];
  totalPoints: number;
}

function CollapsibleSection({ title, events, totalPoints }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Filter out 0-point events
  const filteredEvents = events.filter(event => event.points > 0);
  
  if (filteredEvents.length === 0) {
    return null; // Don't render section if no events with points
  }
  
  return (
    <View style={styles.eventTypeContainer}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.eventTypeTitle}>
          {title.replace('_', ' ')}: {totalPoints} pts
        </Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.eventsContainer}>
          {filteredEvents.map((item, index) => (
            <EventCard key={`${item.id}-${index}`} event={item} />
          ))}
        </View>
      )}
    </View>
  );
}

interface EventCardProps {
  event: SeasonalPointsData;
}

function EventCard({ event }: EventCardProps) {
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
  const getPlacementText = (rank: number) => {
    if (rank === 1) return 'First Place';
    if (rank === 2) return 'Second Place';
    if (rank === 3) return 'Third Place';
    return `${rank}th Place`;
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
  
  return (
    <View style={styles.eventItemContainer}>
      <View 
        style={[styles.colorBar, { backgroundColor: getClassColor(event.tournament_class) }]} 
      />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.medalContainer}>
            <Text style={styles.medalRank}>
              {getMedalEmoji(event.final_rank)} {event.tournament_name}
            </Text>
            <Text style={styles.placementText}>
              {getPlacementText(event.final_rank)}
            </Text>
          </View>
          <Text style={styles.pointsEarned}>
            {event.points} pts
          </Text>
        </View>
        <Text style={styles.eventName}>{event.event_name}</Text>
        <Text style={styles.scoreDetails}>
          Score: {event.score_total} ({event.judge_a_score},{event.judge_b_score},{event.judge_c_score})
        </Text>
        <Text style={styles.tournamentInfo}>
          Class {event.tournament_class} – {event.tournament_class === 'C' ? 'Regional' : event.tournament_class === 'A' ? 'Regional' : 'Nationals'} – {new Date(event.tournament_date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

export default function ChampionPointsSummaryUpdated({ championId }: { championId: string }) {
  const [pointsData, setPointsData] = useState<SeasonalPointsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (championId) {
      loadSeasonalPoints();
    } else {
      setError('No champion ID provided');
      setLoading(false);
    }
  }, [championId]);

  const loadSeasonalPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getChampionSeasonalPoints(championId);
      
      if (data.length === 0) {
        setError(`No scored events found for Champion ID: ${championId}`);
      }
      
      setPointsData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!pointsData.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No scored events found</Text>
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

  return (
    <View style={styles.container}>
      {Object.entries(eventTypeGroups).map(([eventType, events]) => {
        const eventTypePoints = events
          .filter(event => event.points > 0)
          .reduce((sum, item) => sum + item.points, 0);
        
        return (
          <CollapsibleSection
            key={eventType}
            title={eventType}
            events={events}
            totalPoints={eventTypePoints}
          />
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
  eventTypeContainer: { marginBottom: 16 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  eventTypeTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333', 
    textTransform: 'capitalize' 
  },
  eventsContainer: { marginTop: 8 },
  eventItemContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f9f9f9', 
    borderRadius: 6, 
    marginBottom: 8, 
    marginLeft: 8, 
    overflow: 'hidden' 
  },
  colorBar: { width: 5 },
  eventContent: { flex: 1, padding: 12 },
  eventHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 4 
  },
  medalContainer: { flex: 1 },
  medalRank: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  placementText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  pointsEarned: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  eventName: { fontSize: 12, color: '#666', marginBottom: 4 },
  scoreDetails: { fontSize: 11, color: '#555', marginBottom: 4, fontFamily: 'monospace' },
  tournamentInfo: { fontSize: 12, color: '#888' },
});