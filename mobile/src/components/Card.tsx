import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'surface' | 'owed' | 'owe' | 'warn' | 'muted';
}

export const Card: React.FC<CardProps> = ({ variant = 'surface', style, children, ...props }) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'owed':
        return styles.cardOwed;
      case 'owe':
        return styles.cardOwe;
      case 'warn':
        return styles.cardWarn;
      case 'muted':
        return styles.cardMuted;
      case 'surface':
      default:
        return styles.cardSurface;
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    padding: 20,
  },
  cardSurface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardOwed: {
    backgroundColor: colors.owedSoft,
  },
  cardOwe: {
    backgroundColor: colors.oweSoft,
  },
  cardWarn: {
    backgroundColor: colors.warnSoft,
  },
  cardMuted: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

