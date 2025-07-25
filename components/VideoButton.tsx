import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  color: keyof typeof COLORS;
  icon: ReactNode;
  label: string;
  full?: boolean;
  onPress: () => void;
  disabled?: boolean;
  border?: boolean;
  style?: ViewStyle;
}

export default function VideoButton({ color, icon, label, full, onPress, disabled, border, style }: Props) {
  const isShareButton = label.includes('Share Video');
  
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: COLORS[color] },
        full ? styles.fullWidth : styles.halfWidth,
        border && styles.border,
        isShareButton && styles.shareButtonBorder,
        disabled && styles.disabled,
        style
      ]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {icon}
      <Text style={[styles.txt, color === 'orange' && styles.boldText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
    paddingHorizontal: 12
  },
  txt: {
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center'
  },
  boldText: {
    fontWeight: 'bold'
  },
  disabled: {
    opacity: 0.4
  },
  fullWidth: {
    flex: 1
  },
  halfWidth: {
    flex: 1
  },
  border: {
    borderWidth: 1,
    borderColor: COLORS.black
  },
  shareButtonBorder: {
    borderWidth: 2,
    borderColor: COLORS.black
  }
});