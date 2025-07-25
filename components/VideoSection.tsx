import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import VideoPlayerModal from './VideoPlayerModal';
import VideoManagementSection from './VideoManagementSection';
import { supabase } from '../app/lib/supabase';

interface VideoSectionProps {
  scoreId: string;
  competitorId: string;
  eventId: string;
  tournamentId: string;
  videoUrl: string;
  onVideoUpdated: (url: string) => void;
  onVideoStatusChange?: (hasVideo: boolean) => void;
}

export default function VideoSection({
  scoreId, competitorId, eventId, tournamentId, videoUrl, onVideoUpdated, onVideoStatusChange
}: VideoSectionProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [scoreData, setScoreData] = useState<any>(null);

  useEffect(() => {
    loadCompetitorAndEventData();
    loadScoreData();
  }, [competitorId, eventId, scoreId]);

  const loadCompetitorAndEventData = async () => {
    try {
      const [competitorResult, eventResult] = await Promise.all([
        supabase
          .from('tournament_competitors')
          .select('name')
          .eq('competitor_id', competitorId)
          .single(),
        supabase
          .from('events')
          .select('name')
          .eq('id', eventId)
          .single()
      ]);

      if (competitorResult.data) setCompetitorData(competitorResult.data);
      if (eventResult.data) setEventData(eventResult.data);
    } catch (error) {
      console.error('Error loading competitor/event data:', error);
    }
  };

  const loadScoreData = async () => {
    try {
      const { data } = await supabase
        .from('event_scores')
        .select('judge_b_score, judge_c_score, judge_a_score, total_score')
        .eq('id', scoreId)
        .single();
      
      if (data) setScoreData(data);
    } catch (error) {
      console.error('Error loading score data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <VideoManagementSection
          competitorId={competitorId}
          eventId={eventId}
          tournamentId={tournamentId}
          scoreId={scoreId}
          competitorName={competitorData?.name}
          eventName={eventData?.name}
          judgeScores={scoreData ? [scoreData.judge_b_score, scoreData.judge_c_score, scoreData.judge_a_score] : undefined}
          totalScore={scoreData?.total_score}
          onVideoStatusChange={onVideoStatusChange}
        />
      </View>
      
      <VideoPlayerModal
        visible={showVideoPlayer}
        onClose={() => setShowVideoPlayer(false)}
        videoUrl={videoUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  }
});