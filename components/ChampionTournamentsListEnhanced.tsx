import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../app/lib/supabase';
import ChampionTournamentCardWithScores from './ChampionTournamentCardWithScores';

interface Tournament {
  id: string;
  name: string;
  location?: string;
  date: string;
  events: ChampionTournamentEvent[];
}

interface ChampionTournamentEvent {
  event_id: string;
  event_type: string;
  event_name: string;
  rank: number;
  total_score: number;
  points_earned?: number;
  tournament_class: string;
  video_url?: string;
  has_video: boolean;
  competitor_id?: string;
  tournament_id?: string;
}

interface ChampionTournamentsListEnhancedProps {
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

export default function ChampionTournamentsListEnhanced({ championId }: ChampionTournamentsListEnhancedProps) {
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

      // Query event_scores table with proper joins
      const { data, error: queryError } = await supabase
        .from('event_scores')
        .select(`
          event_id,
          rank,
          total_score,
          points_earned,
          competitor_id,
          events!inner (
            id,
            name,
            event_type,
            tournament_id,
            tournaments!inner (
              id,
              name,
              location,
              date,
              tournament_class
            )
          ),
          tournament_competitors!inner (
            champion_id
          )
        `)
        .eq('tournament_competitors.champion_id', championId)
        .not('rank', 'is', null)
        .not('total_score', 'is', null);

      console.log('Query result:', { data, error: queryError });
      console.log('Number of records found:', data?.length || 0);

      if (queryError) {
        console.error('Error loading tournaments:', queryError);
        setError('Failed to load tournament data');
        return;
      }

      if (!data || data.length === 0) {
        console.log('No tournament data found for champion_id:', championId);
        setTournaments([]);
        return;
      }

      // Get video data for this champion
      const { data: videoData } = await supabase
        .from('videos')
        .select('event_id, event_type, video_url')
        .eq('champion_id', championId);

      console.log('Video data found:', videoData?.length || 0);

      const videoMap = new Map<string, string>();
      videoData?.forEach(video => {
        videoMap.set(video.event_id, video.video_url);
      });

      // Group by tournament and format data
      const tournamentMap = new Map<string, Tournament>();

      data.forEach((score: any) => {
        const tournament = score.events.tournaments;
        const event = score.events;
        
        if (!tournamentMap.has(tournament.id)) {
          tournamentMap.set(tournament.id, {
            id: tournament.id,
            name: tournament.name,
            location: tournament.location,
            date: tournament.date,
            events: []
          });
        }

        const tournamentData = tournamentMap.get(tournament.id)!;
        
        const videoUrl = videoMap.get(event.id);
        
        tournamentData.events.push({
          event_id: event.id,
          event_type: event.event_type,
          event_name: event.name,
          rank: score.rank,
          total_score: score.total_score,
          points_earned: score.points_earned,
          tournament_class: tournament.tournament_class || 'A',
          video_url: videoUrl,
          has_video: !!videoUrl,
          competitor_id: score.competitor_id,
          tournament_id: tournament.id
        });
      });

      // Convert to array and sort by date (newest first)
      const tournamentsArray = Array.from(tournamentMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              📍 {tournament.location || 'Location TBD'} — {formatDate(tournament.date)}
            </Text>
          </View>
          
          {tournament.events.map((event) => (
            <ChampionTournamentCardWithScores key={event.event_id} event={event} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}