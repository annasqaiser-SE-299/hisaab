import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface ProgressBarProps {
  percent: number; // 0 to 100 (can be > 100)
  status?: 'On Track' | 'Near Limit' | 'Over Budget';
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  status,
  height = 12,
  style,
}) => {
  const getFillColor = () => {
    if (status === 'Over Budget' || percent >= 100) return colors.owe;
    if (status === 'Near Limit' || percent >= 75) return colors.warn;
    return colors.owed;
  };

  const clampedPercent = Math.min(Math.max(percent, 0), 100);

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPercent}%`,
            height,
            backgroundColor: getFillColor(),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.divider,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});

