import React from 'react';
import { SafeTraditionalFormsCompetitorSelectionModal, SafeEditTraditionalFormsModal } from './ModalWrapper';
import ScoreCompetitorModal from './ScoreCompetitorModal';
import LoadingToast from './LoadingToast';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface Props {
  showCompetitorModal: boolean;
  modalVisible: boolean;
  showEditModal: boolean;
  selectedCompetitor: Competitor | null;
  selectedScoreId: string;
  selectedCompetitorName: string;
  selectedCompetitorId: string;
  selectedCompetitorRank: number | undefined;
  loading: boolean;
  eventId: string;
  tournamentId: string;
  onCloseCompetitorModal: () => void;
  onCloseModal: () => void;
  onCloseEditModal: () => void;
  onCompetitorSelected: (competitor: Competitor) => void;
  onScoreSaved: () => void;
  onScoreUpdated: () => void;
}

export default function TraditionalFormsModals({
  showCompetitorModal,
  modalVisible,
  showEditModal,
  selectedCompetitor,
  selectedScoreId,
  selectedCompetitorName,
  selectedCompetitorId,
  selectedCompetitorRank,
  loading,
  eventId,
  tournamentId,
  onCloseCompetitorModal,
  onCloseModal,
  onCloseEditModal,
  onCompetitorSelected,
  onScoreSaved,
  onScoreUpdated
}: Props) {
  return (
    <>
      <SafeTraditionalFormsCompetitorSelectionModal
        visible={showCompetitorModal}
        onClose={onCloseCompetitorModal}
        tournamentId={tournamentId}
        eventId={eventId}
        onCompetitorSelected={onCompetitorSelected}
      />
      
      <ScoreCompetitorModal
        key={selectedCompetitor?.id}
        visible={modalVisible}
        selectedCompetitor={selectedCompetitor}
        eventId={eventId}
        tournamentId={tournamentId}
        onClose={onCloseModal}
        onScoreSaved={onScoreSaved}
      />
      
      <SafeEditTraditionalFormsModal
        visible={showEditModal}
        onClose={onCloseEditModal}
        scoreId={selectedScoreId}
        competitorName={selectedCompetitorName}
        competitorId={selectedCompetitorId}
        competitorRank={selectedCompetitorRank}
        onScoreUpdated={onScoreUpdated}
        eventId={eventId}
        tournamentId={tournamentId}
      />
      
      <LoadingToast visible={loading} message="Loading competitors..." />
    </>
  );
}