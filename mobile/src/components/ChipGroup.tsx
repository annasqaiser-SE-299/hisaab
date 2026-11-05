import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip } from './Chip';

interface Option<T> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

interface ChipGroupProps<T> {
  options: Option<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  scrollable?: boolean;
  size?: 'sm' | 'md';
}

export function ChipGroup<T extends string | number>({
  options,
  selectedValue,
  onSelect,
  scrollable = false,
  size = 'md',
}: ChipGroupProps<T>) {
  const content = options.map((opt) => (
    <Chip
      key={String(opt.value)}
      label={opt.label}
      icon={opt.icon}
      size={size}
      selected={selectedValue === opt.value}
      onPress={() => onSelect(opt.value)}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
});

