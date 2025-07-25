import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeTraditionalFormsCompetitorSelectionModal, SafeEditTraditionalFormsModal } from './ModalWrapper';
import ScoreCompetitorModal from './ScoreCompetitorModal';
import LoadingToast from './LoadingToast';
import { styles } from './TraditionalFormsStyles3';

interface Competitor {
  id: string;
  name: string;
  avatar?: string;
  source_type: string;
}

interface Props {
  showCompetitorModal: boolean;
  setShowCompetitorModal: (show: boolean) => void;
  modalVisible: boolean;
  selectedCompetitor: Competitor | null;
  eventId: string;
  tournamentId: string;
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
  handleCompetitorAdded: (competitor: Competitor) => void;
}

export default function TraditionalFormsScreenPart2({
  showCompetitorModal,
  setShowCompetitorModal,
  modalVisible,
  selectedCompetitor,
  eventId,
  tournamentId,
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
  handleCompetitorAdded
}: Props) {
  return (
    <>
      <SafeTraditionalFormsCompetitorSelectionModal
        visible={showCompetitorModal}
        onClose={() => setShowCompetitorModal(false)}
        tournamentId={tournamentId}
        eventId={eventId}
        onCompetitorSelected={handleCompetitorAdded}
      />
      
      <ScoreCompetitorModal
        key={selectedCompetitor?.id}
        visible={modalVisible}
        selectedCompetitor={selectedCompetitor}
        eventId={eventId}
        tournamentId={tournamentId}
        onClose={handleModalClose}
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
    </>
  );
}