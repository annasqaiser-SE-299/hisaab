import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../../theme';
import { api } from '../../api/endpoints';
import { useApiQuery } from '../../hooks/useApiQuery';
import { EmptyState } from '../../components/EmptyState';
import { OfflineBanner } from '../../components/OfflineBanner';
import { SkeletonRow } from '../../components/Skeleton';
import { formatTime, getRelativeDayLabel } from '../../utils/dates';
import { Activity } from '../../api/types';

interface GroupedActivity {
  dayLabel: string;
  items: Activity[];
}

export default function ActivityScreen() {
  const {
    data: activities = [],
    loading,
    isRefreshing,
    error,
    refetch,
  } = useApiQuery(() => api.getActivity(50));

  // Group activities by date
  const grouped: GroupedActivity[] = [];
  if (activities && activities.length > 0) {
    activities.forEach((item) => {
      const dayLabel = getRelativeDayLabel(item.created_at);
      const existing = grouped.find((g) => g.dayLabel === dayLabel);
      if (existing) {
        existing.items.push(item);
      } else {
        grouped.push({ dayLabel, items: [item] });
      }
    });
  }

  const renderActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'settlement':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.owedSoft }]}>
            <Ionicons name="arrow-forward" size={18} color={colors.owed} />
          </View>
        );
      case 'checkout':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="cart-outline" size={18} color={colors.accent} />
          </View>
        );
      case 'expense':
      default:
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.divider }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.textMuted} />
          </View>
        );
    }
  };

  const getActivityTitle = (act: Activity) => {
    if (act.type === 'settlement') {
      return `${act.actor_name} paid ${act.counterparty_name}`;
    }
    if (act.type === 'checkout') {
      const itemsClean = act.title.startsWith('Shopping: ')
        ? act.title.slice(10)
        : act.title;
      return `${act.actor_name} checked out ${itemsClean}`;
    }
    return `${act.actor_name} added ${act.title}`;
  };

  const getActivitySubtitle = (act: Activity) => {
    const time = formatTime(act.created_at);
    if (act.type === 'settlement') {
      return `Settlement · ${time}`;
    }
    const splitText =
      act.split_type === 'custom'
        ? 'custom split'
        : `split ${act.split_count || 3} ways`;
    return `${act.category || 'Expense'} · ${splitText} · ${time}`;
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
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Activity</Text>
          <Text style={styles.screenSubtitle}>
            Every bill, checkout and payment in one timeline.
          </Text>
        </View>

        {loading && (!activities || activities.length === 0) ? (
          <View style={{ gap: 12 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : activities && activities.length === 0 ? (
          <EmptyState
            iconName="time-outline"
            title="No activity yet"
            description="When someone adds an expense, buys items or settles a debt, it will appear here."
          />
        ) : (
          grouped.map((group) => (
            <View key={group.dayLabel} style={styles.groupSection}>
              <Text style={styles.groupHeader}>{group.dayLabel.toUpperCase()}</Text>
              <View style={styles.groupCard}>
                {group.items.map((act, idx) => {
                  const isLast = idx === group.items.length - 1;
                  return (
                    <View
                      key={act.id}
                      style={[styles.activityRow, !isLast && styles.activityRowBorder]}
                    >
                      {renderActivityIcon(act.type)}
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitleText}>
                          {getActivityTitle(act)}
                        </Text>
                        <Text style={styles.activitySubtitleText}>
                          {getActivitySubtitle(act)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.activityAmount,
                          act.type === 'settlement' && styles.activityAmountGreen,
                        ]}
                      >
                        {act.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    gap: 20,
  },
  header: {
    gap: 4,
  },
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.02,
  },
  screenSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  groupSection: {
    gap: 8,
  },
  groupHeader: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.06,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityTitleText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  activitySubtitleText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  activityAmount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  activityAmountGreen: {
    color: colors.owed,
  },
});

