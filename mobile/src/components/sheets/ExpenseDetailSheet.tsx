import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../BottomSheet';
import { colors, fonts, radius } from '../../theme';
import { StatusTag } from '../StatusTag';
import { MoneyText } from '../MoneyText';
import { formatDate } from '../../utils/dates';
import { formatPKR, toPaisa } from '../../utils/money';
import { Expense } from '../../api/types';

interface ExpenseDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  expense: Expense | null;
  currentUserId: string;
  onDeleteRequest: (expense: Expense) => void;
}

export const ExpenseDetailSheet: React.FC<ExpenseDetailSheetProps> = ({
  visible,
  onClose,
  expense,
  currentUserId,
  onDeleteRequest,
}) => {
  if (!expense) return null;

  const isCreator = expense.created_by === currentUserId;

  // Shows the rounding working, for example:
  // 65000 paisa ÷ 3 = 21666 each, 2 left over → +1 to Ali and Ayesha. Total PKR 650.00 ✓
  const getPaisaNote = () => {
    const totalLabel = `Total ${formatPKR(expense.amount)} ✓`;
    const totalPaisa = toPaisa(expense.amount);
    const count = expense.splits.length;
    const base = Math.floor(totalPaisa / count);
    const leftover = totalPaisa - base * count;
    if (expense.split_type !== 'equal' || leftover === 0) return totalLabel;
    const names = expense.splits.slice(0, leftover).map((s) => s.name).join(' and ');
    return `${totalPaisa} paisa ÷ ${count} = ${base} each, ${leftover} left over → +1 to ${names}. ${totalLabel}`;
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header Tags & Title */}
        <View style={styles.headerBlock}>
          <View style={styles.tagsRow}>
            <StatusTag
              label={expense.category}
              variant={expense.category === 'Groceries' ? 'bought' : 'neutral'}
            />
            {expense.source === 'checkout' && (
              <StatusTag label="Checkout" variant="neutral" />
            )}
          </View>
          <Text style={styles.title}>{expense.title}</Text>
        </View>

        {/* Amount & Metadata */}
        <View style={styles.amountBlock}>
          <MoneyText amount={expense.amount} size={34} weight="extraBold" />
          <Text style={styles.metaText}>
            Paid by {expense.payer_name} · {formatDate(expense.date)} · logged by{' '}
            {expense.created_by_name}
          </Text>
        </View>

        {/* Bought Items (if checkout) */}
        {expense.source === 'checkout' && expense.items && expense.items.length > 0 && (
          <View style={styles.sectionCol}>
            <Text style={styles.sectionHeader}>Items bought</Text>
            <View style={styles.chipsRow}>
              {expense.items.map((it) => (
                <View key={it.id} style={styles.itemChip}>
                  <Text style={styles.itemChipText}>
                    {it.title} · {it.requested_qty} {it.unit}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Who owes what */}
        <View style={styles.sectionCol}>
          <Text style={styles.sectionHeader}>
            Who owes what · {expense.split_type === 'equal' ? 'equal split' : 'custom split'}
          </Text>
          <View style={styles.splitsTable}>
            {expense.splits.map((split, idx) => {
              const isLast = idx === expense.splits.length - 1;
              const isPayer = split.member_id === expense.payer_id;
              return (
                <View
                  key={split.member_id}
                  style={[styles.splitRow, !isLast && styles.splitRowBorder]}
                >
                  <Text style={styles.splitMemberName}>
                    {split.name}
                    {isPayer ? ' (payer)' : ''}
                  </Text>
                  <Text style={styles.splitMemberAmount}>
                    {formatPKR(split.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.paisaNote}>
            {getPaisaNote()}
          </Text>
        </View>

        {/* Delete Expense button (Creator only per CLAUDE.md) */}
        {isCreator && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onDeleteRequest(expense)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.owe} />
            <Text style={styles.deleteBtnText}>Delete expense</Text>
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  headerBlock: {
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
  },
  amountBlock: {
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionCol: {
    gap: 8,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textMuted,
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
  splitsTable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  splitMemberName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  splitMemberAmount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  paisaNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8B4B8',
    backgroundColor: colors.surface,
    gap: 8,
    marginTop: 8,
  },
  deleteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.owe,
  },
});

