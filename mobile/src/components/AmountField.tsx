import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius } from '../theme';

interface AmountFieldProps extends Omit<TextInputProps, 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  prefix?: string;
}

export const AmountField: React.FC<AmountFieldProps> = ({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  prefix = 'PKR',
  style,
  ...props
}) => {
  const handleChange = (text: string) => {
    // allow only numbers and at most one decimal point with 2 decimals
    const clean = text.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChangeText(clean);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.wrapperError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  inputWrapper: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wrapperError: {
    borderColor: colors.owe,
  },
  prefix: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.owe,
  },
});

