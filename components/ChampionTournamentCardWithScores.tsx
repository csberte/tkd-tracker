import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayerModal from './VideoPlayerModal';
import { supabase } from '../app/lib/supabase';
import { manuallyCalculatePoints } from '../app/lib/manualPointsCalculator';

interface ChampionTournamentEvent {
  event_id: string;
  event_type: string;
  event_date: string;
  final_rank: number;
  points_earned?: number;
  tournament_class: string;
  tournament_name: string;
  tournament_date: string;
  total_score?: number;
  judge_scores?: any;
  tournament_competitor_id: string;
}

interface ChampionTournamentCardProps {
  event: ChampionTournamentEvent;
}

const getRankEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

const formatEventName = (eventType: string): string => {
  switch (eventType) {
    case 'traditional_forms': return 'Traditional Forms';
    case 'creative_forms': return 'Creative Forms';
    case 'extreme_forms': return 'Extreme Forms';
    default: return eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const formatJudgeScores = (judgeScores: any): string => {
  if (!judgeScores) return '';
  
  const scores = [];
  if (judgeScores.judge_b_score !== undefined) scores.push(judgeScores.judge_b_score);
  if (judgeScores.judge_c_score !== undefined) scores.push(judgeScores.judge_c_score);
  if (judgeScores.judge_a_score !== undefined) scores.push(judgeScores.judge_a_score);
  
  return scores.length > 0 ? `(${scores.join(',')})` : '';
};

const getClassColor = (tournamentClass: string): string => {
  switch (tournamentClass?.toUpperCase()) {
    case 'AAA': return '#FFD700'; // Gold
    case 'AA': return '#C0C0C0'; // Silver
    case 'A': return '#CD7F32'; // Bronze
    case 'B': return '#4169E1'; // Blue
    case 'C': return '#808080'; // Gray
    default: return '#808080'; // Default gray
  }
};

export default function ChampionTournamentCardWithScores({ event }: ChampionTournamentCardProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  
  const rankEmoji = getRankEmoji(event.final_rank);
  const eventName = formatEventName(event.event_type);
  const judgeScoresText = formatJudgeScores(event.judge_scores);
  const classColor = getClassColor(event.tournament_class);

  useEffect(() => {
    loadCompetitorCount();
    checkForVideo();
  }, [event.event_id]);

  useEffect(() => {
    if (competitorCount > 0) {
      const points = manuallyCalculatePoints(
        event.final_rank,
        event.tournament_class,
        competitorCount
      );
      setCalculatedPoints(points);
    }
  }, [event.final_rank, event.tournament_class, competitorCount]);

  const loadCompetitorCount = async () => {
    try {
      const { count, error: countError } = await supabase
        .from('event_scores')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.event_id);
      
      if (!countError && count !== null) {
        setCompetitorCount(count);
      }
    } catch (error) {
      console.error('Error loading competitor count:', error);
    }
  };

  const checkForVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('video_url')
        .eq('event_id', event.event_id)
        .not('video_url', 'is', null)
        .single();

      if (!error && data?.video_url) {
        setHasVideo(true);
        setVideoUrl(data.video_url);
      } else {
        setHasVideo(false);
        setVideoUrl(null);
      }
    } catch (error) {
      console.error('Error checking for video:', error);
      setHasVideo(false);
      setVideoUrl(null);
    }
  };

  const handleVideoIconPress = () => {
    if (hasVideo && videoUrl) {
      setShowVideoPlayer(true);
    }
  };

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      {/* Tournament Class Color Bar */}
      <View style={{
        width: 5,
        backgroundColor: classColor,
        minHeight: '100%'
      }} />
      
      {/* Card Content */}
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {rankEmoji && (
              <Text style={{ fontSize: 20, marginRight: 8 }}>{rankEmoji}</Text>
            )}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
              {eventName}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleVideoIconPress}
            style={{ padding: 4 }}
          >
            <Ionicons 
              name="videocam" 
              size={20} 
              color={hasVideo ? '#e53935' : '#666'} 
            />
          </TouchableOpacity>
        </View>
        
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          Rank {event.final_rank} | Score: {event.total_score ?? "—"} {judgeScoresText} | {calculatedPoints} points
        </Text>
        <Text style={{ fontSize: 12, color: '#999' }}>
          Class {event.tournament_class} — {event.tournament_name}
        </Text>
        
        <VideoPlayerModal
          visible={showVideoPlayer}
          videoUrl={videoUrl || ''}
          onClose={() => setShowVideoPlayer(false)}
        />
      </View>
    </View>
  );
}