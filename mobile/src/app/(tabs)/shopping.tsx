import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius } from '../../theme';
import { api } from '../../api/endpoints';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useSubmit } from '../../hooks/useSubmit';
import { Stepper } from '../../components/Stepper';
import { Checkbox } from '../../components/Checkbox';
import { StatusTag } from '../../components/StatusTag';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CheckoutSheet } from '../../components/sheets/CheckoutSheet';
import { EmptyState } from '../../components/EmptyState';
import { OfflineBanner } from '../../components/OfflineBanner';
import { Item, Member, Unit } from '../../api/types';

const UNITS: Unit[] = ['pack', 'dozen', 'bottle', 'bag'];

export default function ShoppingScreen() {
  const { member } = useAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState<Unit>('pack');
  const [qty, setQty] = useState(1);

  // Selection for Checkout
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [checkoutSheetVisible, setCheckoutSheetVisible] = useState(false);

  // Delete Dialog State
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Queries
  const {
    data: shoppingData,
    loading,
    isRefreshing,
    error,
    refetch,
  } = useApiQuery(
    async () => {
      const [items, members] = await Promise.all([
        api.getShopping(),
        api.getMembers(),
      ]);
      return { items, members };
    },
    { deps: [member?.id] }
  );

  const items = shoppingData?.items || [];
  const members = shoppingData?.members || [];

  const pendingItems = items.filter((i) => i.status === 'pending');
  const boughtItems = items.filter((i) => i.status === 'bought');

  // Submit Add Item
  const { submit: submitAddItem, isSubmitting: isAdding } = useSubmit(
    async (data: { title: string; unit: Unit; requested_qty: number }) => {
      return await api.addShoppingItem(data);
    },
    {
      successMessage: 'Item added to shopping list',
      onSuccess: () => {
        setTitle('');
        setQty(1);
        refetch();
      },
    }
  );

  const handleAddItem = () => {
    if (!title.trim()) return;
    submitAddItem({
      title: title.trim(),
      unit,
      requested_qty: qty,
    });
  };

  // Submit Delete Item
  const { submit: submitDeleteItem, isSubmitting: isDeleting } = useSubmit(
    async (id: number) => {
      return await api.deleteShoppingItem(id);
    },
    {
      successMessage: 'Item deleted',
      onSuccess: () => {
        setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete?.id));
        setItemToDelete(null);
        refetch();
      },
    }
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedItems = pendingItems.filter((i) => selectedIds.includes(i.id));

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
        <Text style={styles.screenTitle}>Shopping list</Text>

        {/* Add item Card (mockup 03) */}
        <View style={styles.addCard}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Add item</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Milk"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
            />
          </View>

          {/* Unit Chips */}
          <View style={styles.unitRow}>
            {UNITS.map((u) => {
              const isSelected = unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  activeOpacity={0.7}
                  onPress={() => setUnit(u)}
                  style={[
                    styles.unitChip,
                    isSelected ? styles.unitChipSelected : styles.unitChipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitText,
                      isSelected && styles.unitTextSelected,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stepper + Add Button Row */}
          <View style={styles.addRow}>
            <Stepper value={qty} onChange={setQty} min={1} max={999} />
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isAdding || !title.trim()}
              onPress={handleAddItem}
              style={[
                styles.addBtn,
                (!title.trim() || isAdding) && styles.addBtnDisabled,
              ]}
            >
              <Ionicons name="add" size={20} color={colors.surface} />
              <Text style={styles.addBtnText}>
                {isAdding ? 'Adding…' : 'Add to list'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {!loading && pendingItems.length === 0 && boughtItems.length === 0 && (
          <EmptyState
            iconName="cart-outline"
            title="Nothing on the list"
            description="Add what the flat needs and tick it off after shopping."
          />
        )}

        {/* Pending Items List */}
        {pendingItems.length > 0 && (
          <View style={styles.sectionCol}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>
                Pending · {pendingItems.length}
              </Text>
              <Text style={styles.sectionSubtext}>Tick what you bought</Text>
            </View>

            <View style={styles.listCard}>
              {pendingItems.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id);
                const isCreator = item.created_by === member?.id;
                const isLast = idx === pendingItems.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                  >
                    <Checkbox
                      checked={isSelected}
                      onToggle={() => toggleSelect(item.id)}
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleSelect(item.id)}
                      style={styles.itemInfo}
                    >
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>
                        {item.requested_qty} {item.unit} · added by{' '}
                        {isCreator ? 'you' : item.created_by_name}
                      </Text>
                    </TouchableOpacity>

                    <StatusTag label="Pending" variant="pending" />

                    {isCreator ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setItemToDelete(item)}
                        style={styles.deleteIconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel={`Delete ${item.title}`}
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
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bought Items List */}
        {boughtItems.length > 0 && (
          <View style={styles.sectionCol}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>
                Bought · {boughtItems.length}
              </Text>
            </View>

            <View style={styles.listCard}>
              {boughtItems.map((item, idx) => {
                const isLast = idx === boughtItems.length - 1;
                return (
                  <View
                    key={item.id}
                    style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                  >
                    <View style={styles.boughtCheckPlaceholder}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitleBought}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>
                        {item.requested_qty} {item.unit} · added by{' '}
                        {item.created_by === member?.id ? 'you' : item.created_by_name}
                      </Text>
                    </View>
                    <StatusTag label="Bought" variant="bought" />
                    <View style={{ width: 36 }} />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Checkout Action Bar (when ≥ 1 item selected) */}
      {selectedItems.length > 0 && (
        <View style={styles.floatingBarContainer}>
          <View style={styles.floatingBar}>
            <View style={styles.floatingBarLeft}>
              <Text style={styles.floatingCount}>
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
              </Text>
              <Text style={styles.floatingSub}>Ready for checkout</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCheckoutSheetVisible(true)}
              style={styles.checkoutBtn}
            >
              <Text style={styles.checkoutBtnText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.surface} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Checkout Sheet */}
      {member && (
        <CheckoutSheet
          visible={checkoutSheetVisible}
          onClose={() => setCheckoutSheetVisible(false)}
          selectedItems={selectedItems}
          members={members}
          currentUserId={member.id}
          onSuccess={() => {
            setSelectedIds([]);
            refetch();
          }}
        />
      )}

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        visible={!!itemToDelete}
        title={`Delete “${itemToDelete?.title}”?`}
        description="This item will be removed from the pending shopping list."
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={() => {
          if (itemToDelete) submitDeleteItem(itemToDelete.id);
        }}
        onCancel={() => setItemToDelete(null)}
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
    paddingBottom: 120,
    gap: 16,
  },
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.02,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
  },
  inputCol: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  textInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipUnselected: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  unitChipSelected: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  unitText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  unitTextSelected: {
    fontFamily: fonts.bold,
    color: colors.accentText,
  },
  addRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  sectionCol: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  sectionSubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  itemTitleBought: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boughtCheckPlaceholder: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBarContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  floatingBar: {
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingBarLeft: {
    gap: 2,
  },
  floatingCount: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.surface,
  },
  floatingSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.borderStrong,
  },
  checkoutBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.surface,
  },
});

