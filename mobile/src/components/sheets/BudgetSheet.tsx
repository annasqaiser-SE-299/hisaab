import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { colors, fonts, radius } from '../../theme';
import { ProgressBar } from '../ProgressBar';
import { StatusTag } from '../StatusTag';
import { PrimaryButton } from '../PrimaryButton';
import { formatPKR, parseAmount, toPaisa } from '../../utils/money';
import { formatMonthFull } from '../../utils/dates';
import { api } from '../../api/endpoints';
import { useSubmit } from '../../hooks/useSubmit';
import { Budget } from '../../api/types';

interface BudgetSheetProps {
  visible: boolean;
  onClose: () => void;
  currentBudget: number;
  spent: number;
  month: string;
  onSuccess?: (updated: Budget) => void;
}

export const BudgetSheet: React.FC<BudgetSheetProps> = ({
  visible,
  onClose,
  currentBudget,
  spent,
  month,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState(currentBudget ? currentBudget.toString() : '5000');

  useEffect(() => {
    if (visible) {
      setAmountStr(currentBudget ? currentBudget.toString() : '5000');
    }
  }, [visible, currentBudget]);

  const parsedAmount = parseAmount(amountStr);
  // Same rules as the server: compare whole paisa, so 74.96% can't round up into Near Limit.
  const spentPaisa = toPaisa(spent);
  const budgetPaisa = toPaisa(parsedAmount);
  const roundedPercent = budgetPaisa > 0 ? Math.round((spentPaisa * 1000) / budgetPaisa) / 10 : 0;
  const remaining = parsedAmount - spent;

  const status: 'On Track' | 'Near Limit' | 'Over Budget' =
    spentPaisa * 100 < budgetPaisa * 75
      ? 'On Track'
      : spentPaisa < budgetPaisa
      ? 'Near Limit'
      : 'Over Budget';

  const { submit, isSubmitting } = useSubmit(
    async (amount: number) => {
      const res = await api.updateBudget(amount);
      return res;
    },
    {
      successMessage: 'Budget updated successfully',
      onSuccess: (data) => {
        if (onSuccess) onSuccess(data);
        onClose();
      },
    }
  );

  const handleSave = () => {
    if (parsedAmount <= 0) return;
    submit(parsedAmount);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Monthly budget"
    >
      <View style={styles.container}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Household budget per month</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>PKR</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="5000.00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Live Preview Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>
            Preview for {formatMonthFull(month)}
          </Text>

          <ProgressBar percent={roundedPercent} status={status} height={10} />

          <View style={styles.previewRow}>
            <StatusTag
              label={`${status} · ${roundedPercent}%`}
              variant={
                status === 'On Track'
                  ? 'onTrack'
                  : status === 'Near Limit'
                  ? 'nearLimit'
                  : 'overBudget'
              }
            />
            <Text style={styles.remainingText}>
              {remaining >= 0
                ? `${formatPKR(remaining)} left`
                : `Over by ${formatPKR(Math.abs(remaining))}`}
            </Text>
          </View>
        </View>

        <PrimaryButton
          title="Save budget"
          loading={isSubmitting}
          loadingText="Saving budget…"
          disabled={parsedAmount <= 0}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: colors.surface,
  },
  prefix: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  previewCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  previewTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    marginTop: 8,
  },
});

