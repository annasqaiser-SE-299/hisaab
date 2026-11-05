import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onToggle,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onToggle(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={[
        styles.box,
        checked ? styles.checked : styles.unchecked,
        disabled && styles.disabled,
        style,
      ]}
    >
      {checked && <Ionicons name="checkmark" size={16} color={colors.surface} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unchecked: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  checked: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
});

