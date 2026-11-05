import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="45%" height={14} borderRadius={6} />
      <Skeleton width="70%" height={28} borderRadius={8} />
      <Skeleton width="100%" height={12} borderRadius={radius.pill} />
    </View>
  );
};

export const SkeletonRow: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={styles.rowRight}>
        <Skeleton width="60%" height={14} borderRadius={6} />
        <Skeleton width="40%" height={11} borderRadius={6} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.divider,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
    gap: 12,
  },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flex: 1,
    gap: 8,
  },
});
