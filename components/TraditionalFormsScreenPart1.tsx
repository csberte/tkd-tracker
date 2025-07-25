import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import TraditionalFormsScreenPart2Complete from './TraditionalFormsScreenPart2Complete';

export default function TraditionalFormsScreen() {
  const { eventId, tournamentId } = useLocalSearchParams<{ eventId: string; tournamentId: string }>();

  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [selectedScoreId, setSelectedScoreId] = useState('');
  const [selectedCompetitorName, setSelectedCompetitorName] = useState('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [selectedCompetitorRank, setSelectedCompetitorRank] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleCompetitorAdded = (competitor) => {
    setSelectedCompetitor(competitor);
    setModalVisible(true);
  };

  const handleModalClose = () => setModalVisible(false);
  const handleScoreSaved = () => setRefreshKey((k) => k + 1);

  if (!eventId || !tournamentId) return null;

  return (
    <TraditionalFormsScreenPart2Complete
      showCompetitorModal={showCompetitorModal}
      setShowCompetitorModal={setShowCompetitorModal}
      tournamentId={tournamentId}
      eventId={eventId}
      handleCompetitorAdded={handleCompetitorAdded}
      modalVisible={modalVisible}
      selectedCompetitor={selectedCompetitor}
      handleModalClose={handleModalClose}
      handleScoreSaved={handleScoreSaved}
      showEditModal={showEditModal}
      setShowEditModal={setShowEditModal}
      selectedScoreId={selectedScoreId}
      selectedCompetitorName={selectedCompetitorName}
      selectedCompetitorId={selectedCompetitorId}
      selectedCompetitorRank={selectedCompetitorRank}
      setRefreshKey={setRefreshKey}
      loading={loading}
    />
  );
}