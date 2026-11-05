import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius } from '../../theme';
import { api } from '../../api/endpoints';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useSubmit } from '../../hooks/useSubmit';
import { SettleUpSheet } from '../../components/sheets/SettleUpSheet';
import { ExpenseDetailSheet } from '../../components/sheets/ExpenseDetailSheet';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { OfflineBanner } from '../../components/OfflineBanner';
import { SkeletonCard, SkeletonRow } from '../../components/Skeleton';
import { formatPKR } from '../../utils/money';
import { currentMonthISO, formatMonthFull } from '../../utils/dates';
import { Expense } from '../../api/types';

export default function ExpensesScreen() {
  const router = useRouter();
  const { member } = useAuth();

  const [settleSheetVisible, setSettleSheetVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Queries
  const {
    data: expensesData,
    loading,
    isRefreshing,
    error,
    refetch,
  } = useApiQuery(
    async () => {
      const [balancesRes, expensesList] = await Promise.all([
        api.getBalances(),
        api.getExpenses(),
      ]);
      return { balances: balancesRes.balances, expenses: expensesList };
    },
    { deps: [member?.id] }
  );

  const balances = expensesData?.balances || [];
  const expenses = expensesData?.expenses || [];

  // Delete Expense Submit
  const { submit: submitDeleteExpense, isSubmitting: isDeleting } = useSubmit(
    async (id: number) => {
      return await api.deleteExpense(id);
    },
    {
      successMessage: 'Expense deleted',
      onSuccess: () => {
        setExpenseToDelete(null);
        setSelectedExpense(null);
        refetch();
      },
    }
  );

  const handleDeletePress = (exp: Expense) => {
    setExpenseToDelete(exp);
  };

  const currentMonthLabel = formatMonthFull(currentMonthISO());

  return (
    <SafeAreaView style={styles.safeArea}>
      {error && error.code === 'NETWORK_ERROR' && (
        <OfflineBanner onRetry={refetch} />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header with Title and Add Expense Button */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Expenses</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/expense/new')}
            style={styles.addExpenseBtn}
          >
            <Ionicons name="add" size={18} color={colors.surface} />
            <Text style={styles.addExpenseBtnText}>Add expense</Text>
          </TouchableOpacity>
        </View>

        {loading && !expensesData ? (
          <View style={{ gap: 16 }}>
            <SkeletonCard />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            {/* Balances Card with Table (mockup 05) */}
            <View style={styles.balancesCard}>
              <View style={styles.balancesHeader}>
                <Text style={styles.balancesHeading}>Balances</Text>
                <Text style={styles.balancesTotalTag}>Total PKR 0.00 ✓</Text>
              </View>

              {/* Table */}
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.thMember]}>Member</Text>
                  <Text style={[styles.th, styles.thNum]}>Paid</Text>
                  <Text style={[styles.th, styles.thNum]}>Share</Text>
                  <Text style={[styles.th, styles.thNum]}>Net</Text>
                </View>

                {balances.map((b) => {
                  const isMe = b.member_id === member?.id;
                  const isPositive = b.net > 0;
                  const isNegative = b.net < 0;

                  return (
                    <View
                      key={b.member_id}
                      style={[styles.tableRow, isMe && styles.tableRowMe]}
                    >
                      <Text
                        style={[
                          styles.tdMember,
                          isMe && styles.tdMemberMe,
                        ]}
                      >
                        {b.name}
                        {isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={[styles.td, styles.tdNum]}>
                        {b.paid.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text style={[styles.td, styles.tdNum]}>
                        {b.share.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.tdNum,
                          styles.tdNet,
                          isPositive && styles.tdNetPositive,
                          isNegative && styles.tdNetNegative,
                        ]}
                      >
                        {isPositive
                          ? `+${b.net.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : b.net < 0
                          ? `−${Math.abs(b.net).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '0.00'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Actions row */}
              <View style={styles.balancesActionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSettleSheetVisible(true)}
                  style={styles.settleBtn}
                >
                  <Text style={styles.settleBtnText}>Settle up</Text>
                </TouchableOpacity>

                {/* Smart Settle (Surprise task Option 1 - ready) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/smart-settle' as any)}
                  style={styles.smartSettleBtn}
                >
                  <Ionicons name="sparkles" size={16} color={colors.accentText} />
                  <Text style={styles.smartSettleBtnText}>Smart Settle</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Expenses List */}
            <View style={styles.expensesSection}>
              <Text style={styles.monthHeading}>{currentMonthLabel}</Text>

              {expenses.length === 0 ? (
                <EmptyState
                  iconName="receipt-outline"
                  title="No expenses logged"
                  description="Add an expense or check out items from the shopping list."
                  actionLabel="Add expense"
                  onAction={() => router.push('/expense/new')}
                />
              ) : (
                <View style={styles.expensesCard}>
                  {expenses.map((exp, idx) => {
                    const isLast = idx === expenses.length - 1;
                    const isCreator = exp.created_by === member?.id;
                    const isPayer = exp.payer_id === member?.id;

                    const splitDesc =
                      exp.split_type === 'custom'
                        ? 'custom'
                        : `equal ${exp.splits?.length || 3}`;

                    return (
                      <TouchableOpacity
                        key={exp.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedExpense(exp)}
                        style={[
                          styles.expenseRow,
                          !isLast && styles.expenseRowBorder,
                        ]}
                      >
                        <View style={styles.expenseInfo}>
                          <Text style={styles.expenseTitle}>{exp.title}</Text>
                          <Text style={styles.expenseSub}>
                            {exp.category} · {isPayer ? 'you' : exp.payer_name} paid · {splitDesc}
                          </Text>
                        </View>

                        <Text style={styles.expenseAmount}>
                          {exp.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>

                        {isCreator ? (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeletePress(exp);
                            }}
                            style={styles.deleteExpenseBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel={`Delete ${exp.title}`}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: 36 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Settle Up Sheet */}
      {member && (
        <SettleUpSheet
          visible={settleSheetVisible}
          onClose={() => setSettleSheetVisible(false)}
          balances={balances}
          currentUserId={member.id}
          onSuccess={() => refetch()}
        />
      )}

      {/* Expense Detail Sheet */}
      {member && (
        <ExpenseDetailSheet
          visible={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          currentUserId={member.id}
          onDeleteRequest={(exp) => {
            setSelectedExpense(null);
            setExpenseToDelete(exp);
          }}
        />
      )}

      {/* Confirm Delete Expense Dialog */}
      <ConfirmDialog
        visible={!!expenseToDelete}
        title={`Delete “${expenseToDelete?.title}”?`}
        description={
          expenseToDelete?.source === 'checkout'
            ? `${formatPKR(
                expenseToDelete?.amount
              )} will be removed from everyone's balances and this month's spending. Items bought will go back to Pending.`
            : `${formatPKR(
                expenseToDelete?.amount
              )} will be removed from everyone's balances and this month's spending.`
        }
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={() => {
          if (expenseToDelete) submitDeleteExpense(expenseToDelete.id);
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.02,
  },
  addExpenseBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExpenseBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  balancesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
  },
  balancesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balancesHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  balancesTotalTag: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  table: {
    width: '100%',
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  th: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  thMember: {
    flex: 2,
    textAlign: 'left',
  },
  thNum: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tableRowMe: {
    backgroundColor: '#F7FAF9',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  td: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tdMember: {
    flex: 2,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'left',
  },
  tdMemberMe: {
    fontFamily: fonts.bold,
  },
  tdNum: {
    flex: 1.5,
    textAlign: 'right',
  },
  tdNet: {
    fontFamily: fonts.extraBold,
  },
  tdNetPositive: {
    color: colors.owed,
  },
  tdNetNegative: {
    color: colors.owe,
  },
  balancesActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  settleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  smartSettleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smartSettleBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.accentText,
  },
  expensesSection: {
    gap: 8,
  },
  monthHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  expensesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  expenseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  expenseInfo: {
    flex: 1,
    gap: 2,
  },
  expenseTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  expenseSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  expenseAmount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  deleteExpenseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
