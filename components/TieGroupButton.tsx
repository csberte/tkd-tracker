import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TieGroupButtonProps {
  groupIndex: number;
  isResolved: boolean;
  onPress: () => void;
  isActive: boolean;
  totalGroups: number;
}

export default function TieGroupButton({ 
  groupIndex, 
  isResolved, 
  onPress, 
  isActive, 
  totalGroups 
}: TieGroupButtonProps) {
  const getButtonText = () => {
    if (isResolved) {
      return totalGroups > 1 ? `⟳ Redo Tiebreaker #${groupIndex + 1}` : '⟳ Redo Tiebreaker';
    } else {
      return totalGroups > 1 ? `Tiebreaker #${groupIndex + 1}` : 'Tiebreaker';
    }
  };

  const buttonStyle = isResolved 
    ? [styles.redoButton] 
    : [styles.button, isActive && styles.activeButton];
    
  const textStyle = isResolved 
    ? [styles.redoButtonText] 
    : [styles.buttonText, isActive && styles.activeButtonText];

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isResolved && (
        <Ionicons name="refresh" size={16} color="#DC2626" style={styles.icon} />
      )}
      <Text style={textStyle}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120
  },
  activeButton: {
    backgroundColor: '#FF6B7A'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  activeButtonText: {
    color: '#FFFFFF'
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 160
  },
  redoButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  icon: {
    marginRight: 6,
  },
});