import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { getEmailValidationMessage, normalizeEmail } from '../../lib/emailValidation';
import { PASSWORD_RULES, passwordRequirementsMessage } from '../../lib/passwordSecurity';
import { defaultRouteForRole } from '../../lib/routes';
import { UserRole, TradeType, PropertyType, PricingMode } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';

const SERVICE_CATEGORIES: { value: TradeType; label: string; icon: string }[] = [
  { value: 'plumber', label: 'Plumber', icon: 'pipe' },
  { value: 'electrician', label: 'Electrician', icon: 'lightning-bolt' },
  { value: 'hvac', label: 'HVAC', icon: 'air-conditioner' },
  { value: 'carpenter', label: 'Carpenter', icon: 'hammer' },
  { value: 'painter', label: 'Painter', icon: 'format-paint' },
  { value: 'roofer', label: 'Roofer', icon: 'home-roof' },
  { value: 'landscaper', label: 'Landscaper', icon: 'tree' },
  { value: 'engineer', label: 'Engineer', icon: 'account-hard-hat' },
  { value: 'hairstylist', label: 'Hairstylist', icon: 'content-cut' },
  { value: 'tailor', label: 'Tailor', icon: 'tape-measure' },
  { value: 'cobbler', label: 'Cobbler', icon: 'shoe-formal' },
  { value: 'cleaner', label: 'Cleaner', icon: 'spray-bottle' },
  { value: 'mechanic', label: 'Mechanic', icon: 'car-wrench' },
  { value: 'makeup_artist', label: 'Makeup Artist', icon: 'face-woman-shimmer-outline' },
  { value: 'photographer', label: 'Photographer', icon: 'camera-outline' },
  { value: 'general', label: 'General Services', icon: 'briefcase-outline' },
];

const PRICING_MODES: { value: PricingMode; label: string; helper: string }[] = [
  { value: 'quote', label: 'Quote each request', helper: 'Set the price after seeing the client request.' },
  { value: 'hourly', label: 'Hourly', helper: 'Use a standard rate per hour.' },
  { value: 'fixed', label: 'Per session/job', helper: 'Use a starting fixed price for common jobs.' },
];

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: 'home-outline' },
  { value: 'apartment', label: 'Apartment', icon: 'office-building-outline' },
  { value: 'office', label: 'Office', icon: 'briefcase-outline' },
  { value: 'commercial', label: 'Commercial', icon: 'store-outline' },
  { value: 'rental', label: 'Rental Property', icon: 'key-outline' },
];

const isExistingAccountMessage = (message?: string) => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists');
};

