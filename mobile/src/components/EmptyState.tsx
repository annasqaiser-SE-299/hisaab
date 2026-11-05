import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'cart-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>
        <Ionicons name={iconName} size={28} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity activeOpacity={0.8} onPress={onAction} style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  btn: {
    marginTop: 6,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
});
