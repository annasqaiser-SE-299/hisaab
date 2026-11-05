import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { MoneyText } from './MoneyText';

export interface DuplicateDetails {
  id: number;
  title: string;
  amount: number;
  payer_name: string;
  created_by_name: string;
  created_at: string;
}

interface DuplicateDialogProps {
  visible: boolean;
  duplicate: DuplicateDetails | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const DuplicateDialog: React.FC<DuplicateDialogProps> = ({
  visible,
  duplicate,
  onCancel,
  onConfirm,
  loading = false,
}) => {
  if (!duplicate) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialog}>
              <View style={styles.iconContainer}>
                <Ionicons name="copy-outline" size={26} color={colors.warnText} />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>Looks like a duplicate</Text>
                <Text style={styles.description}>
                  {duplicate.created_by_name} already logged a similar expense recently. Saving again will count it twice.
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>{duplicate.title}</Text>
                  <Text style={styles.cardSub}>
                    {duplicate.payer_name} paid
                  </Text>
                </View>
                <MoneyText amount={duplicate.amount} size={15} weight="extraBold" />
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  variant="primary"
                  title="Don't save, view existing"
                  onPress={onCancel}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={loading}
                  onPress={onConfirm}
                  style={styles.saveAnywayBtn}
                >
                  <Text style={styles.saveAnywayText}>
                    {loading ? 'Saving…' : 'Save anyway'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 27, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    padding: 24,
    gap: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: 8,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.text,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#3E4D48',
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    gap: 2,
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  saveAnywayBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAnywayText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
});
