import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import ActionButton from '../../components/ActionButton';
import AddCompetitorModal from '../../components/AddCompetitorModal';
import AnimatedCompetitorCard from '../../components/AnimatedCompetitorCard';
import AnimatedTabScreen from '../../components/AnimatedTabScreen';

interface Competitor {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  school: string;
  avatar?: string;
}

export default function CompetitorsTab() {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddCompetitorModal, setShowAddCompetitorModal] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const router = useRouter();

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadCompetitors();
      }
    }, [user])
  );

  const loadCompetitors = async () => {
    if (!user) return;
    
    console.log('Loading competitors...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error loading competitors:', error);
        Alert.alert('Error', 'Failed to load competitors');
      } else if (data) {
        console.log('Competitors loaded:', data.length);
        setCompetitors(data);
        setDataVersion(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading competitors:', error);
      Alert.alert('Error', 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = () => {
    setShowAddCompetitorModal(true);
  };

  const handleCompetitorAdded = async () => {
    console.log('Competitor added, refreshing list...');
    await loadCompetitors();
    console.log('Competitors list refreshed');
  };

  const handleCompetitorPress = (competitorId: string) => {
    router.push(`/competitor/${competitorId}`);
  };

  return (
    <AnimatedTabScreen direction="right">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Competitors</Text>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tournament Opponents</Text>
            
            <View style={styles.addButtonContainer}>
              <ActionButton title="Add New Competitor" onPress={handleAddCompetitor} />
            </View>
            
            {loading ? (
              <Text style={styles.loadingText}>Loading competitors...</Text>
            ) : competitors.length > 0 ? (
              competitors.map((competitor, index) => (
                <AnimatedCompetitorCard
                  key={`${competitor.id}-${dataVersion}`}
                  competitor={competitor}
                  index={index}
                  onPress={() => handleCompetitorPress(competitor.id)}
                />
              ))
            ) : (
              <Text style={styles.noDataText}>No competitors found</Text>
            )}
          </View>
        </ScrollView>

        <AddCompetitorModal
          visible={showAddCompetitorModal}
          onClose={() => setShowAddCompetitorModal(false)}
          onSuccess={handleCompetitorAdded}
        />
      </View>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF0000',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  addButtonContainer: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});