import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { colors, fonts, radius } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { Checkbox } from '../Checkbox';
import { formatPKR, parseAmount } from '../../utils/money';
import { equalSplitPreview } from '../../utils/split';
import { api } from '../../api/endpoints';
import { useSubmit } from '../../hooks/useSubmit';
import { Item, Member } from '../../api/types';

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedItems: Item[];
  members: Member[];
  currentUserId: string;
  onSuccess?: () => void;
}

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  visible,
  onClose,
  selectedItems,
  members,
  currentUserId,
  onSuccess,
}) => {
  const [totalPaidStr, setTotalPaidStr] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setPayerId(currentUserId);
      setSplitMemberIds(members.map((m) => m.id));
      setTotalPaidStr('');
    }
  }, [visible, members, currentUserId]);

  const totalPaid = parseAmount(totalPaidStr);
  const { splits, remainderPaisa } = equalSplitPreview(totalPaid, splitMemberIds);

  const toggleMember = (id: string) => {
    setSplitMemberIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one member
        return prev.filter((m) => m !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const { submit, isSubmitting } = useSubmit(
    async (
      data: {
        item_ids: number[];
        total_paid: number;
        payer_id: string;
        split_members: string[];
      },
      idempotencyKey: string
    ) => {
      const res = await api.checkout(data, idempotencyKey);
      return res;
    },
    {
      successMessage: 'Checkout completed successfully',
      onSuccess: () => {
        if (onSuccess) onSuccess();
        onClose();
      },
    }
  );

  const handleCheckout = () => {
    if (totalPaid <= 0 || !splitMemberIds.length || !selectedItems.length) return;
    submit({
      item_ids: selectedItems.map((i) => i.id),
      total_paid: totalPaid,
      payer_id: payerId,
      split_members: splitMemberIds,
    });
  };

  // Generate remainder explanation text
  const getRemainderText = () => {
    if (remainderPaisa <= 0 || !splits.length) return null;
    const luckyNames = splits
      .filter((s) => s.hasExtraPaisa)
      .map((s) => members.find((m) => m.id === s.member_id)?.name || s.member_id);

    if (luckyNames.length === 1) {
      return `Leftover 1 paisa goes to ${luckyNames[0]}, so shares add up to exactly ${formatPKR(totalPaid)}.`;
    }
    return `Leftover paisa go to ${luckyNames.join(', then ')}, so shares add up to exactly ${formatPKR(totalPaid)}.`;
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Checkout">
      <View style={styles.container}>
        {/* Selected Items Chips */}
        <View style={styles.chipsRow}>
          {selectedItems.map((item) => (
            <View key={item.id} style={styles.itemChip}>
              <Text style={styles.itemChipText}>
                {item.title} · {item.requested_qty} {item.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Total paid input */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Total paid (from receipt)</Text>
          <View style={styles.amountInputWrapper}>
            <Text style={styles.amountPrefix}>PKR</Text>
            <TextInput
              value={totalPaidStr}
              onChangeText={setTotalPaidStr}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={styles.amountInput}
            />
          </View>
        </View>

        {/* Paid by */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Paid by</Text>
          <View style={styles.payerRow}>
            {members.map((m) => {
              const isSelected = m.id === payerId;
              const isMe = m.id === currentUserId;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.8}
                  onPress={() => setPayerId(m.id)}
                  style={[
                    styles.payerBtn,
                    isSelected ? styles.payerBtnSelected : styles.payerBtnUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.payerBtnText,
                      isSelected && styles.payerBtnTextSelected,
                    ]}
                  >
                    {m.name}
                    {isMe ? ' (you)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split equally between */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Split equally between</Text>
          <View style={styles.splitBox}>
            {members.map((m, idx) => {
              const isChecked = splitMemberIds.includes(m.id);
              const splitItem = splits.find((s) => s.member_id === m.id);
              const isLast = idx === members.length - 1;

              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.7}
                  onPress={() => toggleMember(m.id)}
                  style={[styles.splitRow, !isLast && styles.splitRowBorder]}
                >
                  <Checkbox
                    checked={isChecked}
                    onToggle={() => toggleMember(m.id)}
                  />
                  <Text style={styles.splitName}>{m.name}</Text>
                  {isChecked && splitItem ? (
                    <Text style={styles.splitAmount}>
                      {formatPKR(splitItem.amount)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {getRemainderText() ? (
            <Text style={styles.remainderText}>{getRemainderText()}</Text>
          ) : null}
        </View>

        {/* Confirm checkout button */}
        <PrimaryButton
          title={
            totalPaid > 0
              ? `Confirm checkout · ${formatPKR(totalPaid)}`
              : 'Confirm checkout'
          }
          loading={isSubmitting}
          loadingText="Checking out…"
          disabled={totalPaid <= 0 || !splitMemberIds.length}
          onPress={handleCheckout}
          style={styles.confirmBtn}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemChip: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  itemChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  fieldCol: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  amountInputWrapper: {
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
  payerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  payerBtnUnselected: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  payerBtnSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  payerBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  payerBtnTextSelected: {
    fontFamily: fonts.bold,
    color: colors.accentText,
  },
  splitBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  splitName: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  splitAmount: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  remainderText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 16,
    marginTop: 8,
  },
});
