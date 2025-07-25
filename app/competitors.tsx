import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ActionButton from '../components/ActionButton';

interface Competitor {
  id: string;
  name: string;
  belt: string;
  age: number;
  weight: string;
  record: string;
}

export default function Competitors() {
  const [competitors] = useState<Competitor[]>([
    {
      id: '1',
      name: 'Mike Johnson',
      belt: 'Black',
      age: 16,
      weight: '68kg',
      record: '12-2',
    },
    {
      id: '2',
      name: 'Emma Davis',
      belt: 'Red',
      age: 14,
      weight: '55kg',
      record: '8-1',
    },
  ]);

  const handleCompetitorPress = (competitor: Competitor) => {
    Alert.alert('Competitor Profile', `View ${competitor.name}'s profile`);
  };

  const handleAddCompetitor = () => {
    Alert.alert('Add Competitor', 'Feature coming soon!');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Competitors</Text>
        <Text style={styles.subtitle}>Track frequent competitors</Text>
      </View>

      <ActionButton title="Add New Competitor" onPress={handleAddCompetitor} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Known Competitors</Text>
        {competitors.map((competitor) => (
          <View key={competitor.id} style={styles.competitorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.competitorName}>{competitor.name}</Text>
              <Text style={styles.belt}>{competitor.belt} Belt</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.detail}>Age: {competitor.age}</Text>
              <Text style={styles.detail}>Weight: {competitor.weight}</Text>
              <Text style={styles.detail}>Record: {competitor.record}</Text>
            </View>
            <ActionButton
              title="View Profile"
              variant="secondary"
              onPress={() => handleCompetitorPress(competitor)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  competitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  competitorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  belt: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: '#666666',
  },
});