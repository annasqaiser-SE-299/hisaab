import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors, fonts } from '../theme';

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'danger' | 'dangerOutline' | 'accentSoft';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  loadingText,
  disabled,
  style,
  children,
  icon,
  ...props
}) => {
  const isInteractive = !disabled && !loading;

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'dark':
        return styles.btnDark;
      case 'outline':
        return styles.btnOutline;
      case 'danger':
        return styles.btnDanger;
      case 'dangerOutline':
        return styles.btnDangerOutline;
      case 'accentSoft':
        return styles.btnAccentSoft;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'outline':
        return styles.textOutline;
      case 'dangerOutline':
        return styles.textDangerOutline;
      case 'accentSoft':
        return styles.textAccentSoft;
      case 'primary':
      case 'dark':
      case 'danger':
      default:
        return styles.textWhite;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'md':
        return styles.sizeMd;
      case 'lg':
      default:
        return styles.sizeLg;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!isInteractive}
      style={[
        styles.base,
        getSizeStyle(),
        getContainerStyle(),
        (!isInteractive || disabled) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size="small"
            color={
              variant === 'outline' || variant === 'accentSoft' ? colors.accent : colors.surface
            }
            style={styles.spinner}
          />
          <Text style={[styles.textBase, getTextStyle()]}>
            {loadingText || 'Saving…'}
          </Text>
        </>
      ) : (
        <>
          {icon}
          {title ? (
            <Text style={[styles.textBase, getTextStyle()]}>{title}</Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 8,
  },
  sizeSm: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sizeMd: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  sizeLg: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnDark: {
    backgroundColor: colors.text,
  },
  btnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnDanger: {
    backgroundColor: colors.owe,
  },
  btnDangerOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.owe,
  },
  btnAccentSoft: {
    backgroundColor: colors.accentSoft,
  },
  textBase: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  textWhite: {
    color: colors.surface,
  },
  textOutline: {
    color: colors.text,
  },
  textDangerOutline: {
    color: colors.owe,
  },
  textAccentSoft: {
    color: colors.accentText,
  },
  disabled: {
    opacity: 0.6,
  },
  spinner: {
    marginRight: 6,
  },
});

