import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { defaultRouteForRole } from '../../lib/routes';
import { UserRole, TradeType, PropertyType, PricingMode } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';

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
  const params = useLocalSearchParams<{ role: UserRole; next?: string }>();
  const role: UserRole = params.role === 'tradesperson' ? 'tradesperson' : 'customer';
  const nextRoute = typeof params.next === 'string' ? params.next : undefined;
  const registerUser = useAppStore(s => s.registerUser);
  const signInWithGoogle = useAppStore(s => s.signInWithGoogle);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Tradesperson fields
  const [businessName, setBusinessName] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<TradeType | null>(null);
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

  const totalSteps = role === 'tradesperson' ? 4 : 3;
  const isTrade = role === 'tradesperson';

  const handleNext = () => {
    // Validate current step
    if (step === 1 && (!name || !email || !password)) {
      Alert.alert('Required fields', 'Please fill in all fields to continue.'); return;
    }
    if (step === 1 && password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.'); return;
    }
    if (step === 2 && !phone) {
      Alert.alert('Required', 'Please enter your phone number.'); return;
    }
    if (step === 2 && isTrade && !businessName) {
      Alert.alert('Required', 'Please enter your business name.'); return;
    }
    if (step === 3 && isTrade && !selectedTrade) {
      Alert.alert('Required', 'Please select your service category.'); return;
    }
    if (step === 3 && !isTrade && !selectedPropertyType) {
      Alert.alert('Required', 'Please select your property type.'); return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const result = await registerUser({
      id: Math.random().toString(36).substr(2, 9),
      role,
      name, email, phone,
      createdAt: new Date().toISOString(),
      ...(isTrade ? {
        businessName, trade: selectedTrade || 'general',
        pricingMode,
        hourlyRate: pricingMode === 'hourly' ? parseFloat(hourlyRate) || undefined : undefined,
        fixedRate: pricingMode === 'fixed' ? parseFloat(fixedRate) || undefined : undefined,
        yearsExperience: parseInt(yearsExp) || 1,
        serviceArea, licenseNumber, bio,
      } : {
        propertyAddress,
        propertyType: selectedPropertyType || 'home',
      }),
    }, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Account already exists', result.message || 'Try logging in instead.');
      return;
    }
    if (result.requiresEmailConfirmation) {
      Alert.alert('Confirm your email', result.message || 'Check your email, then log in.');
      router.replace('/(auth)/login');
      return;
    }
    router.replace((nextRoute || defaultRouteForRole(result.user?.role)) as any);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle(role);
    setGoogleLoading(false);

    if (!result.success || !result.user) {
      Alert.alert('Google signup failed', result.message || 'Unable to continue with Google.');
      return;
    }

    router.replace((nextRoute || defaultRouteForRole(result.user.role)) as any);
  };

  const RoleTag = () => (
    <View style={[styles.roleTag, isTrade ? styles.roleTagTrade : styles.roleTagCustomer]}>
      <MaterialCommunityIcons
        name={isTrade ? 'briefcase-outline' : 'home-account'}
        size={13} color={isTrade ? COLORS.primary : '#7EA7D8'}
      />
      <Text style={[styles.roleTagText, { color: isTrade ? COLORS.primary : '#7EA7D8' }]}>
        {isTrade ? 'Service Pro' : 'Customer'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <FormInput label="Password" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" icon="lock-outline" secureTextEntry />
          </View>
        )}

        {/* ── STEP 2: Contact + Business ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>{isTrade ? 'Your service business' : 'Contact details'}</Text>
            <Text style={styles.stepSub}>{isTrade ? 'Tell customers what you offer and how you charge' : 'How can we reach you?'}</Text>
            <FormInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" icon="phone-outline" keyboardType="phone-pad" />
            {isTrade && (
              <>
                <FormInput label="Business or display name" value={businessName} onChangeText={setBusinessName} placeholder="Amina Hair Studio" icon="store-outline" />
                <FormInput label="Service area" value={serviceArea} onChangeText={setServiceArea} placeholder="e.g. New York, NY" icon="map-marker-outline" />
                <FormInput label="Years of experience" value={yearsExp} onChangeText={setYearsExp} placeholder="5" icon="clock-outline" keyboardType="numeric" />
              </>
            )}
            {!isTrade && (
              <FormInput label="Property address" value={propertyAddress} onChangeText={setPropertyAddress} placeholder="123 Main St, City, State" icon="home-outline" />
            )}
          </View>
        )}

        {/* ── STEP 3: Trade / Property Type ── */}
        {step === 3 && isTrade && (
          <View>
            <Text style={styles.stepTitle}>Your service</Text>
            <Text style={styles.stepSub}>Pick the category clients should find you under</Text>
            <View style={styles.grid}>
              {SERVICE_CATEGORIES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.gridCard, selectedTrade === t.value && styles.gridCardActive]}
                  onPress={() => setSelectedTrade(t.value)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={t.icon as any} size={26}
                    color={selectedTrade === t.value ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.gridLabel, selectedTrade === t.value && { color: COLORS.primary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              <FormInput label="Hourly rate ($)" value={hourlyRate} onChangeText={setHourlyRate} placeholder="85" icon="cash-outline" keyboardType="numeric" />
            )}
            {pricingMode === 'fixed' && (
              <FormInput label="Starting price ($)" value={fixedRate} onChangeText={setFixedRate} placeholder="120" icon="cash-outline" keyboardType="numeric" />
            )}
          </View>
        )}

        {step === 3 && !isTrade && (
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
              title={isTrade ? 'Create Service Pro Account' : 'Create Customer Account'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl },
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
  },
  gridCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0D' },
  gridLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
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
