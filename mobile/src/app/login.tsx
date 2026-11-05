import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, radius } from '../theme';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('ayesha');
  const [password, setPassword] = useState('pass1234');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (user = username, pass = password) => {
    if (!user.trim()) {
      setErrorMsg('Please enter your username');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(user.trim().toLowerCase(), pass);
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setErrorMsg('Wrong username or password.');
      } else {
        setErrorMsg(err.message || 'Unable to sign in. Check server connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (demoUser: string) => {
    setUsername(demoUser);
    setPassword('pass1234');
    setErrorMsg(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand block */}
          <View style={styles.brandBlock}>
            <View style={styles.logoBox}>
              <Ionicons name="home" size={28} color={colors.surface} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>Hisaab</Text>
              <Text style={styles.brandSubtitle}>
                Shopping, bills and who-owes-whom for your flat, in one place.
              </Text>
            </View>
          </View>

          {/* Sign in Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>

            <TextField
              label="Username"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                setErrorMsg(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. ayesha"
            />

            <TextField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrorMsg(null);
              }}
              secureTextEntry
              placeholder="password"
            />

            <PrimaryButton
              title="Sign in"
              loading={loading}
              loadingText="Signing in…"
              onPress={() => handleLogin()}
              style={styles.signInBtn}
            />

            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.owe}
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>

          {/* Demo Accounts */}
          <View style={styles.demoBlock}>
            <Text style={styles.demoLabel}>Demo accounts</Text>
            <View style={styles.demoChips}>
              {['ali', 'ayesha', 'bilal'].map((demo) => (
                <TouchableOpacity
                  key={demo}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDemo(demo)}
                  style={[
                    styles.demoChip,
                    username.toLowerCase() === demo && styles.demoChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.demoChipText,
                      username.toLowerCase() === demo && styles.demoChipTextSelected,
                    ]}
                  >
                    {demo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
    gap: 28,
  },
  brandBlock: {
    gap: 16,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    gap: 8,
  },
  brandTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.02,
  },
  brandSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  signInBtn: {
    marginTop: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.oweSoft,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  errorIcon: {
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.oweText,
  },
  demoBlock: {
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 16,
  },
  demoLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  demoChips: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  demoChipSelected: {
    backgroundColor: colors.accent,
  },
  demoChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.accentText,
  },
  demoChipTextSelected: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },
});

