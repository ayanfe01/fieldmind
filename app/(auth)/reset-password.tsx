import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { PASSWORD_RULES, passwordRequirementsMessage } from '../../lib/passwordSecurity';
import { supabase } from '../../lib/supabase';

const parseRecoveryUrl = async (url: string) => {
  const parsedUrl = new URL(url.replace('#', '?'));
  const code = parsedUrl.searchParams.get('code');
  const accessToken = parsedUrl.searchParams.get('access_token');
  const refreshToken = parsedUrl.searchParams.get('refresh_token');
  const errorDescription = parsedUrl.searchParams.get('error_description');
  const error = parsedUrl.searchParams.get('error');

  if (errorDescription || error) {
    throw new Error(errorDescription || error || 'Password reset link failed.');
  }

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
    return;
  }

  if (accessToken && refreshToken) {
    const result = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (result.error) throw result.error;
  }
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const themedAlert = useThemedAlert();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const passwordIssues = passwordRequirementsMessage(password);

  useEffect(() => {
    let mounted = true;

    const prepareSession = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await parseRecoveryUrl(initialUrl);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'This reset link could not be opened.';
        themedAlert.show({
          title: 'Invalid reset link',
          message,
          icon: 'link-variant-off',
        });
      } finally {
        if (mounted) setInitializing(false);
      }
    };

    void prepareSession();
    return () => {
      mounted = false;
    };
  }, []);

  const savePassword = async () => {
    if (passwordIssues) {
      themedAlert.show({
        title: 'Weak password',
        message: passwordIssues,
        icon: 'lock-alert-outline',
      });
      return;
    }
    if (password !== confirmPassword) {
      themedAlert.show({
        title: 'Passwords do not match',
        message: 'Enter the same password twice.',
        icon: 'lock-check-outline',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      themedAlert.show({
        title: 'Reset failed',
        message: error.message,
        icon: 'alert-circle-outline',
      });
      return;
    }

    themedAlert.show({
      title: 'Password updated',
      message: 'You can now log in with your new password.',
      icon: 'check-circle-outline',
      actions: [
        { label: 'Log in', icon: 'login', onPress: () => router.replace('/(auth)/login') },
      ],
    });
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.centerText}>Opening reset link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Choose a new password for your FieldMind account.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="8+ chars, number, symbol"
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

          <View style={styles.passwordChecklist}>
            {PASSWORD_RULES.map(rule => {
              const passed = rule.test(password);
              return (
                <View key={rule.id} style={styles.passwordRule}>
                  <MaterialCommunityIcons
                    name={passed ? 'check-circle-outline' : 'circle-outline'}
                    size={15}
                    color={passed ? COLORS.success : COLORS.textMuted}
                  />
                  <Text style={[styles.passwordRuleText, passed && styles.passwordRuleTextPassed]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          <Button title="Update Password" onPress={savePassword} loading={loading} style={styles.submitBtn} />
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
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 140 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 21 },
  form: { gap: SPACING.md },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: { flex: 1, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
  passwordChecklist: {
    gap: 7,
    marginTop: -SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  passwordRuleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  passwordRuleTextPassed: {
    color: COLORS.success,
  },
  submitBtn: { marginTop: SPACING.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  centerText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
});
