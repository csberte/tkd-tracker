import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import AnimatedHorizontalCompetitorCard from './AnimatedHorizontalCompetitorCard';
import CompetitorSearchBar from './CompetitorSearchBar';
import CompetitorFilterPills from './CompetitorFilterPills';
import AssignToEventsModal from './AssignToEventsModal';

type FilterType = 'All' | 'Champions' | 'Competitors' | 'Other';

interface TournamentCompetitor {
  id: string;
  name: string;
  source_type: 'Champion' | 'Competitor' | 'Other';
  source_id?: string;
  avatar?: string;
  tournament_competitor_id?: string;
  school?: string;
}

interface HorizontalCompetitorListProps {
  competitors: TournamentCompetitor[];
  setCompetitors: (fn: (old: TournamentCompetitor[]) => TournamentCompetitor[]) => void;
  tournamentId: string;
  onAssignmentsUpdated: () => void;
  onCompetitorDeleted?: () => void;
  refreshChampions?: () => void;
  refreshCompetitors?: () => void;
  refreshTournamentCompetitors?: () => void;
}

export default function HorizontalCompetitorList({
  competitors,
  setCompetitors,
  tournamentId,
  onAssignmentsUpdated,
  onCompetitorDeleted,
  refreshChampions,
  refreshCompetitors,
  refreshTournamentCompetitors
}: HorizontalCompetitorListProps) {
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedCompetitor, setSelectedCompetitor] = useState<TournamentCompetitor | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const filteredCompetitors = useMemo(() => {
    let filtered = competitors;

    if (searchText.trim()) {
      filtered = filtered.filter(competitor =>
        competitor.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (activeFilter !== 'All') {
      const filterMap = {
        'Champions': 'Champion',
        'Competitors': 'Competitor',
        'Other': 'Other'
      };
      filtered = filtered.filter(competitor =>
        competitor.source_type === filterMap[activeFilter]
      );
    }

    return filtered;
  }, [competitors, searchText, activeFilter]);

  React.useEffect(() => {
    setDataVersion(prev => prev + 1);
  }, [competitors]);

  const handleCompetitorPress = (competitor: TournamentCompetitor) => {
    setSelectedCompetitor(competitor);
    setShowAssignModal(true);
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedCompetitor(null);
  };

  const handleCompetitorDelete = () => {
    setShowAssignModal(false);
    setSelectedCompetitor(null);
    onCompetitorDeleted?.();
  };

  const handleRefreshWithFilterUpdate = async () => {
    if (refreshTournamentCompetitors) {
      await refreshTournamentCompetitors();
    }
    if (refreshChampions) {
      await refreshChampions();
    }
    if (refreshCompetitors) {
      await refreshCompetitors();
    }
  };

  const handleCardUpdate = () => {
    handleRefreshWithFilterUpdate();
  };

  const handleCardDelete = () => {
    onCompetitorDeleted?.();
  };

  return (
    <View style={styles.container}>
      <CompetitorSearchBar
        value={searchText}
        onChangeText={setSearchText}
      />
      
      <CompetitorFilterPills
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces
      >
        {filteredCompetitors.map((competitor, index) => (
          <AnimatedHorizontalCompetitorCard
            key={`${competitor.id}-${dataVersion}`}
            competitor={competitor}
            index={index}
            onPress={() => handleCompetitorPress(competitor)}
            tournamentId={tournamentId}
            onUpdate={handleCardUpdate}
            onDelete={handleCardDelete}
          />
        ))}
      </ScrollView>

      {selectedCompetitor && (
        <AssignToEventsModal
          visible={showAssignModal}
          onClose={handleCloseModal}
          competitor={selectedCompetitor}
          tournamentId={tournamentId}
          onAssignmentsUpdated={onAssignmentsUpdated}
          onCompetitorDeleted={handleCompetitorDelete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});