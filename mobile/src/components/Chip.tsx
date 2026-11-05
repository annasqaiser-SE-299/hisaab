import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  size = 'md',
  style,
  textStyle,
  icon,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        selected ? styles.selectedContainer : styles.unselectedContainer,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          selected ? styles.selectedText : styles.unselectedText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    gap: 6,
  },
  sizeSm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sizeMd: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unselectedContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  selectedContainer: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  text: {
    fontFamily: fonts.semiBold,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 14,
  },
  unselectedText: {
    color: colors.text,
  },
  selectedText: {
    color: colors.accentText,
    fontFamily: fonts.bold,
  },
});
