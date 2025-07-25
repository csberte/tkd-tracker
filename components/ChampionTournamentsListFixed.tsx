import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../app/lib/supabase';
import ChampionTournamentCardWithScores from './ChampionTournamentCardWithScores';

interface Tournament {
  id: string;
  name: string;
  location?: string;
  date: string;
  class: string;
  season: string;
  events: ChampionTournamentEvent[];
}

interface ChampionTournamentEvent {
  event_id: string;
  event_type: string;
  event_date: string;
  final_rank: number;
  points_earned?: number;
  judge_scores?: any;
  tournament_class: string;
  tournament_name: string;
  tournament_date: string;
  score_total?: number;
  total_score?: number;
  tournament_competitor_id: string;
}

interface ChampionTournamentsListFixedProps {
  championId: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function ChampionTournamentsListFixed({ championId }: ChampionTournamentsListFixedProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, [championId]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading tournaments for champion_id:', championId);

      // Step 1: Query tournament_competitors by source_id (not champion_id)
      const { data: tournamentCompetitors, error: tcError } = await supabase
        .from('tournament_competitors')
        .select('id')
        .eq('source_id', championId);

      if (tcError) {
        console.error('Error fetching tournament competitors:', tcError);
        setError('Failed to load tournament data');
        return;
      }

      if (!tournamentCompetitors || tournamentCompetitors.length === 0) {
        console.log('No tournament competitors found for champion:', championId);
        setTournaments([]);
        return;
      }

      const tournamentCompetitorIds = tournamentCompetitors.map(tc => tc.id);
      console.log('Found tournament competitor IDs:', tournamentCompetitorIds);

      // Step 2: Query event_scores using tournament_competitor_ids - FIXED: events.event_date not events_1.event_date
      const { data: eventScores, error: scoresError } = await supabase
        .from('event_scores')
        .select(`
          id,
          final_rank,
          judge_scores,
          total_score,
          event_id,
          tournament_competitor_id,
          updated_at,
          judge_a_score,
          judge_b_score,
          judge_c_score,
          events (
            id,
            event_type,
            event_date,
            tournament_id,
            tournaments (
              id,
              name,
              class,
              season,
              date
            )
          )
        `)
        .in('tournament_competitor_id', tournamentCompetitorIds)
        .not('final_rank', 'is', null);

      if (scoresError) {
        console.error('Error loading event scores:', scoresError);
        setError('Failed to load tournament data');
        return;
      }

      if (!eventScores || eventScores.length === 0) {
        console.log('No event scores found for tournament competitors');
        setTournaments([]);
        return;
      }

      console.log('Found event scores:', eventScores.length);

      // Step 3: Deduplication - pick best entry per event_id
      const eventScoresMap = new Map();
      eventScores.forEach((score: any) => {
        const key = score.event_id;
        const current = eventScoresMap.get(key);
        
        const shouldReplace = !current ||
          score.final_rank < current.final_rank ||
          (score.final_rank === current.final_rank && score.updated_at > current.updated_at);
          
        if (shouldReplace) {
          eventScoresMap.set(key, score);
        }
      });

      const deduplicatedScores = Array.from(eventScoresMap.values());
      console.log('After deduplication:', deduplicatedScores.length, 'unique events');

      // Group by tournament
      const tournamentMap = new Map<string, Tournament>();

      deduplicatedScores.forEach((score: any) => {
        const event = score.events;
        const tournament = event?.tournaments;
        
        if (!tournament || !event) return;

        const tournamentKey = tournament.id;

        if (!tournamentMap.has(tournamentKey)) {
          tournamentMap.set(tournamentKey, {
            id: tournament.id,
            name: tournament.name,
            location: '',
            date: tournament.date,
            class: tournament.class || 'A',
            season: tournament.season || '',
            events: []
          });
        }

        // Prepare judge scores in correct format
        const judgeScores = {
          judge_a_score: score.judge_a_score,
          judge_b_score: score.judge_b_score,
          judge_c_score: score.judge_c_score
        };

        const eventData: ChampionTournamentEvent = {
          event_id: event.id,
          event_type: event.event_type,
          event_date: event.event_date, // FIXED: Now correctly references events.event_date
          final_rank: score.final_rank,
          judge_scores: judgeScores,
          score_total: score.total_score,
          total_score: score.total_score,
          tournament_class: tournament.class || 'A',
          tournament_name: tournament.name,
          tournament_date: tournament.date,
          tournament_competitor_id: score.tournament_competitor_id
        };

        tournamentMap.get(tournamentKey)!.events.push(eventData);
      });

      // Convert to array and sort by date (newest first)
      const tournamentsArray = Array.from(tournamentMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sort events within each tournament by event_date descending
      tournamentsArray.forEach(tournament => {
        tournament.events.sort((a, b) => 
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        );
      });

      console.log('Final tournaments array:', tournamentsArray.length);
      setTournaments(tournamentsArray);
    } catch (err) {
      console.error('Error in loadTournaments:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading tournaments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#D32F2F', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>
          No tournament results found for this champion.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {tournaments.map((tournament) => (
        <View key={tournament.id} style={{ marginBottom: 24 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
              {tournament.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>
              📍 Class {tournament.class} — {formatDate(tournament.date)}
            </Text>
          </View>
          
          {tournament.events.map((event, index) => (
            <ChampionTournamentCardWithScores key={`${event.event_id}-${index}`} event={event} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}