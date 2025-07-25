import React from 'react';
import { View } from 'react-native';
import TraditionalFormsCompetitorCard from './TraditionalFormsCompetitorCard';
import { CompetitorWithScore } from '../app/lib/eventHelpers';

interface TraditionalFormsScreenPart3Props {
  displayCompetitors: CompetitorWithScore[];
  tieBreakerActive: boolean;
  currentTieGroup: CompetitorWithScore[];
  selectedWinners: string[];
  eventId: string;
  onCompetitorPress: (competitor: CompetitorWithScore) => void;
  onTieBreakerSelect: (competitorId: string) => void;
}

export default function TraditionalFormsScreenPart3({
  displayCompetitors,
  tieBreakerActive,
  currentTieGroup,
  selectedWinners,
  eventId,
  onCompetitorPress,
  onTieBreakerSelect
}: TraditionalFormsScreenPart3Props) {
  return (
    <>
      {displayCompetitors.map((competitor, index) => {
        const isInActiveTieGroup = tieBreakerActive && currentTieGroup.some(c => c?.id === competitor?.id);
        const isSelected = selectedWinners.includes(competitor?.id || '');
        
        return (
          <TraditionalFormsCompetitorCard
            key={competitor?.id || `competitor-${index}`}
            competitor={competitor}
            index={index}
            tieBreakerActive={tieBreakerActive && isInActiveTieGroup}
            selectedWinners={selectedWinners}
            onPress={() => onCompetitorPress(competitor)}
            onTieBreakerSelect={() => onTieBreakerSelect(competitor?.id || '')}
            videoStatusMap={{}}
            eventId={eventId}
            isHighlighted={isInActiveTieGroup}
            isSelected={isSelected}
          />
        );
      })}
    </>
  );
}