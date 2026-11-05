import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { colors, fonts, radius } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { formatPKR, parseAmount } from '../../utils/money';
import { api } from '../../api/endpoints';
import { useSubmit } from '../../hooks/useSubmit';
import { BalanceItem, Settlement } from '../../api/types';

interface SettleUpSheetProps {
  visible: boolean;
  onClose: () => void;
  balances: BalanceItem[];
  currentUserId: string;
  onSuccess?: (settlement: Settlement) => void;
}

export const SettleUpSheet: React.FC<SettleUpSheetProps> = ({
  visible,
  onClose,
  balances,
  currentUserId,
  onSuccess,
}) => {
  const myBalance = balances.find((b) => b.member_id === currentUserId);
  const myDebt = myBalance && myBalance.net < 0 ? Math.abs(myBalance.net) : 0;
  const creditors = balances.filter((b) => b.member_id !== currentUserId && b.net > 0);

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');

  useEffect(() => {
    if (visible && creditors.length > 0) {
      const defaultCreditor = creditors[0];
      setSelectedRecipientId(defaultCreditor.member_id);
      const maxAllowed = Math.min(myDebt, defaultCreditor.net);
      setAmountStr(maxAllowed > 0 ? maxAllowed.toFixed(2) : '');
    } else if (visible) {
      setSelectedRecipientId('');
      setAmountStr('');
    }
  }, [visible, creditors.length, myDebt]);

  const selectedCreditor = creditors.find((c) => c.member_id === selectedRecipientId);
  const maxAllowed = selectedCreditor ? Math.min(myDebt, selectedCreditor.net) : 0;
  const enteredAmount = parseAmount(amountStr);
  const isOverLimit = enteredAmount > maxAllowed;

  const { submit, isSubmitting } = useSubmit(
    async (
      data: { sender_id: string; recipient_id: string; amount: number },
      idempotencyKey: string
    ) => {
      const res = await api.settle(data, idempotencyKey);
      return res;
    },
    {
      successMessage: 'Settlement recorded',
      onSuccess: (data) => {
        if (onSuccess) onSuccess(data);
        onClose();
      },
    }
  );

  const handleUseMax = () => {
    if (maxAllowed > 0) {
      setAmountStr(maxAllowed.toFixed(2));
    }
  };

  const handleRecord = () => {
    if (!selectedRecipientId || enteredAmount <= 0) return;
    submit({
      sender_id: currentUserId,
      recipient_id: selectedRecipientId,
      amount: enteredAmount,
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Settle up">
      {myDebt <= 0 || creditors.length === 0 ? (
        <View style={styles.settledContainer}>
          <View style={styles.settledIconBox}>
            <Ionicons name="checkmark-circle" size={44} color={colors.owed} />
          </View>
          <Text style={styles.settledTitle}>You're all settled up!</Text>
          <Text style={styles.settledSub}>
            You don't owe any money to anyone right now.
          </Text>
          <PrimaryButton
            title="Done"
            variant="outline"
            onPress={onClose}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <View style={styles.formContainer}>
          {/* From info */}
          <View style={styles.infoBox}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>From</Text>
              <Text style={styles.infoName}>
                {myBalance?.name || 'You'} (you)
              </Text>
            </View>
            <Text style={styles.oweHighlight}>
              owes {formatPKR(myDebt)}
            </Text>
          </View>

          {/* Pay to selector */}
          <View style={styles.sectionCol}>
            <Text style={styles.sectionLabel}>Pay to</Text>
            <View style={styles.creditorGrid}>
              {creditors.map((c) => {
                const isSelected = c.member_id === selectedRecipientId;
                return (
                  <TouchableOpacity
                    key={c.member_id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedRecipientId(c.member_id);
                      const newMax = Math.min(myDebt, c.net);
                      setAmountStr(newMax > 0 ? newMax.toFixed(2) : '');
                    }}
                    style={[
                      styles.creditorCard,
                      isSelected
                        ? styles.creditorCardSelected
                        : styles.creditorCardUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditorName,
                        isSelected && styles.creditorNameSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                    <Text style={styles.creditorOwed}>
                      owed {formatPKR(c.net)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Amount input */}
          <View style={styles.sectionCol}>
            <Text style={styles.sectionLabel}>Amount</Text>
            <View
              style={[
                styles.amountWrapper,
                isOverLimit && styles.amountWrapperError,
              ]}
            >
              <Text style={styles.amountPrefix}>PKR</Text>
              <TextInput
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={styles.amountInput}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleUseMax}
                style={styles.useMaxBtn}
              >
                <Text style={styles.useMaxText}>Use max</Text>
              </TouchableOpacity>
            </View>

            {isOverLimit && selectedCreditor && (
              <Text style={styles.limitError}>
                Max you can settle with {selectedCreditor.name}: {formatPKR(maxAllowed)}
              </Text>
            )}
          </View>

          {/* Submit button (Dark button per mockup 07) */}
          <PrimaryButton
            variant="dark"
            title="Record settlement"
            loading={isSubmitting}
            loadingText="Recording settlement…"
            disabled={enteredAmount <= 0}
            onPress={handleRecord}
            style={styles.submitBtn}
          />
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    gap: 18,
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoCol: {
    gap: 2,
  },
  infoLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  infoName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  oweHighlight: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.owe,
    fontVariant: ['tabular-nums'],
  },
  sectionCol: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  creditorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  creditorCard: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    gap: 2,
  },
  creditorCardUnselected: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  creditorCardSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  creditorName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  creditorNameSelected: {
    fontFamily: fonts.bold,
  },
  creditorOwed: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.owed,
    fontVariant: ['tabular-nums'],
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
    backgroundColor: colors.surface,
  },
  amountWrapperError: {
    borderColor: colors.owe,
  },
  amountPrefix: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textMuted,
  },
  amountInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  useMaxBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useMaxText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.accentText,
  },
  limitError: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.owe,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    marginTop: 8,
  },
  settledContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  settledIconBox: {
    marginBottom: 4,
  },
  settledTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
  },
  settledSub: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

