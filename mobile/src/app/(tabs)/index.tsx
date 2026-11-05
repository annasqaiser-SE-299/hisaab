import React, { useState, useCallback } from 'react';
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
import { ProgressBar } from '../../components/ProgressBar';
import { StatusTag } from '../../components/StatusTag';
import { MoneyText } from '../../components/MoneyText';
import { OfflineBanner } from '../../components/OfflineBanner';
import { SkeletonCard, SkeletonRow } from '../../components/Skeleton';
import { BudgetSheet } from '../../components/sheets/BudgetSheet';
import { SettleUpSheet } from '../../components/sheets/SettleUpSheet';
import { formatPKR } from '../../utils/money';
import { formatMonthFull } from '../../utils/dates';
import { Activity, BalancesResponse, Budget, Expense, Item } from '../../api/types';

const DEMO_MEMBERS = [
  { id: 'M01', name: 'Ali', username: 'ali', initials: 'AL' },
  { id: 'M02', name: 'Ayesha', username: 'ayesha', initials: 'AY' },
  { id: 'M03', name: 'Bilal', username: 'bilal', initials: 'BI' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { member, switchUser, logout } = useAuth();

  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const [settleSheetVisible, setSettleSheetVisible] = useState(false);

  // Fetch Dashboard Data
  const {
    data: dashboardData,
    loading,
    isRefreshing,
    error,
    refetch,
    setData,
  } = useApiQuery(
    async () => {
      const [budget, balancesRes, pendingItems, monthExpenses, activity] = await Promise.all([
        api.getBudget(),
        api.getBalances(),
        api.getShopping('pending'),
        api.getExpenses(),
        api.getActivity(3),
      ]);

      return {
        budget,
        balancesRes,
        pendingCount: pendingItems.length,
        expenseCount: monthExpenses.length,
        activity,
      };
    },
    { deps: [member?.id] }
  );

  const budget = dashboardData?.budget;
  const balances = dashboardData?.balancesRes?.balances || [];
  const pendingCount = dashboardData?.pendingCount ?? 0;
  const expenseCount = dashboardData?.expenseCount ?? 0;
  const recentActivity = dashboardData?.activity || [];

  const myBalance = balances.find((b) => b.member_id === member?.id);
  const myNet = myBalance ? myBalance.net : 0;

  // Build who is owed summary
  const creditors = balances.filter((b) => b.member_id !== member?.id && b.net > 0);
  const debtors = balances.filter((b) => b.member_id !== member?.id && b.net < 0);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.slice(0, 2).toUpperCase();
  };

  const handleMemberSwitch = async (username: string) => {
    if (member?.username.toLowerCase() === username.toLowerCase()) return;
    try {
      await switchUser(username);
      refetch();
    } catch (e) {
      console.warn('Switch failed', e);
    }
  };

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
        {/* Header with avatar, user, switch chips, and sign out */}
        <View style={styles.header}>
          <View style={styles.userBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(member?.name)}
              </Text>
            </View>
            <View style={styles.userText}>
              <Text style={styles.signedInLabel}>Signed in as</Text>
              <Text style={styles.userName}>{member?.name || 'Member'}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={logout}
            style={styles.signOutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Member Switcher Chips */}
        <View style={styles.switchBar}>
          <Text style={styles.switchLabel}>Switch user:</Text>
          <View style={styles.chipsRow}>
            {DEMO_MEMBERS.map((m) => {
              const isSelected = member?.username.toLowerCase() === m.username.toLowerCase();
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.7}
                  onPress={() => handleMemberSwitch(m.username)}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading && !dashboardData ? (
          <View style={styles.loadingContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonRow />
          </View>
        ) : (
          <>
            {/* Monthly Budget Card (mockup 02) */}
            {budget && (
              <View style={styles.budgetCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.budgetMonthLabel}>
                    {formatMonthFull(budget.month)} spending
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setBudgetSheetVisible(true)}
                    style={styles.pencilBtn}
                    accessibilityLabel="Edit monthly budget"
                  >
                    <Ionicons name="pencil" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.budgetAmountRow}>
                  <Text style={styles.spentAmount}>
                    {formatPKR(budget.spent)}
                  </Text>
                  <Text style={styles.budgetTotal}>
                    of {formatPKR(budget.budget)}
                  </Text>
                </View>

                <ProgressBar
                  percent={budget.percent_used}
                  status={budget.status}
                  height={12}
                />

                <View style={styles.budgetFooter}>
                  <StatusTag
                    label={`${budget.status} · ${budget.percent_used.toFixed(0)}%`}
                    variant={
                      budget.status === 'On Track'
                        ? 'onTrack'
                        : budget.status === 'Near Limit'
                        ? 'nearLimit'
                        : 'overBudget'
                    }
                  />
                  <Text style={styles.remainingBudget}>
                    {budget.remaining >= 0
                      ? `${formatPKR(budget.remaining)} left`
                      : `Over by ${formatPKR(Math.abs(budget.remaining))}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Balance Card (mockup 02) */}
            {myNet < 0 ? (
              // You owe (Red)
              <View style={styles.balanceCardOwe}>
                <Text style={styles.balanceLabelOwe}>Your balance</Text>
                <Text style={styles.balanceAmountOwe}>
                  You owe {formatPKR(Math.abs(myNet))}
                </Text>
                {creditors.length > 0 && (
                  <Text style={styles.balanceSubOwe}>
                    {creditors
                      .map((c) => `${c.name} is owed ${formatPKR(c.net)}`)
                      .join(' · ')}
                  </Text>
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSettleSheetVisible(true)}
                  style={styles.settleUpBtnOwe}
                >
                  <Text style={styles.settleUpBtnText}>Settle up</Text>
                </TouchableOpacity>
              </View>
            ) : myNet > 0 ? (
              // You are owed (Green)
              <View style={styles.balanceCardOwed}>
                <Text style={styles.balanceLabelOwed}>Your balance</Text>
                <Text style={styles.balanceAmountOwed}>
                  You are owed {formatPKR(myNet)}
                </Text>
                {debtors.length > 0 && (
                  <Text style={styles.balanceSubOwed}>
                    {debtors
                      .map((d) => `${d.name} owes ${formatPKR(Math.abs(d.net))}`)
                      .join(' · ')}
                  </Text>
                )}
              </View>
            ) : (
              // All settled up (Neutral)
              <View style={styles.balanceCardNeutral}>
                <Text style={styles.balanceLabelNeutral}>Your balance</Text>
                <Text style={styles.balanceAmountNeutral}>
                  You're all settled up
                </Text>
                <Text style={styles.balanceSubNeutral}>
                  All debts have been paid. Total household debt is 0.00.
                </Text>
              </View>
            )}

            {/* Counts grid: Pending items + Month expenses */}
            <View style={styles.tilesRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/shopping')}
                style={styles.tile}
              >
                <Ionicons name="cart-outline" size={24} color={colors.accent} />
                <Text style={styles.tileCount}>{pendingCount}</Text>
                <Text style={styles.tileLabel}>pending items</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/expenses')}
                style={styles.tile}
              >
                <Ionicons name="receipt-outline" size={24} color={colors.accent} />
                <Text style={styles.tileCount}>{expenseCount}</Text>
                <Text style={styles.tileLabel}>expenses this month</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={styles.activitySection}>
              <View style={styles.activitySectionHeader}>
                <Text style={styles.activityTitle}>Recent activity</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/activity')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>

              {recentActivity.length === 0 ? (
                <View style={styles.emptyActivityCard}>
                  <Text style={styles.emptyActivityText}>No recent activity</Text>
                </View>
              ) : (
                <View style={styles.activityListCard}>
                  {recentActivity.map((act, idx) => {
                    const isLast = idx === recentActivity.length - 1;
                    return (
                      <View
                        key={act.id}
                        style={[
                          styles.activityItem,
                          !isLast && styles.activityItemBorder,
                        ]}
                      >
                        <View style={styles.activityItemLeft}>
                          <Text style={styles.activityItemTitle}>{act.title}</Text>
                          <Text style={styles.activityItemSub}>
                            {act.type === 'settlement'
                              ? `${act.actor_name} paid ${act.counterparty_name}`
                              : `${act.payer_name || act.actor_name} paid · ${
                                  act.split_type === 'custom'
                                    ? 'custom split'
                                    : `split ${act.split_count || 3} ways`
                                }`}
                          </Text>
                        </View>
                        <MoneyText
                          amount={act.amount}
                          size={15}
                          weight="bold"
                          color={act.type === 'settlement' ? colors.owed : colors.text}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sheets */}
      {budget && (
        <BudgetSheet
          visible={budgetSheetVisible}
          onClose={() => setBudgetSheetVisible(false)}
          currentBudget={budget.budget}
          spent={budget.spent}
          month={budget.month}
          onSuccess={(newBudget) => {
            if (dashboardData) {
              setData({ ...dashboardData, budget: newBudget });
            }
          }}
        />
      )}

      {member && (
        <SettleUpSheet
          visible={settleSheetVisible}
          onClose={() => setSettleSheetVisible(false)}
          balances={balances}
          currentUserId={member.id}
          onSuccess={() => refetch()}
        />
      )}
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  userText: {
    gap: 2,
  },
  signedInLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  switchLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  chipUnselected: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    fontFamily: fonts.bold,
    color: colors.accentText,
  },
  loadingContainer: {
    gap: 16,
  },
  budgetCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetMonthLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  pencilBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  spentAmount: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    color: colors.text,
    letterSpacing: -0.02,
    fontVariant: ['tabular-nums'],
  },
  budgetTotal: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingBudget: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  balanceCardOwe: {
    backgroundColor: colors.oweSoft,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  balanceLabelOwe: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.oweText,
  },
  balanceAmountOwe: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.owe,
    fontVariant: ['tabular-nums'],
  },
  balanceSubOwe: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.oweDark,
  },
  settleUpBtnOwe: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.owe,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  settleUpBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  balanceCardOwed: {
    backgroundColor: colors.owedSoft,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  balanceLabelOwed: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.owedText,
  },
  balanceAmountOwed: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.owed,
    fontVariant: ['tabular-nums'],
  },
  balanceSubOwed: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.owedText,
  },
  balanceCardNeutral: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  balanceLabelNeutral: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  balanceAmountNeutral: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
  },
  balanceSubNeutral: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
  },
  tileCount: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  activitySection: {
    gap: 8,
  },
  activitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  seeAllText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.accent,
  },
  emptyActivityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  activityListCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  activityItemLeft: {
    gap: 2,
    flex: 1,
  },
  activityItemTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  activityItemSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});

