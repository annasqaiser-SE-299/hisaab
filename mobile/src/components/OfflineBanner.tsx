import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

interface OfflineBannerProps {
  onRetry: () => void;
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  onRetry,
  message = "Can't reach server. Check Wi-Fi.",
}) => {
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.surface} />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity activeOpacity={0.8} onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.surface,
  },
  retryBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.surface,
  },
});

