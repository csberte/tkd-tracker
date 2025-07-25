import React from 'react';
import { View } from 'react-native';
import ScoreCompetitorModal from '../components/ScoreCompetitorModal';

export default function ScoreCompetitorModalTestScreen() {
  const testCompetitor = {
    id: 'test-id',
    name: 'Test Competitor',
    judgeAScore: 5,
    judgeBScore: 5,
    judgeCScore: 5,
    totalScore: 15,
    videoUrl: null,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScoreCompetitorModal
        visible={true}
        onClose={() => {}}
        competitor={testCompetitor}
        onSave={() => {}}
        onUpdateScore={() => {}}
        eventId="test-event-id"
        isJudgeA={true}
        isJudgeB={false}
        isJudgeC={false}
        judgeAName="Judge A"
        judgeBName="Judge B"
        judgeCName="Judge C"
      />
    </View>
  );
}