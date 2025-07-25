import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import VideoPlayerModal from './VideoPlayerModal';
import { calculateSeasonalPoints } from '../app/lib/pointsCalculator';
import { supabase } from '../app/lib/supabase';
import { findVideoForEvent } from '../app/lib/videoHelpers';
import { getRankEmoji, normalizeRank, formatRankDisplay } from '../app/lib/rankUtils';

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

interface ChampionTournamentCardProps {
  event: ChampionTournamentEvent;
}

interface JudgeScores {
  judge_a_score: number;
  judge_b_score: number;
  judge_c_score: number;
}

const formatEventName = (eventType: string): string => {
  switch (eventType) {
    case 'traditional_forms': return 'Traditional Forms';
    case 'creative_forms': return 'Creative Forms';
    case 'extreme_forms': return 'Extreme Forms';
    default: return eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export default function ChampionTournamentCard({ event }: ChampionTournamentCardProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Normalize rank to integer
  const normalizedRank = normalizeRank(event.rank) || 0;
  const rankEmoji = getRankEmoji(normalizedRank);
  const eventName = formatEventName(event.event_type);
  const rankText = formatRankDisplay(normalizedRank) + ' Place';
  
  // Calculate points if not provided
  const points = event.points_earned ?? calculateSeasonalPoints(
    normalizedRank,
    event.tournament_class,
    10 // Mock total_competitors
  );

  useEffect(() => {
    loadJudgeScores();
    checkForVideo();
  }, [event.event_id]);

  const loadJudgeScores = async () => {
    try {
      const { data, error } = await supabase
        .from('event_scores')
        .select('judge_a_score, judge_b_score, judge_c_score')
        .eq('event_id', event.event_id)
        .eq('competitor_id', event.competitor_id)
        .single();
      
      if (error) {
        console.error('Error loading judge scores:', error);
        return;
      }
      
      setJudgeScores(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkForVideo = async () => {
    if (!event.competitor_id || !event.tournament_id) {
      setHasVideo(false);
      return;
    }

    try {
      const videoResult = await findVideoForEvent({
        event_id: event.event_id,
        competitor_id: event.competitor_id,
        tournament_id: event.tournament_id
      });

      setHasVideo(videoResult.hasVideo);
      setVideoUrl(videoResult.videoUrl);
    } catch (error) {
      console.error('Error checking for video:', error);
      setHasVideo(false);
      setVideoUrl(null);
    }
  };

  const formatJudgeScores = (): string => {
    if (!judgeScores) return '';
    
    const { judge_b_score, judge_c_score, judge_a_score } = judgeScores;
    return `(${Math.round(judge_b_score)}, ${Math.round(judge_c_score)}, ${Math.round(judge_a_score)})`;
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
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      {/* Header row with event title and video icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rankEmoji && (
            <Text style={{ fontSize: 20, marginRight: 8 }}>{rankEmoji}</Text>
          )}
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
            {eventName}
          </Text>
        </View>
        
        {/* Video icon aligned with event title */}
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
      
      {/* Bottom row with placement, score, and TP */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#666', marginRight: 16 }}>
            {rankText}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Score: {event.total_score} {formatJudgeScores()}
          </Text>
        </View>
        
        {/* TP positioned directly under video icon */}
        <Text style={{ fontSize: 14, color: '#333' }}>
          TP: <Text style={{ color: '#e53935', fontWeight: 'bold' }}>{points}</Text>
        </Text>
      </View>
      
      <VideoPlayerModal
        visible={showVideoPlayer}
        videoUrl={videoUrl || ''}
        onClose={() => setShowVideoPlayer(false)}
      />
    </View>
  );
}