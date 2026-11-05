import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface SegmentOption<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  selectedValue,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, isSelected && styles.segmentActive]}
          >
            <Text style={[styles.label, isSelected && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  labelActive: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
});
