import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, radius } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/endpoints';
import { request } from '../api/client';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSubmit } from '../hooks/useSubmit';
import { PrimaryButton } from '../components/PrimaryButton';
import { formatPKR, toPaisa, toRupees } from '../utils/money';

interface SimplifySuggestion {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

export default function SmartSettleScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [settledMap, setSettledMap] = useState<Record<string, boolean>>({});
  const [inFlightMap, setInFlightMap] = useState<Record<string, boolean>>({});

  const {
    data: suggestionsData,
    loading,
    refetch,
  } = useApiQuery(async () => {
    try {
      // Try server endpoint if implemented (Surprise Option 1)
      const res = await request<SimplifySuggestion[]>('/balances/simplify');
      return res;
    } catch {
      // Fallback: calculate client-side from computeBalances()
      const balRes = await api.getBalances();
      const debtors = balRes.balances
        .filter((b) => b.net < 0)
        .map((b) => ({ ...b, debtPaisa: toPaisa(Math.abs(b.net)) }));
      const creditors = balRes.balances
        .filter((b) => b.net > 0)
        .map((b) => ({ ...b, creditPaisa: toPaisa(b.net) }));

      const result: SimplifySuggestion[] = [];
      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtors.length && cIdx < creditors.length) {
        const d = debtors[dIdx];
        const c = creditors[cIdx];
        const transferPaisa = Math.min(d.debtPaisa, c.creditPaisa);

        if (transferPaisa > 0) {
          result.push({
            from_id: d.member_id,
            from_name: d.name,
            to_id: c.member_id,
            to_name: c.name,
            amount: toRupees(transferPaisa),
          });
        }

        d.debtPaisa -= transferPaisa;
        c.creditPaisa -= transferPaisa;

        if (d.debtPaisa === 0) dIdx++;
        if (c.creditPaisa === 0) cIdx++;
      }

      return result;
    }
  });

  const suggestions = suggestionsData || [];

  const { submit: recordSettle } = useSubmit(
    async (sug: SimplifySuggestion, idempotencyKey: string) => {
      const key = `${sug.from_id}-${sug.to_id}-${sug.amount}`;
      setInFlightMap((prev) => ({ ...prev, [key]: true }));

      try {
        const res = await api.settle(
          {
            sender_id: sug.from_id,
            recipient_id: sug.to_id,
            amount: sug.amount,
          },
          idempotencyKey
        );
        setSettledMap((prev) => ({ ...prev, [key]: true }));
        refetch();
        return res;
      } finally {
        setInFlightMap((prev) => ({ ...prev, [key]: false }));
      }
    },
    {
      successMessage: 'Settled successfully',
    }
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Back to expenses"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Settle</Text>
        </View>

        {/* Feature Hero Card (mockup 08) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSub}>Fewest payments to clear all debts</Text>
          <Text style={styles.heroTitle}>
            {suggestions ? `${suggestions.length} payments` : 'Calculating…'}
          </Text>
          <Text style={styles.heroDesc}>
            Largest debtor is matched with largest creditor until everyone is at PKR 0.00.
          </Text>
        </View>

        {/* Suggestion Cards */}
        <View style={styles.suggestionsList}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : suggestions.length === 0 ? (
            <View style={styles.noDebtsCard}>
              <Ionicons name="checkmark-circle" size={36} color={colors.owed} />
              <Text style={styles.noDebtsText}>No outstanding debts to settle</Text>
            </View>
          ) : (
            suggestions.map((sug) => {
              const key = `${sug.from_id}-${sug.to_id}-${sug.amount}`;
              const isSettled = settledMap[key];
              const isInFlight = inFlightMap[key];
              const isMe = sug.from_id === member?.id;

              return (
                <View
                  key={key}
                  style={[
                    styles.sugCard,
                    !isMe && styles.sugCardOther,
                  ]}
                >
                  <View style={styles.sugLeft}>
                    <View style={styles.sugMembersRow}>
                      <Text style={styles.memberName}>{sug.from_name}</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.memberName}>{sug.to_name}</Text>
                    </View>
                    <Text style={styles.sugAmount}>
                      {formatPKR(sug.amount)}
                    </Text>
                  </View>

                  {isSettled ? (
                    <View style={styles.settledBadge}>
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.accentText}
                      />
                      <Text style={styles.settledText}>Settled</Text>
                    </View>
                  ) : !isMe ? (
                    <Text style={styles.onlyNotice}>
                      Only {sug.from_name} can record this
                    </Text>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isInFlight}
                      onPress={() => recordSettle(sug)}
                      style={[
                        styles.settleBtn,
                        isInFlight && styles.settleBtnBusy,
                      ]}
                    >
                      {isInFlight ? (
                        <>
                          <ActivityIndicator size="small" color={colors.surface} />
                          <Text style={styles.settleBtnText}>Settling…</Text>
                        </>
                      ) : (
                        <Text style={styles.settleBtnText}>Settle now</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.footerNote}>
          Each One-Tap Settle uses the normal settle endpoint, so every validation rule still applies.
        </Text>

        <PrimaryButton
          variant="outline"
          title="Refresh suggestions"
          onPress={() => {
            setSettledMap({});
            refetch();
          }}
          style={styles.refreshBtn}
        />
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
  },
  heroCard: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    padding: 20,
    gap: 6,
  },
  heroSub: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: '#D5EFE9',
  },
  heroTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: colors.surface,
  },
  heroDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#E8F6F2',
  },
  suggestionsList: {
    gap: 12,
  },
  sugCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sugCardOther: {
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  sugLeft: {
    flex: 1,
    gap: 4,
  },
  sugMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  sugAmount: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  settledBadge: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settledText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.accentText,
  },
  onlyNotice: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    maxWidth: 96,
    textAlign: 'right',
    lineHeight: 16,
  },
  settleBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settleBtnBusy: {
    opacity: 0.75,
  },
  settleBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.surface,
  },
  footerNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  refreshBtn: {
    height: 54,
    borderRadius: 16,
    marginTop: 8,
  },
  noDebtsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noDebtsText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
});
