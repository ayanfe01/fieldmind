import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { getEmailValidationMessage, normalizeEmail } from '../../lib/emailValidation';
import { defaultRouteForRole } from '../../lib/routes';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';

const ADMIN_EMAIL = 'admin@fieldmind.app';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; email?: string }>();
  const nextRoute = typeof params.next === 'string' ? params.next : undefined;
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const login = useAppStore(s => s.login);
  const signInWithGoogle = useAppStore(s => s.signInWithGoogle);
  const requestPasswordReset = useAppStore(s => s.requestPasswordReset);
  const themedAlert = useThemedAlert();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    const nextEmail = normalizeEmail(overrideEmail || email);
    const nextPassword = overridePassword || password;

    if (!nextEmail || !nextPassword) {
      themedAlert.show({
        title: 'Missing fields',
        message: 'Please enter your email and password.',
        icon: 'form-textbox-password',
      });
      return;
    }

    const emailIssue = getEmailValidationMessage(nextEmail);
    if (emailIssue) {
      themedAlert.show({
        title: 'Check email address',
        message: emailIssue,
        icon: 'email-alert-outline',
      });
      return;
    }

    setLoading(true);
    const result = await login(nextEmail, nextPassword);
    setLoading(false);

    if (!result.success || !result.user) {
      themedAlert.show({
        title: 'Login failed',
        message: result.message || 'Email or password is incorrect.',
        icon: 'alert-circle-outline',
      });
      return;
    }

    router.replace((nextRoute || defaultRouteForRole(result.user.role)) as any);
  };

  const openSignupChooser = () => {
    themedAlert.show({
      title: 'Create account',
      message: 'Choose how you want to start. You can add the other mode later from your profile.',
      icon: 'account-plus-outline',
      actions: [
      {
        label: 'Hire a Pro',
        icon: 'home-search-outline',
        onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'customer' } }),
      },
      {
        label: 'Offer Services',
        icon: 'briefcase-outline',
        onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson' } }),
      },
      {
        label: 'Freelancer',
        icon: 'account-switch-outline',
        onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'freelancer' } }),
      },
      { label: 'Cancel', variant: 'ghost' },
      ],
    });
  };

  const useAdminLogin = () => {
    setEmail(ADMIN_EMAIL);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);

    if (!result.success || !result.user) {
      themedAlert.show({
        title: 'Google login failed',
        message: result.message || 'Unable to log in with Google.',
        icon: 'google',
      });
      return;
    }

    router.replace((nextRoute || defaultRouteForRole(result.user.role)) as any);
  };

  const handleForgotPassword = async () => {
    const targetEmail = normalizeEmail(email);
    if (!targetEmail) {
      themedAlert.show({
        title: 'Email required',
        message: 'Enter your email address first, then tap forgot password.',
        icon: 'email-alert-outline',
      });
      return;
    }

    const emailIssue = getEmailValidationMessage(targetEmail);
    if (emailIssue) {
      themedAlert.show({
        title: 'Check email address',
        message: emailIssue,
        icon: 'email-alert-outline',
      });
      return;
    }

    setResetLoading(true);
    const result = await requestPasswordReset(targetEmail);
    setResetLoading(false);

    if (!result.success) {
      themedAlert.show({
        title: 'Reset failed',
        message: result.message || 'Unable to send password reset email.',
        icon: 'alert-circle-outline',
      });
      return;
    }

    themedAlert.show({
      title: 'Check your email',
      message: 'We sent you a password reset link.',
      icon: 'email-check-outline',
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to FieldMind</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} disabled={resetLoading}>
            <Text style={styles.forgotPasswordText}>{resetLoading ? 'Sending reset...' : 'Forgot password?'}</Text>
          </TouchableOpacity>

          <Button title="Log In" onPress={() => handleLogin()} loading={loading} style={styles.loginBtn} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.85} disabled={googleLoading}>
            {googleLoading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={20} color={COLORS.text} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.adminBtn} onPress={useAdminLogin} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-account-outline" size={20} color={COLORS.primary} />
                <Text style={styles.adminBtnText}>Use Admin Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={openSignupChooser}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 140 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  form: { gap: SPACING.md },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
  forgotPassword: { alignSelf: 'flex-end' },
  forgotPasswordText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  loginBtn: { marginTop: SPACING.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  googleBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  adminBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '12',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  adminBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  signupLink: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});
