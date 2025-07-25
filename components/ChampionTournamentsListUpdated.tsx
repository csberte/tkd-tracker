import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../app/lib/supabase';
import { calculateTournamentPoints } from '../app/lib/tournamentPoints';
import { sortTournaments } from '../app/lib/tournamentSorter';

interface TournamentData {
  id: string;
  event_id: string;
  event_type: string;
  event_name: string;
  final_rank: number;
  judge_a_score: number;
  judge_b_score: number;
  judge_c_score: number;
  tournament_name: string;
  tournament_class: string;
  tournament_date: string;
  points: number;
  total_competitors: number;
}

interface ChampionTournamentsListUpdatedProps {
  championId: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getMedalEmoji = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export default function ChampionTournamentsListUpdated({ championId }: ChampionTournamentsListUpdatedProps) {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (championId) {
      loadTournaments();
    }
  }, [championId]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[ChampionTournaments] Loading for champion:', championId);

      // Step 1: Get tournament competitor IDs for this champion
      const { data: competitorIds, error: compIdError } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('champion_id', championId);

      if (compIdError) {
        console.error('[ChampionTournaments] Error loading competitor IDs:', compIdError);
        setError('Failed to load tournament data');
        return;
      }

      const competitorIdList = competitorIds?.map(c => c.id) || [];
      console.log('[ChampionTournaments] Found competitor IDs:', competitorIdList.length);

      if (competitorIdList.length === 0) {
        setTournaments([]);
        return;
      }

      // Step 2: Query with same joins as seasonal points
      const { data: scores, error: scoresError } = await supabase
        .from('event_scores')
        .select(`
          *,
          event:events (
            id,
            name,
            event_type,
            tournament_id,
            tournament:tournaments (
              id,
              name,
              date,
              class
            )
          )
        `)
        .in('tournament_competitor_id', competitorIdList);

      if (scoresError) {
        console.error('[ChampionTournaments] Error loading scores:', scoresError);
        setError('Failed to load tournament data');
        return;
      }

      if (!scores || scores.length === 0) {
        setTournaments([]);
        return;
      }

      console.log('[ChampionTournaments] Found scores:', scores.length);

      // Step 3: Process scores same as seasonal points
      const eventScoresMap = new Map();
      
      // Collect all scores by event
      for (const score of scores) {
        const eventId = score.event_id;
        if (!eventScoresMap.has(eventId)) {
          eventScoresMap.set(eventId, []);
        }
        eventScoresMap.get(eventId).push(score);
      }
      
      const eventGroups = new Map();
      
      // Process each score with calculated total competitors
      for (const score of scores) {
        const event = score.event;
        const tournament = event?.tournament;
        
        if (!event || !tournament || !score.final_rank) {
          continue;
        }

        const eventId = score.event_id;
        const scoresForThisEvent = eventScoresMap.get(eventId) || [];
        const totalCompetitors = scoresForThisEvent.length;
        const tournamentClass = tournament.class;
        
        const pointsEarned = calculateTournamentPoints(
          tournamentClass,
          score.final_rank,
          totalCompetitors
        );

        const processedScore = {
          id: score.id,
          event_id: eventId,
          event_type: event.event_type,
          event_name: event.name,
          final_rank: score.final_rank,
          judge_a_score: score.judge_a_score || 0,
          judge_b_score: score.judge_b_score || 0,
          judge_c_score: score.judge_c_score || 0,
          tournament_name: tournament.name,
          tournament_class: tournament.class,
          tournament_date: tournament.date,
          points: pointsEarned,
          total_competitors: totalCompetitors
        };

        // Deduplicate by event_id
        const existing = eventGroups.get(eventId);
        
        if (!existing || 
            score.final_rank < existing.final_rank ||
            (score.final_rank === existing.final_rank && score.id > existing.id)) {
          eventGroups.set(eventId, processedScore);
        }
      }

      const results = Array.from(eventGroups.values());
      
      // Use unified tournament sorting
      const sortedResults = sortTournaments(results);
      
      console.log('[ChampionTournaments] Final results:', sortedResults.length);
      setTournaments(sortedResults);
      
    } catch (err) {
      console.error('[ChampionTournaments] Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tournament history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No tournament history found.</Text>
      </View>
    );
  }

  // Group by tournament
  const tournamentGroups = tournaments.reduce((groups, item) => {
    const key = `${item.tournament_name}-${item.tournament_date}`;
    if (!groups[key]) {
      groups[key] = {
        tournament_name: item.tournament_name,
        tournament_date: item.tournament_date,
        tournament_class: item.tournament_class,
        events: []
      };
    }
    groups[key].events.push(item);
    return groups;
  }, {} as Record<string, any>);

  return (
    <ScrollView style={styles.container}>
      {Object.values(tournamentGroups).map((tournament: any, index) => (
        <View key={index} style={styles.tournamentContainer}>
          <Text style={styles.tournamentName}>🏆 {tournament.tournament_name}</Text>
          <Text style={styles.tournamentInfo}>
            🗓 {formatDate(tournament.tournament_date)} • Class {tournament.tournament_class}
          </Text>
          
          {tournament.events.map((event: TournamentData, eventIndex: number) => (
            <View key={eventIndex} style={styles.eventItem}>
              <Text style={styles.eventType}>🎯 {event.event_type}</Text>
              <Text style={styles.placement}>
                {getMedalEmoji(event.final_rank)} {event.final_rank === 1 ? '1st' : event.final_rank === 2 ? '2nd' : event.final_rank === 3 ? '3rd' : `${event.final_rank}th`} Place
              </Text>
              <Text style={styles.score}>
                🔢 {event.judge_a_score + event.judge_b_score + event.judge_c_score} ({event.judge_a_score},{event.judge_b_score},{event.judge_c_score})
              </Text>
              <Text style={styles.points}>{event.points} points</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
  tournamentContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E10600',
  },
  eventType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  placement: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  score: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  points: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});