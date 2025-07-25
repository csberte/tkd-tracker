import React from 'react';
import { View } from 'react-native';
import { SafeTraditionalFormsCompetitorSelectionModal, SafeEditTraditionalFormsModal } from './ModalWrapper';
import SimpleScoreEntryModalFinalStyled from './SimpleScoreEntryModalFinalStyled';
import LoadingToast from './LoadingToast';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface TraditionalFormsScreenPart2CompleteProps {
  showCompetitorModal: boolean;
  setShowCompetitorModal: (show: boolean) => void;
  tournamentId: string;
  eventId: string;
  handleCompetitorAdded: (competitor: Competitor) => void;
  modalVisible: boolean;
  selectedCompetitor: Competitor | null;
  handleModalClose: () => void;
  handleScoreSaved: () => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  selectedScoreId: string;
  selectedCompetitorName: string;
  selectedCompetitorId: string;
  selectedCompetitorRank?: number;
  setRefreshKey: (fn: (k: number) => number) => void;
  loading: boolean;
  showScoreModal?: boolean;
  setShowScoreModal?: (show: boolean) => void;
}

export default function TraditionalFormsScreenPart2Complete({
  showCompetitorModal,
  setShowCompetitorModal,
  tournamentId,
  eventId,
  handleCompetitorAdded,
  modalVisible,
  selectedCompetitor,
  handleModalClose,
  handleScoreSaved,
  showEditModal,
  setShowEditModal,
  selectedScoreId,
  selectedCompetitorName,
  selectedCompetitorId,
  selectedCompetitorRank,
  setRefreshKey,
  loading,
  showScoreModal,
  setShowScoreModal
}: TraditionalFormsScreenPart2CompleteProps) {
  return (
    <View>
      <SafeTraditionalFormsCompetitorSelectionModal
        visible={showCompetitorModal}
        onClose={() => setShowCompetitorModal(false)}
        tournamentId={tournamentId}
        eventId={eventId}
        onCompetitorSelected={handleCompetitorAdded}
      />
      
      {/* Optional debug: Place this right before the modal */}
      {(!showScoreModal || !selectedCompetitor) && (
        <View style={{ backgroundColor: 'red', height: 5 }} />
      )}
      
      <SimpleScoreEntryModalFinalStyled
        visible={!!(showScoreModal && selectedCompetitor)}
        onClose={() => setShowScoreModal && setShowScoreModal(false)}
        competitor={selectedCompetitor}
        eventId={eventId}
        tournamentId={tournamentId}
        onScoreSaved={handleScoreSaved}
      />
      
      <SafeEditTraditionalFormsModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        scoreId={selectedScoreId}
        competitorName={selectedCompetitorName}
        competitorId={selectedCompetitorId}
        competitorRank={selectedCompetitorRank}
        onScoreUpdated={() => setRefreshKey(k => k + 1)}
        eventId={eventId}
        tournamentId={tournamentId}
      />
      
      <LoadingToast visible={loading} message="Loading competitors..." />
    </View>
  );
}