// ─── Reusable Input ────────────────────────────────────────────────────────────
function FormInput({
  label, value, onChangeText, placeholder, icon, keyboardType, secureTextEntry,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; icon: string; keyboardType?: any; secureTextEntry?: boolean;
}) {
  return (
    <View style={inputStyles.field}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={inputStyles.row}>
        <MaterialCommunityIcons name={icon as any} size={20} color={COLORS.textMuted} />
        <TextInput
          style={inputStyles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value} onChangeText={onChangeText}
          keyboardType={keyboardType} secureTextEntry={secureTextEntry}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  field: { gap: 8, marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
});

// ─── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={progStyles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[progStyles.dot, i < current && progStyles.dotActive]} />
      ))}
    </View>
  );
}
const progStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: SPACING.xl },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary },
});

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role: UserRole | 'freelancer'; next?: string }>();
  const isFreelancer = params.role === 'freelancer';
  const role: UserRole = params.role === 'tradesperson' ? 'tradesperson' : 'customer';
  const nextRoute = typeof params.next === 'string' ? params.next : undefined;
  const registerUser = useAppStore(s => s.registerUser);
  const signInWithGoogle = useAppStore(s => s.signInWithGoogle);
  const addAccountRole = useAppStore(s => s.addAccountRole);
  const resendEmailConfirmation = useAppStore(s => s.resendEmailConfirmation);
  const themedAlert = useThemedAlert();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordHelpVisible, setPasswordHelpVisible] = useState(false);
  const [phone, setPhone] = useState('');

  // Tradesperson fields
  const [businessName, setBusinessName] = useState('');
  const [selectedTrades, setSelectedTrades] = useState<TradeType[]>([]);
  const [customTrade, setCustomTrade] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('quote');
  const [hourlyRate, setHourlyRate] = useState('');
  const [fixedRate, setFixedRate] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');

  // Customer fields
  const [propertyAddress, setPropertyAddress] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType | null>(null);

  const totalSteps = isFreelancer ? 2 : role === 'tradesperson' ? 4 : 3;
  const isTrade = role === 'tradesperson';
  const hasServiceProfile = isTrade || isFreelancer;
  const accountRoles: UserRole[] = isFreelancer ? ['customer', 'tradesperson'] : [role];
  const passwordIssues = passwordRequirementsMessage(password);
  const passwordsMatch = !!password && !!confirmPassword && password === confirmPassword;
  const passwordMeetsRequirements = !passwordIssues && passwordsMatch;
  const shouldShowPasswordHelp = passwordHelpVisible && !passwordMeetsRequirements;

  const handleNext = () => {
    // Validate current step
    if (step === 1 && (!name || !email || !password)) {
      themedAlert.show({ title: 'Required fields', message: 'Please fill in all fields to continue.', icon: 'form-textbox' }); return;
    }
    const emailIssue = step === 1 ? getEmailValidationMessage(email) : '';
    if (emailIssue) {
      themedAlert.show({ title: 'Check email address', message: emailIssue, icon: 'email-alert-outline' }); return;
    }
    if (step === 1 && passwordIssues) {
      themedAlert.show({ title: 'Weak password', message: passwordIssues, icon: 'lock-alert-outline' }); return;
    }
    if (step === 1 && password !== confirmPassword) {
      themedAlert.show({ title: 'Passwords do not match', message: 'Enter the same password twice before continuing.', icon: 'lock-check-outline' }); return;
    }
    if (step === 3 && isTrade && selectedTrades.length === 0 && !customTrade.trim()) {
      themedAlert.show({ title: 'Required', message: 'Select at least one service category or type what you do.', icon: 'briefcase-search-outline' }); return;
    }
    if (step === 3 && !isTrade && !isFreelancer && !selectedPropertyType) {
      themedAlert.show({ title: 'Required', message: 'Please select your property type.', icon: 'home-alert-outline' }); return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    const emailIssue = getEmailValidationMessage(normalizedEmail);
    if (emailIssue) {
      setLoading(false);
      themedAlert.show({ title: 'Check email address', message: emailIssue, icon: 'email-alert-outline' });
      return;
    }
    const submitPasswordIssues = passwordRequirementsMessage(password);
    if (submitPasswordIssues) {
      setLoading(false);
      themedAlert.show({ title: 'Weak password', message: submitPasswordIssues, icon: 'lock-alert-outline' });
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      themedAlert.show({ title: 'Passwords do not match', message: 'Enter the same password twice before creating your account.', icon: 'lock-check-outline' });
      return;
    }

    const result = await registerUser({
      id: Math.random().toString(36).substr(2, 9),
      role,
      roles: accountRoles,
      name, email: normalizedEmail, phone: phone.trim(),
      createdAt: new Date().toISOString(),
      ...(hasServiceProfile ? {
        businessName,
        trade: selectedTrades[0] || 'general',
        trades: selectedTrades.length ? selectedTrades : ['general'],
        customTrade: customTrade.trim() || undefined,
        pricingMode,
        hourlyRate: pricingMode === 'hourly' ? parseFloat(hourlyRate) || undefined : undefined,
        fixedRate: pricingMode === 'fixed' ? parseFloat(fixedRate) || undefined : undefined,
        yearsExperience: parseInt(yearsExp) || 1,
        serviceArea, licenseNumber, bio,
      } : isFreelancer ? {} : {
        propertyAddress,
        propertyType: selectedPropertyType || 'home',
      }),
    }, password);
    setLoading(false);
    if (!result.success) {
      const existingAccount = isExistingAccountMessage(result.message);
      const targetEmail = normalizedEmail;
      themedAlert.show({
        title: existingAccount ? 'Account already exists' : 'Could not create account',
        message: existingAccount
          ? `There is already an account linked to ${targetEmail}. Log in instead.`
          : result.message || 'Unable to create this account right now.',
        icon: existingAccount ? 'account-check-outline' : 'account-alert-outline',
        actions: existingAccount ? [
          {
            label: 'Log in',
            icon: 'login',
            onPress: () => router.replace({ pathname: '/(auth)/login', params: { email: targetEmail } }),
          },
          { label: 'Close', variant: 'ghost' },
        ] : undefined,
      });
      return;
    }
    if (result.requiresEmailConfirmation) {
      showConfirmEmailDialog(normalizedEmail, result.message);
      return;
    }
    router.replace((nextRoute || defaultRouteForRole(result.user?.role)) as any);
  };

  const showConfirmEmailDialog = (targetEmail: string, message?: string) => {
    themedAlert.show({
      title: 'Confirm your email',
      message: message || `We sent a confirmation link to ${targetEmail}. Check spam or junk if it is not in your inbox.`,
      icon: 'email-check-outline',
      dismissible: false,
      actions: [
        {
          label: 'Resend Email',
          icon: 'email-sync-outline',
          onPress: async () => {
            const result = await resendEmailConfirmation(targetEmail);
            themedAlert.show({
              title: result.success ? 'Email sent' : 'Email not sent',
              message: result.message || (result.success
                ? `We sent another confirmation link to ${targetEmail}.`
                : 'Unable to resend the confirmation email right now.'),
              icon: result.success ? 'email-fast-outline' : 'email-alert-outline',
              actions: [
                { label: 'Log in', icon: 'login', onPress: () => router.replace('/(auth)/login') },
                { label: 'Close', variant: 'ghost' },
              ],
            });
          },
        },
        { label: 'Log in', icon: 'login', onPress: () => router.replace('/(auth)/login') },
      ],
    });
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle(role);
    if (result.success && result.user && isFreelancer) {
      await addAccountRole('tradesperson');
    }
    setGoogleLoading(false);

    if (!result.success || !result.user) {
      themedAlert.show({
        title: 'Google signup failed',
        message: result.message || 'Unable to continue with Google.',
        icon: 'google',
      });
      return;
    }

    router.replace((nextRoute || defaultRouteForRole(result.user.role)) as any);
  };

  const toggleTrade = (trade: TradeType) => {
    setSelectedTrades(current => (
      current.includes(trade)
        ? current.filter(item => item !== trade)
        : [...current, trade]
    ));
  };

  const RoleTag = () => (
    <View style={[styles.roleTag, isTrade || isFreelancer ? styles.roleTagTrade : styles.roleTagCustomer]}>
      <MaterialCommunityIcons
        name={isFreelancer ? 'account-switch-outline' : isTrade ? 'briefcase-outline' : 'home-account'}
        size={13} color={isTrade || isFreelancer ? COLORS.primary : '#7EA7D8'}
      />
      <Text style={[styles.roleTagText, { color: isTrade || isFreelancer ? COLORS.primary : '#7EA7D8' }]}>
        {isFreelancer ? 'Freelancer' : isTrade ? 'Service Pro' : 'Customer'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <RoleTag />
        </View>

        <ProgressBar current={step} total={totalSteps} />

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Create your account</Text>
            <Text style={styles.stepSub}>Let's start with the basics</Text>
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup} activeOpacity={0.85} disabled={googleLoading}>
              {googleLoading ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color={COLORS.text} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or use email</Text>
              <View style={styles.divider} />
            </View>
            <FormInput label="Full name" value={name} onChangeText={setName} placeholder="John Smith" icon="account-outline" />
            <FormInput label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" icon="email-outline" keyboardType="email-address" />
            <View style={inputStyles.field}>
              <Text style={inputStyles.label}>Password</Text>
              <View style={inputStyles.row}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={inputStyles.input}
                  placeholder="8+ chars, number, symbol"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordHelpVisible(true)}
                  onBlur={() => setPasswordHelpVisible(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(value => !value)}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={inputStyles.field}>
              <Text style={inputStyles.label}>Confirm password</Text>
              <View style={inputStyles.row}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={inputStyles.input}
                  placeholder="Type password again"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordHelpVisible(true)}
                  onBlur={() => setPasswordHelpVisible(false)}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(value => !value)}>
                  <MaterialCommunityIcons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {shouldShowPasswordHelp && (
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
                <View style={styles.passwordRule}>
                  <MaterialCommunityIcons
                    name={passwordsMatch ? 'check-circle-outline' : 'circle-outline'}
                    size={15}
                    color={passwordsMatch ? COLORS.success : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.passwordRuleText,
                    passwordsMatch && styles.passwordRuleTextPassed,
                  ]}>
                    Passwords match
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── STEP 2: Contact + Business ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>{hasServiceProfile ? 'Your service profile' : 'Contact details'}</Text>
            <Text style={styles.stepSub}>
              {isFreelancer
                ? 'Add what you offer now, or keep it broad and refine it later.'
                : isTrade
                ? 'Tell customers what you offer and how you charge'
                : 'Add these now or complete them later.'}
            </Text>
            <FormInput label="Phone number (optional)" value={phone} onChangeText={setPhone} placeholder="Add later or enter now" icon="phone-outline" keyboardType="phone-pad" />
            {hasServiceProfile && (
              <>
                <FormInput label="Business or display name (optional)" value={businessName} onChangeText={setBusinessName} placeholder="Amina Hair Studio" icon="store-outline" />
                <FormInput label="Service area (optional)" value={serviceArea} onChangeText={setServiceArea} placeholder="e.g. New York, NY" icon="map-marker-outline" />
                <FormInput label="Years of experience (optional)" value={yearsExp} onChangeText={setYearsExp} placeholder="5" icon="clock-outline" keyboardType="numeric" />
              </>
            )}
            {isFreelancer && (
              <>
                <Text style={styles.sectionLabel}>Services you can offer</Text>
                <View style={styles.compactGrid}>
                  {SERVICE_CATEGORIES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.compactChip, selectedTrades.includes(t.value) && styles.compactChipActive]}
                      onPress={() => toggleTrade(t.value)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={t.icon as any}
                        size={16}
                        color={selectedTrades.includes(t.value) ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text style={[styles.compactChipText, selectedTrades.includes(t.value) && { color: COLORS.primary }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <FormInput
                  label="Something else you do (optional)"
                  value={customTrade}
                  onChangeText={setCustomTrade}
                  placeholder="e.g. Nail tech, event decorator, tutor"
                  icon="briefcase-edit-outline"
                />
                <Text style={styles.sectionLabel}>How do you usually charge?</Text>
                <View style={styles.pricingStack}>
                  {PRICING_MODES.map(mode => (
                    <TouchableOpacity
                      key={mode.value}
                      style={[styles.pricingCard, pricingMode === mode.value && styles.pricingCardActive]}
                      onPress={() => setPricingMode(mode.value)}
                      activeOpacity={0.84}
                    >
                      <View style={[styles.radio, pricingMode === mode.value && styles.radioActive]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingTitle}>{mode.label}</Text>
                        <Text style={styles.pricingHelper}>{mode.helper}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                {pricingMode === 'hourly' && (
                  <FormInput label="Hourly rate ($)" value={hourlyRate} onChangeText={setHourlyRate} placeholder="85" icon="cash-multiple" keyboardType="numeric" />
                )}
                {pricingMode === 'fixed' && (
                  <FormInput label="Starting price ($)" value={fixedRate} onChangeText={setFixedRate} placeholder="120" icon="cash-multiple" keyboardType="numeric" />
                )}
              </>
            )}
            {!isTrade && !isFreelancer && (
              <FormInput label="Property address (optional)" value={propertyAddress} onChangeText={setPropertyAddress} placeholder="123 Main St, City, State" icon="home-outline" />
            )}
          </View>
        )}

        {/* ── STEP 3: Trade / Property Type ── */}
        {step === 3 && isTrade && (
          <View>
            <Text style={styles.stepTitle}>Your service</Text>
            <Text style={styles.stepSub}>Pick every category that fits. You can also type your own.</Text>
            <View style={styles.grid}>
              {SERVICE_CATEGORIES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.gridCard, selectedTrades.includes(t.value) && styles.gridCardActive]}
                  onPress={() => toggleTrade(t.value)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={t.icon as any} size={26}
                    color={selectedTrades.includes(t.value) ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.gridLabel, selectedTrades.includes(t.value) && { color: COLORS.primary }]}>
                    {t.label}
                  </Text>
                  {selectedTrades.includes(t.value) && (
                    <MaterialCommunityIcons name="check-circle" size={17} color={COLORS.primary} style={styles.gridCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <FormInput
              label="What do you do? (optional)"
              value={customTrade}
              onChangeText={setCustomTrade}
              placeholder="e.g. Nail tech, event decorator, tutor"
              icon="briefcase-edit-outline"
            />
            <Text style={styles.sectionLabel}>How do you charge?</Text>
            <View style={styles.pricingStack}>
              {PRICING_MODES.map(mode => (
                <TouchableOpacity
                  key={mode.value}
                  style={[styles.pricingCard, pricingMode === mode.value && styles.pricingCardActive]}
                  onPress={() => setPricingMode(mode.value)}
                  activeOpacity={0.84}
                >
                  <View style={[styles.radio, pricingMode === mode.value && styles.radioActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pricingTitle}>{mode.label}</Text>
                    <Text style={styles.pricingHelper}>{mode.helper}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {pricingMode === 'hourly' && (
              <FormInput label="Hourly rate ($)" value={hourlyRate} onChangeText={setHourlyRate} placeholder="85" icon="cash-multiple" keyboardType="numeric" />
            )}
            {pricingMode === 'fixed' && (
              <FormInput label="Starting price ($)" value={fixedRate} onChangeText={setFixedRate} placeholder="120" icon="cash-multiple" keyboardType="numeric" />
            )}
          </View>
        )}

        {step === 3 && !isTrade && !isFreelancer && (
          <View>
            <Text style={styles.stepTitle}>Your property</Text>
            <Text style={styles.stepSub}>What type of property do you have?</Text>
            <View style={styles.grid}>
              {PROPERTY_TYPES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.gridCard, selectedPropertyType === p.value && styles.gridCardActive]}
                  onPress={() => setSelectedPropertyType(p.value)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={p.icon as any} size={26}
                    color={selectedPropertyType === p.value ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.gridLabel, selectedPropertyType === p.value && { color: COLORS.primary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 4: Tradesperson — Final details ── */}
        {step === 4 && isTrade && (
          <View>
            <Text style={styles.stepTitle}>Almost done!</Text>
            <Text style={styles.stepSub}>A few more details to build trust with customers</Text>
            <FormInput label="License number (optional)" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. LIC-123456" icon="shield-check-outline" />
            <View style={inputStyles.field}>
              <Text style={inputStyles.label}>About you (optional)</Text>
              <View style={[inputStyles.row, { alignItems: 'flex-start', paddingVertical: SPACING.sm }]}>
                <MaterialCommunityIcons name="text-account" size={20} color={COLORS.textMuted} style={{ marginTop: 4 }} />
                <TextInput
                  style={[inputStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="Tell customers about your experience and specialties..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline value={bio} onChangeText={setBio}
                />
              </View>
            </View>

            {/* Verification info */}
            <View style={styles.verifyBox}>
              <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Get Verified</Text>
                <Text style={styles.verifyDesc}>
                  Adding your license number earns you a verified badge and helps customers trust your profile.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step < totalSteps ? (
            <Button title="Continue" onPress={handleNext} style={{ flex: 1 }} />
          ) : (
            <Button
              title={isFreelancer ? 'Create Freelancer Account' : isTrade ? 'Create Service Pro Account' : 'Create Customer Account'}
              onPress={handleSubmit}
              loading={loading}
              style={{ flex: 1 }}
            />
          )}
        </View>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  roleTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  roleTagTrade: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '40' },
  roleTagCustomer: { backgroundColor: '#7EA7D8' + '15', borderColor: '#7EA7D8' + '40' },
  roleTagText: { fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginBottom: 6 },
  stepSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  googleBtn: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  googleBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  gridCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  gridCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0D' },
  gridCheck: { position: 'absolute', top: 8, right: 8 },
  gridLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  compactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  compactChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  compactChipText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  sectionLabel: { fontSize: 14, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.sm },
  pricingStack: { gap: SPACING.sm, marginBottom: SPACING.md },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricingCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  pricingTitle: { fontSize: 14, color: COLORS.text, fontWeight: '900', marginBottom: 3 },
  pricingHelper: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  passwordChecklist: {
    gap: 7,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
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
  verifyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.success + '10', borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.success + '30',
    marginTop: SPACING.sm,
  },
  verifyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  verifyDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  navRow: { flexDirection: 'row', marginTop: SPACING.lg },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});
