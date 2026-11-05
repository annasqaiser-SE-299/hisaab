import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.owed,
        backgroundColor: colors.owed,
        borderRadius: 14,
        height: 52,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: colors.surface,
      }}
      text2Style={{
        fontSize: 12,
        fontFamily: fonts.regular,
        color: colors.surface,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: colors.owe,
        backgroundColor: colors.owe,
        borderRadius: 14,
        height: 52,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: colors.surface,
      }}
      text2Style={{
        fontSize: 12,
        fontFamily: fonts.regular,
        color: colors.surface,
      }}
    />
  ),
};

function RootNavigator() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!token && !inAuthGroup) {
      router.replace('/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="expense/new"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="smart-settle"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
