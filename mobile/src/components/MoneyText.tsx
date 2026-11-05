import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { formatPKR } from '../utils/money';

interface MoneyTextProps {
  amount: number | null | undefined;
  size?: number;
  color?: string;
  weight?: 'bold' | 'extraBold';
  showSign?: boolean;
  style?: TextStyle;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  size = 18,
  color = colors.text,
  weight = 'extraBold',
  showSign = false,
  style,
}) => {
  const formatted = formatPKR(amount, showSign);

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: size,
          color,
          fontFamily: weight === 'bold' ? fonts.bold : fonts.extraBold,
        },
        style,
      ]}
    >
      {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.02,
  },
});

