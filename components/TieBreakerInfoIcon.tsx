import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TieBreakerInfoIconProps {
  status: string;
}

const getTieBreakerInfo = (status: string) => {
  console.log('[TieBreakerInfoIcon] Processing status:', status);
  
  if (status === 'won' || status === 'selected_1') {
    return { color: '#2196F3', tooltip: 'Won Tiebreaker' };
  }
  if (status === 'second' || status === 'selected_2') {
    return { color: '#FFC107', tooltip: 'Placed second tiebreaker' };
  }
  if (status === 'lost' || status === 'unselected' || (status.startsWith('selected_') && status !== 'selected_1' && status !== 'selected_2')) {
    console.log('[TieBreakerInfoIcon] Showing red icon for status:', status);
    return { color: '#F44336', tooltip: 'Lost tiebreaker' };
  }
  
  console.log('[TieBreakerInfoIcon] No icon for status:', status);
  return null;
};

export default function TieBreakerInfoIcon({ status }: TieBreakerInfoIconProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = getTieBreakerInfo(status);
  
  if (!info) return null;
  
  return (
    <>
      <TouchableOpacity 
        onPress={() => setShowTooltip(true)}
        style={styles.iconContainer}
      >
        <Ionicons 
          name="information-circle" 
          size={20} 
          color={info.color} 
        />
      </TouchableOpacity>
      
      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{info.tooltip}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    padding: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    maxWidth: 250,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});