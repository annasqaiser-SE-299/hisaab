import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../theme';

export type StatusTagVariant =
  | 'onTrack'
  | 'nearLimit'
  | 'overBudget'
  | 'pending'
  | 'bought'
  | 'neutral'
  | 'checkout';

interface StatusTagProps {
  label: string;
  variant?: StatusTagVariant;
  style?: ViewStyle;
}

export const StatusTag: React.FC<StatusTagProps> = ({ label, variant = 'neutral', style }) => {
  const getColors = () => {
    switch (variant) {
      case 'onTrack':
        return { bg: colors.owedSoft, text: colors.owedText };
      case 'nearLimit':
      case 'pending':
        return { bg: colors.warnSoft, text: colors.warnText };
      case 'overBudget':
        return { bg: colors.oweSoft, text: colors.oweText };
      case 'bought':
      case 'checkout':
        return { bg: colors.accentSoft, text: colors.accentText };
      case 'neutral':
      default:
        return { bg: colors.divider, text: colors.textMuted };
    }
  };

  const tagColors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: tagColors.bg }, style]}>
      <Text style={[styles.text, { color: tagColors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
