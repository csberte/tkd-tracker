import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../app/lib/supabase';
import { styles } from './AddTournamentCompetitorModalStyles';
import DuplicateConfirmationModal from './DuplicateConfirmationModal';

interface ChampionRow {
  id: string;
  name: string;
  avatar?: string;
}

interface CompetitorRow {
  id: string;
  name: string;
  avatar?: string;
}

interface TournamentCompetitor {
  id: string;
  name: string;
  source_type: string;
  source_id?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  onCompetitorAdded: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export default function AddTournamentCompetitorModalFiltered({ visible, onClose, tournamentId, onCompetitorAdded }: Props) {
  const [activeTab, setActiveTab] = useState<'champions' | 'competitors' | 'other'>('champions');
  const [champions, setChampions] = useState<ChampionRow[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [existingTournamentCompetitors, setExistingTournamentCompetitors] = useState<TournamentCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChampions, setSelectedChampions] = useState<Set<string>>(new Set());
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [otherName, setOtherName] = useState('');
  const [otherSchool, setOtherSchool] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingOtherName, setPendingOtherName] = useState('');

  const loadLists = useCallback(async () => {
    setLoading(true);
    const [{ data: ch, error: e1 }, { data: co, error: e2 }, { data: tc, error: e3 }] = await Promise.all([
      supabase.from('champions').select('id, name, avatar'),
      supabase.from('competitors').select('id, name, avatar'),
      supabase.from('tournament_competitors').select('id, name, source_type, source_id').eq('tournament_id', tournamentId)
    ]);
    if (e1 || e2 || e3) {
      Alert.alert('Error', 'Failed to load lists');
    } else {
      setChampions(ch ?? []);
      setCompetitors(co ?? []);
      setExistingTournamentCompetitors(tc ?? []);
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    if (visible) {
      loadLists();
      setSelectedChampions(new Set());
      setSelectedCompetitors(new Set());
      setSearchQuery('');
      setOtherName('');
      setOtherSchool('');
    }
  }, [visible, loadLists]);

  const getFilteredChampions = () => {
    const existingChampionIds = new Set(
      existingTournamentCompetitors
        .filter(tc => tc.source_type === 'Champion' && tc.source_id)
        .map(tc => tc.source_id!)
    );
    return champions.filter(c => !existingChampionIds.has(c.id));
  };

  const getFilteredCompetitors = () => {
    const existingCompetitorIds = new Set(
      existingTournamentCompetitors
        .filter(tc => tc.source_type === 'Competitor' && tc.source_id)
        .map(tc => tc.source_id!)
    );
    return competitors.filter(c => !existingCompetitorIds.has(c.id));
  };

  const insertTournamentCompetitor = async ({ tournamentId, displayName, avatar, sourceType, sourceId, school }: {
    tournamentId: string; displayName: string; avatar?: string | null; sourceType: 'Champion' | 'Competitor' | 'Other';
    sourceId?: string | null; school?: string | null;
  }) => {
    const { error } = await supabase.from('tournament_competitors').insert({
      tournament_id: tournamentId, name: displayName, avatar, source_type: sourceType,
      source_id: sourceId ?? null, school: school ?? null,
    });
    if (error) throw error;
  };

  const handleAddSelected = async () => {
    setLoading(true);
    try {
      if (activeTab === 'champions' && selectedChampions.size > 0) {
        const filteredChampions = getFilteredChampions();
        const selectedList = filteredChampions.filter(c => selectedChampions.has(c.id));
        for (const champion of selectedList) {
          await insertTournamentCompetitor({ tournamentId, displayName: champion.name, avatar: champion.avatar, sourceType: 'Champion', sourceId: champion.id });
        }
      } else if (activeTab === 'competitors' && selectedCompetitors.size > 0) {
        const filteredCompetitors = getFilteredCompetitors();
        const selectedList = filteredCompetitors.filter(c => selectedCompetitors.has(c.id));
        for (const competitor of selectedList) {
          await insertTournamentCompetitor({ tournamentId, displayName: competitor.name, avatar: competitor.avatar, sourceType: 'Competitor', sourceId: competitor.id });
        }
      }
      onCompetitorAdded();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add selected');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOther = async () => {
    if (!otherName.trim()) return;
    const trimmedName = otherName.trim();
    setLoading(true);
    try {
      await insertTournamentCompetitor({ tournamentId, displayName: trimmedName, sourceType: 'Other', sourceId: null, school: otherSchool.trim() || null });
      onCompetitorAdded();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add competitor');
    } finally {
      setLoading(false);
    }
  };

  const renderListItem = (item: ChampionRow | CompetitorRow, isSelected: boolean, onToggle: () => void) => (
    <TouchableOpacity key={item.id} style={[styles.listItem, isSelected && styles.selectedItem]} onPress={onToggle}>
      <View style={styles.itemContent}>
        <View style={styles.avatarContainer}>
          {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.avatar} /> : 
            <View style={[styles.avatar, styles.initialsAvatar]}><Text style={styles.initials}>{getInitials(item.name)}</Text></View>}
        </View>
        <Text style={styles.itemName}>{item.name}</Text>
      </View>
      <View style={styles.checkbox}>
        {isSelected ? <Ionicons name="checkbox" size={24} color="#FF0000" /> : <Ionicons name="square-outline" size={24} color="#CCCCCC" />}
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    if (activeTab === 'champions') {
      const filteredChampions = getFilteredChampions();
      const searchFiltered = filteredChampions.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filteredChampions.length === 0) {
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>All champions have been added to this tournament! 🎉</Text>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.tabContent}>
          <TextInput style={styles.searchInput} placeholder="Search champions..." value={searchQuery} onChangeText={setSearchQuery} />
          <ScrollView style={styles.scrollView}>
            {searchFiltered.map((champion) => renderListItem(champion, selectedChampions.has(champion.id), () => {
              const newSelected = new Set(selectedChampions);
              if (newSelected.has(champion.id)) newSelected.delete(champion.id); else newSelected.add(champion.id);
              setSelectedChampions(newSelected);
            }))}
          </ScrollView>
          {selectedChampions.size > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddSelected} disabled={loading}>
              <Text style={styles.addButtonText}>Add Selected ({selectedChampions.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    if (activeTab === 'competitors') {
      const filteredCompetitors = getFilteredCompetitors();
      const searchFiltered = filteredCompetitors.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filteredCompetitors.length === 0) {
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>All competitors have been added to this tournament! 🎉</Text>
            </View>
          </View>
        );
      }
      
      return (
        <View style={styles.tabContent}>
          <TextInput style={styles.searchInput} placeholder="Search competitors..." value={searchQuery} onChangeText={setSearchQuery} />
          <ScrollView style={styles.scrollView}>
            {searchFiltered.map((competitor) => renderListItem(competitor, selectedCompetitors.has(competitor.id), () => {
              const newSelected = new Set(selectedCompetitors);
              if (newSelected.has(competitor.id)) newSelected.delete(competitor.id); else newSelected.add(competitor.id);
              setSelectedCompetitors(newSelected);
            }))}
          </ScrollView>
          {selectedCompetitors.size > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddSelected} disabled={loading}>
              <Text style={styles.addButtonText}>Add Selected ({selectedCompetitors.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
        <TextInput style={styles.input} placeholder="Name (required)" value={otherName} onChangeText={setOtherName} />
        <TextInput style={styles.input} placeholder="Location/School (optional)" value={otherSchool} onChangeText={setOtherSchool} />
        <TouchableOpacity style={[styles.addButton, !otherName.trim() && styles.addButtonDisabled]} onPress={handleAddOther} disabled={!otherName.trim() || loading}>
          <Text style={styles.addButtonText}>Add Competitor</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Competitor</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#000000" /></TouchableOpacity>
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'champions' && styles.activeTab]} onPress={() => setActiveTab('champions')}>
            <View style={styles.tabContentContainer}>
              <Text style={styles.tabIcon}>🥋</Text>
              <Text style={[styles.tabText, activeTab === 'champions' && styles.activeTabText]}>Champions</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'competitors' && styles.activeTab]} onPress={() => setActiveTab('competitors')}>
            <View style={styles.tabContentContainer}>
              <Text style={styles.tabIcon}>🤺</Text>
              <Text style={[styles.tabText, activeTab === 'competitors' && styles.activeTabText]}>Competitors</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'other' && styles.activeTab]} onPress={() => setActiveTab('other')}>
            <View style={styles.tabContentContainer}>
              <Text style={styles.tabIcon}>👤</Text>
              <Text style={[styles.tabText, activeTab === 'other' && styles.activeTabText]}>Other</Text>
            </View>
          </TouchableOpacity>
        </View>
        {renderTabContent()}
        <DuplicateConfirmationModal visible={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} onConfirm={() => {}} competitorName={pendingOtherName} />
      </View>
    </Modal>
  );
}