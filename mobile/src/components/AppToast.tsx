import React from 'react';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { colors, fonts } from '../theme';

const contentContainerStyle = { paddingHorizontal: 16 };
const text1Style = { fontSize: 14, fontFamily: fonts.semiBold, color: colors.surface };
const text2Style = { fontSize: 12, fontFamily: fonts.regular, color: colors.surface };

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.owed,
        backgroundColor: colors.owed,
        borderRadius: 14,
        height: 56,
      }}
      contentContainerStyle={contentContainerStyle}
      text1Style={text1Style}
      text2Style={text2Style}
      text1NumberOfLines={2}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: colors.owe,
        backgroundColor: colors.owe,
        borderRadius: 14,
        height: 56,
      }}
      contentContainerStyle={contentContainerStyle}
      text1Style={text1Style}
      text2Style={text2Style}
      text1NumberOfLines={2}
    />
  ),
};

// A React Native Modal draws above the whole app, so a toast at the root would be hidden
// behind it. Sheets and dialogs render their own AppToast, and the newest one shows the toast.
export const AppToast: React.FC = () => <Toast config={toastConfig} />;
