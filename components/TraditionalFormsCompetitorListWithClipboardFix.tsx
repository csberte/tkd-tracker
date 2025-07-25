import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TraditionalFormsCompetitorCardWithClipboardFix from './TraditionalFormsCompetitorCardWithClipboardFix';

interface TraditionalFormsCompetitorListProps {
  competitors: any[];
  onPress: (competitor: any) => void;
  tieBreakerActive?: boolean;
  selectedWinners?: string[];
  onTieBreakerSelect?: (competitorId: string) => void;
  eventId: string;
  eventName?: string;
  tournamentName?: string;
  tournamentClass?: string;
  onVideoUploaded?: () => void;
}

export default function TraditionalFormsCompetitorListWithClipboardFix({
  competitors,
  onPress,
  tieBreakerActive,
  selectedWinners,
  onTieBreakerSelect,
  eventId,
  eventName,
  tournamentName,
  tournamentClass,
  onVideoUploaded
}: TraditionalFormsCompetitorListProps) {
  if (!competitors || competitors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No competitors added yet</Text>
        <Text style={styles.emptySubtext}>Tap the + button to add competitors</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {competitors.map((competitor, index) => (
        <TraditionalFormsCompetitorCardWithClipboardFix
          key={competitor?.id || competitor?.tournament_competitor_id || index}
          competitor={competitor}
          onPress={onPress}
          tieBreakerActive={tieBreakerActive}
          selectedWinners={selectedWinners}
          onTieBreakerSelect={onTieBreakerSelect}
          eventId={eventId}
          eventName={eventName}
          tournamentName={tournamentName}
          tournamentClass={tournamentClass}
          onVideoUploaded={onVideoUploaded}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});