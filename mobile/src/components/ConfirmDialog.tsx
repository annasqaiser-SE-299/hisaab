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

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
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
                <Ionicons name="trash-outline" size={24} color={colors.owe} />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onCancel}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
                </TouchableOpacity>

                <PrimaryButton
                  variant="danger"
                  title={confirmLabel}
                  loading={loading}
                  loadingText="Deleting…"
                  onPress={onConfirm}
                  style={styles.confirmBtn}
                />
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
    backgroundColor: colors.oweSoft,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
  },
});
