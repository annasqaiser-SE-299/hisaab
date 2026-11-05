import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '../theme';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 999,
}) => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleDecrement}
        disabled={value <= min}
        style={[styles.btn, value <= min && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.valueText}>{value}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleIncrement}
        disabled={value >= max}
        style={[styles.btn, value >= max && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    height: 48,
    backgroundColor: colors.surface,
  },
  btn: {
    width: 44,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  valueText: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
