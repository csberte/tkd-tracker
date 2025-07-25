import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { styles } from '../../components/ChampionDetailStyles';
import EditChampionModal from '../../components/EditChampionModal';
import ChampionVideosEnhanced from '../../components/ChampionVideosEnhanced';
import ChampionTournamentsListEnhanced from '../../components/ChampionTournamentsListEnhanced';

interface Champion {
  id: string;
  name: string;
  email: string;
  location?: string;
  school?: string;
  wins: number;
  losses: number;
  avatar?: string;
}

type TabType = 'overview' | 'tournaments' | 'videos';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ChampionDetailEnhanced() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [champion, setChampion] = useState<Champion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      loadChampion();
    }
  }, [id]);

  const loadChampion = async () => {
    try {
      const { data, error } = await supabase
        .from('champions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error loading champion:', error);
        Alert.alert('Error', 'Failed to load champion details');
      } else {
        setChampion(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Champion',
      'Are you sure you want to delete this champion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('champions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting champion:', error);
        Alert.alert('Error', 'Failed to delete champion');
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to delete champion');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Location</Text>
              <Text style={styles.statValue}>{champion?.location || 'N/A'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>School</Text>
              <Text style={styles.statValue}>{champion?.school || 'N/A'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wins</Text>
              <Text style={styles.statValue}>{champion?.wins || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Losses</Text>
              <Text style={styles.statValue}>{champion?.losses || 0}</Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
                <Ionicons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'tournaments':
        return (
          <View style={styles.tabContent}>
            <ChampionTournamentsListEnhanced championId={id as string} />
          </View>
        );
      case 'videos':
        return (
          <View style={styles.tabContent}>
            <ChampionVideosEnhanced championId={id as string} />
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!champion) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Champion not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = getInitials(champion.name);
  const backgroundColor = getColorFromName(champion.name);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Champion Details</Text>
        <View style={styles.editBtn} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          {champion.avatar ? (
            <Image
              source={{ uri: champion.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{champion.name}</Text>
          <Text style={styles.email}>{champion.email}</Text>
          <Text style={styles.record}>
            {champion.wins}-{champion.losses} ({champion.wins + champion.losses} matches)
          </Text>
        </View>

        <View style={styles.tabBar}>
          {(['overview', 'tournaments', 'videos'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderTabContent()}
      </ScrollView>

      <EditChampionModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSuccess={loadChampion}
        champion={champion}
      />
    </View>
  );
}