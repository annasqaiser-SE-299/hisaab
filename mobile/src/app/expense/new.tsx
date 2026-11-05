import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/endpoints';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useSubmit } from '../../hooks/useSubmit';
import { Checkbox } from '../../components/Checkbox';
import { PrimaryButton } from '../../components/PrimaryButton';
import { DuplicateDialog, DuplicateDetails } from '../../components/DuplicateDialog';
import { formatPKR, parseAmount, toPaisa } from '../../utils/money';
import { OfflineBanner } from '../../components/OfflineBanner';
import { formatDate, toLocalISODate } from '../../utils/dates';
import { equalSplitPreview } from '../../utils/split';
import { Category, Member } from '../../api/types';

const CATEGORIES: Category[] = [
  'Groceries',
  'Utilities',
  'Cleaning',
  'Entertainment',
  'Other',
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const { member } = useAuth();

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Utilities');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [splitStrategy, setSplitStrategy] = useState<'equal' | 'custom'>('equal');

  // Equal Split Selection
  const [selectedEqualIds, setSelectedEqualIds] = useState<string[]>([]);

  // Custom Split Amounts Map
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Duplicate Warning State
  const [duplicateExpense, setDuplicateExpense] = useState<DuplicateDetails | null>(null);

  // Fetch Members
  const { data: membersData, error: membersError, refetch: refetchMembers } = useApiQuery(api.getMembers);
  const members = membersData || [];

  useEffect(() => {
    if (member?.id) {
      setPayerId(member.id);
    }
  }, [member?.id]);

  useEffect(() => {
    if (members && members.length > 0) {
      setSelectedEqualIds(members.map((m) => m.id));
      const initialCustom: Record<string, string> = {};
      members.forEach((m) => {
        initialCustom[m.id] = '';
      });
      setCustomAmounts(initialCustom);
    }
  }, [members]);

  // Amount Calculations
  const totalRupees = parseAmount(amountStr);
  const totalPaisa = toPaisa(totalRupees);

  // Equal Split Preview
  const { splits: equalSplits, remainderPaisa } = equalSplitPreview(
    totalRupees,
    selectedEqualIds
  );

  // Custom Split Calculations (strictly in paisa)
  const customAllocatedPaisa = Object.values(customAmounts).reduce((acc, curr) => {
    return acc + toPaisa(parseAmount(curr));
  }, 0);
  const remainingPaisa = totalPaisa - customAllocatedPaisa;
  const remainingRupees = remainingPaisa / 100;

  const isCustomValid = totalPaisa > 0 && remainingPaisa === 0;
  const isEqualValid = totalPaisa > 0 && selectedEqualIds.length > 0;
  const isFormValid =
    title.trim().length > 0 &&
    (splitStrategy === 'equal' ? isEqualValid : isCustomValid);

  // Date change handler
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Do not allow future dates per CLAUDE.md
      const now = new Date();
      if (selectedDate > now) {
        setDate(now);
      } else {
        setDate(selectedDate);
      }
    }
  };

  const formattedDateISO = toLocalISODate(date);

  // Submit via useSubmit
  const { submit: submitExpense, isSubmitting } = useSubmit(
    async (
      payload: {
        title: string;
        category: Category;
        amount: number;
        payer_id: string;
        date: string;
        split_type: 'equal' | 'custom';
        splits: Array<{ member_id: string; amount?: number }>;
        confirm_duplicate?: boolean;
      },
      idempotencyKey: string
    ) => {
      return await api.createExpense(payload, idempotencyKey);
    },
    {
      successMessage: 'Expense saved successfully',
      showErrorToast: false, // Handle duplicate custom dialog & error manually
      onSuccess: () => {
        router.back();
      },
      onError: (err) => {
        if (err.status === 409 && err.code === 'DUPLICATE_SUSPECTED' && err.details?.duplicate) {
          setDuplicateExpense(err.details.duplicate);
        } else {
          // Show error toast for other validation errors
          Toast.show({
            type: 'error',
            text1: err.message,
            position: 'top',
            visibilityTime: 4000,
          });
        }
      },
    }
  );

  const buildPayload = (confirmDuplicate = false) => {
    let splits: Array<{ member_id: string; amount?: number }> = [];

    if (splitStrategy === 'equal') {
      splits = selectedEqualIds.map((id) => ({ member_id: id }));
    } else {
      splits = Object.entries(customAmounts)
        .map(([mId, amtStr]) => ({
          member_id: mId,
          amount: parseAmount(amtStr),
        }))
        .filter((s) => s.amount > 0);
    }

    return {
      title: title.trim(),
      category,
      amount: totalRupees,
      payer_id: payerId || member?.id || 'M01',
      date: formattedDateISO,
      split_type: splitStrategy,
      splits,
      confirm_duplicate: confirmDuplicate,
    };
  };

  const handleSave = () => {
    if (!isFormValid || isSubmitting) return;
    submitExpense(buildPayload(false));
  };

  const handleSaveAnyway = () => {
    setDuplicateExpense(null);
    submitExpense(buildPayload(true));
  };

  const toggleEqualMember = (id: string) => {
    setSelectedEqualIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const getRemainderText = () => {
    if (remainderPaisa <= 0 || !equalSplits.length) return null;
    const luckyNames = equalSplits
      .filter((s) => s.hasExtraPaisa)
      .map((s) => members.find((m) => m.id === s.member_id)?.name || s.member_id);

    if (luckyNames.length === 1) {
      return `1 leftover paisa goes to ${luckyNames[0]}. Shares add up to exactly ${formatPKR(totalRupees)}.`;
    }
    return `Leftover paisa go to ${luckyNames.join(', then ')}. Shares add up to exactly ${formatPKR(totalRupees)}.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {membersError && <OfflineBanner onRetry={refetchMembers} />}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar with back button and Title */}
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
          <Text style={styles.headerTitle}>New expense</Text>
        </View>

        {/* Title Input */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Internet Bill"
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    isSelected
                      ? styles.categoryChipSelected
                      : styles.categoryChipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date and Amount Grid */}
        <View style={styles.twoColRow}>
          {/* Date Picker Button */}
          <View style={styles.fieldColHalf}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(true)}
              style={styles.dateBtn}
            >
              <Text style={styles.dateText}>{formatDate(formattedDateISO)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.fieldColHalf}>
            <Text style={styles.fieldLabel}>Amount (PKR)</Text>
            <TextInput
              value={amountStr}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9.]/g, '');
                const parts = clean.split('.');
                if (parts.length > 2) return;
                if (parts[1] && parts[1].length > 2) return;
                setAmountStr(clean);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, styles.amountInput]}
            />
          </View>
        </View>

        {/* Paid by Chips */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Paid by</Text>
          <View style={styles.threeColRow}>
            {members.map((m) => {
              const isSelected = m.id === payerId;
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
                      styles.payerText,
                      isSelected && styles.payerTextSelected,
                    ]}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Split Strategy: Equal vs Custom */}
        <View style={styles.fieldCol}>
          <Text style={styles.fieldLabel}>Split</Text>

          {/* Segmented Control */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSplitStrategy('equal')}
              style={[
                styles.segmentTab,
                splitStrategy === 'equal' && styles.segmentTabActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  splitStrategy === 'equal' && styles.segmentTextActive,
                ]}
              >
                Equal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSplitStrategy('custom')}
              style={[
                styles.segmentTab,
                splitStrategy === 'custom' && styles.segmentTabActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  splitStrategy === 'custom' && styles.segmentTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Equal Split UI (mockup 09) */}
          {splitStrategy === 'equal' ? (
            <View style={styles.splitBox}>
              {members.map((m, idx) => {
                const isChecked = selectedEqualIds.includes(m.id);
                const splitItem = equalSplits.find((s) => s.member_id === m.id);
                const isLast = idx === members.length - 1;

                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.7}
                    onPress={() => toggleEqualMember(m.id)}
                    style={[styles.splitRow, !isLast && styles.splitRowBorder]}
                  >
                    <Checkbox
                      checked={isChecked}
                      onToggle={() => toggleEqualMember(m.id)}
                    />
                    <Text style={styles.splitName}>{m.name}</Text>
                    {isChecked && splitItem && totalRupees > 0 ? (
                      <Text style={styles.splitAmount}>
                        {splitItem.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* Custom Split UI (mockup 06) */
            <View style={styles.customBox}>
              <View style={styles.splitBox}>
                {members.map((m, idx) => {
                  const isLast = idx === members.length - 1;
                  return (
                    <View
                      key={m.id}
                      style={[styles.customRow, !isLast && styles.splitRowBorder]}
                    >
                      <Text style={styles.splitName}>{m.name}</Text>
                      <TextInput
                        value={customAmounts[m.id] || ''}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9.]/g, '');
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [m.id]: clean,
                          }));
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        style={styles.customAmountInput}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Remaining to allocate bar */}
              <View style={styles.remainingBar}>
                <Text style={styles.remainingLabel}>
                  {remainingPaisa >= 0
                    ? 'Remaining to allocate'
                    : 'Over-allocated by'}
                </Text>
                <Text style={styles.remainingValue}>
                  {formatPKR(Math.abs(remainingRupees))}
                </Text>
              </View>
            </View>
          )}

          {splitStrategy === 'equal' && getRemainderText() ? (
            <Text style={styles.remainderNotice}>{getRemainderText()}</Text>
          ) : null}
        </View>

        {/* Save Button */}
        <PrimaryButton
          title={
            splitStrategy === 'custom' && remainingPaisa !== 0
              ? remainingPaisa > 0
                ? `Allocate ${formatPKR(remainingRupees)} more to save`
                : `Over-allocated by ${formatPKR(Math.abs(remainingRupees))}`
              : 'Save expense'
          }
          loading={isSubmitting}
          loadingText="Saving expense…"
          disabled={!isFormValid}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Duplicate Expense Warning Dialog (mockup 10) */}
      <DuplicateDialog
        visible={!!duplicateExpense}
        duplicate={duplicateExpense}
        onCancel={() => {
          setDuplicateExpense(null);
          router.back();
        }}
        onConfirm={handleSaveAnyway}
        loading={isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
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
  fieldCol: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  textInput: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  amountInput: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipUnselected: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  categoryText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  categoryTextSelected: {
    fontFamily: fonts.bold,
    color: colors.accentText,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldColHalf: {
    flex: 1,
    gap: 6,
  },
  dateBtn: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dateText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  payerText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  payerTextSelected: {
    fontFamily: fonts.bold,
    color: colors.accentText,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentTabActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  segmentTextActive: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  splitBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
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
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  customBox: {
    gap: 8,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  customAmountInput: {
    width: 120,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    textAlign: 'right',
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  remainingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warnSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  remainingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.warnText,
  },
  remainingValue: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: colors.warnText,
    fontVariant: ['tabular-nums'],
  },
  remainderNotice: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    marginTop: 12,
  },
});
