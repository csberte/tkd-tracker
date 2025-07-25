import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Competitor {
  id: string;
  name: string;
  avatar_url?: string;
}

interface VideoFilterDropdownsProps {
  eventTypeFilter: string;
  competitorFilter: string;
  competitors: Competitor[];
  onEventTypeChange: (type: string) => void;
  onCompetitorChange: (competitor: string) => void;
  showEventTypeModal: boolean;
  showCompetitorModal: boolean;
  setShowEventTypeModal: (show: boolean) => void;
  setShowCompetitorModal: (show: boolean) => void;
}

const eventTypes = [
  { value: 'all', label: 'All' },
  { value: 'traditional_forms', label: 'Traditional Forms' },
  { value: 'creative_forms', label: 'Creative Forms' },
  { value: 'extreme_forms', label: 'Extreme Forms' },
  { value: 'traditional_weapons', label: 'Traditional Weapons' },
  { value: 'creative_weapons', label: 'Creative Weapons' },
  { value: 'extreme_weapons', label: 'Extreme Weapons' },
  { value: 'traditional_sparring', label: 'Traditional Sparring' },
  { value: 'combat_sparring', label: 'Combat Sparring' },
];

export default function VideoFilterDropdowns({
  eventTypeFilter,
  competitorFilter,
  competitors,
  onEventTypeChange,
  onCompetitorChange,
  showEventTypeModal,
  showCompetitorModal,
  setShowEventTypeModal,
  setShowCompetitorModal
}: VideoFilterDropdownsProps) {
  const currentEventType = eventTypes.find(type => type.value === eventTypeFilter);
  const currentCompetitor = competitors.find(comp => comp.id === competitorFilter);
  
  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Event Type:</Text>
          <TouchableOpacity
            style={styles.filterDropdown}
            onPress={() => setShowEventTypeModal(!showEventTypeModal)}
          >
            <Text style={styles.filterText}>
              {currentEventType?.label || 'All'}
            </Text>
            <Ionicons 
              name={showEventTypeModal ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Competitor:</Text>
          <TouchableOpacity
            style={styles.filterDropdown}
            onPress={() => setShowCompetitorModal(!showCompetitorModal)}
          >
            <Text style={styles.filterText}>
              {currentCompetitor?.name || 'All'}
            </Text>
            <Ionicons 
              name={showCompetitorModal ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {showEventTypeModal && (
        <View style={[styles.dropdown, styles.eventTypeDropdown]}>
          {eventTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.option,
                eventTypeFilter === type.value && styles.selectedOption
              ]}
              onPress={() => {
                onEventTypeChange(type.value);
                setShowEventTypeModal(false);
              }}
            >
              <Text style={[
                styles.optionText,
                eventTypeFilter === type.value && styles.selectedText
              ]}>
                {type.label}
              </Text>
              {eventTypeFilter === type.value && (
                <Ionicons name="checkmark" size={16} color="#FF0000" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {showCompetitorModal && (
        <View style={[styles.dropdown, styles.competitorDropdown]}>
          <TouchableOpacity
            style={[
              styles.option,
              competitorFilter === 'all' && styles.selectedOption
            ]}
            onPress={() => {
              onCompetitorChange('all');
              setShowCompetitorModal(false);
            }}
          >
            <Text style={[
              styles.optionText,
              competitorFilter === 'all' && styles.selectedText
            ]}>
              All
            </Text>
            {competitorFilter === 'all' && (
              <Ionicons name="checkmark" size={16} color="#FF0000" />
            )}
          </TouchableOpacity>
          {competitors.map((competitor) => (
            <TouchableOpacity
              key={competitor.id}
              style={[
                styles.option,
                competitorFilter === competitor.id && styles.selectedOption
              ]}
              onPress={() => {
                onCompetitorChange(competitor.id);
                setShowCompetitorModal(false);
              }}
            >
              <View style={styles.competitorOption}>
                {competitor.avatar_url ? (
                  <Image 
                    source={{ uri: competitor.avatar_url }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={16} color="#666666" />
                  </View>
                )}
                <Text style={[
                  styles.optionText,
                  competitorFilter === competitor.id && styles.selectedText
                ]}>
                  {competitor.name}
                </Text>
              </View>
              {competitorFilter === competitor.id && (
                <Ionicons name="checkmark" size={16} color="#FF0000" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 999,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '600',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
  },
  eventTypeDropdown: {
    top: 70,
    left: 16,
    right: '50%',
  },
  competitorDropdown: {
    top: 70,
    left: '50%',
    right: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  selectedText: {
    color: '#FF0000',
    fontWeight: '600',
  },
  competitorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});