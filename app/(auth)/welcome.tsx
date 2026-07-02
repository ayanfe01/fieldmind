import React, { useState } from 'react';
import {
  Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { MARKETPLACE_PRO_LIST } from '../../lib/marketplacePros';
import { SERVICE_CATEGORY_OPTIONS } from '../../lib/serviceCategories';
import { UserRole } from '../../lib/types';

type AudienceMode = 'customer' | 'tradesperson';

const openJobs = [
  { id: 'sink', title: 'Kitchen sink leaking', location: 'Moncton, NB', budget: '$300-$450', status: 'Quote needed' },
  { id: 'outlet', title: 'Install outdoor outlet', location: 'Dieppe, NB', budget: '$350-$500', status: 'Ready today' },
  { id: 'fan', title: 'Ceiling fan replacement', location: 'Riverview, NB', budget: '$150-$240', status: 'Flexible' },
] as const;

const stats = [
  { label: 'Jobs posted', value: '2.4k' },
  { label: 'Verified pros', value: '830+' },
  { label: 'Avg. response', value: '18m' },
] as const;

const compactCategories = SERVICE_CATEGORY_OPTIONS.slice(0, 6);
const previewPros = MARKETPLACE_PRO_LIST.slice(0, 4);

export default function WelcomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AudienceMode>('customer');
  const [query, setQuery] = useState('');

  const startSignup = (role: UserRole) => {
    router.push({ pathname: '/(auth)/signup', params: { role } });
  };

  const openPostJob = (category?: string) => {
    router.push({ pathname: '/post-job', params: category ? { category } : undefined });
  };
  const submitSearch = () => {
    if (mode === 'customer') {
      openPostJob(query.trim() || undefined);
      return;
    }
    startSignup('tradesperson');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <View>
              <Text style={styles.greeting}>Good morning</Text>
              <Text style={styles.brand}>FieldMind</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <MaterialCommunityIcons name="login" size={17} color={COLORS.text} />
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchPanel}>
          <Text style={styles.screenTitle}>
            {mode === 'customer' ? 'What do you need done?' : 'Find requests that match your skill'}
          </Text>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={mode === 'customer' ? 'Search hair, tailoring, plumbing, repairs...' : 'Search requests near you...'}
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
            <TouchableOpacity style={styles.searchAction} onPress={submitSearch}>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#071210" />
            </TouchableOpacity>
          </View>

          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentButton, mode === 'customer' && styles.segmentActive]}
              onPress={() => setMode('customer')}
            >
              <MaterialCommunityIcons name="home-search-outline" size={17} color={mode === 'customer' ? '#071210' : COLORS.textSecondary} />
              <Text style={[styles.segmentText, mode === 'customer' && styles.segmentTextActive]}>Hire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, mode === 'tradesperson' && styles.segmentActive]}
              onPress={() => setMode('tradesperson')}
            >
              <MaterialCommunityIcons name="briefcase-search-outline" size={17} color={mode === 'tradesperson' ? '#071210' : COLORS.textSecondary} />
              <Text style={[styles.segmentText, mode === 'tradesperson' && styles.segmentTextActive]}>Work</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {compactCategories.map(category => (
            <TouchableOpacity key={category.value} style={styles.categoryCard} activeOpacity={0.84} onPress={() => openPostJob(category.label)}>
              <MaterialCommunityIcons name={category.icon as any} size={24} color={COLORS.primary} />
              <Text style={styles.categoryText}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          {stats.map(item => (
            <View key={item.label} style={styles.statItem}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {mode === 'customer' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top service pros nearby</Text>
              <TouchableOpacity onPress={() => router.push('/find-pro')}>
                <Text style={styles.sectionAction}>See all</Text>
              </TouchableOpacity>
            </View>

            {previewPros.map(pro => (
              <TouchableOpacity
                key={pro.name}
                style={styles.proCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/pro-profile', params: { proId: pro.id } })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{pro.name.charAt(0)}</Text>
                </View>
                <View style={styles.proInfo}>
                  <View style={styles.proNameRow}>
                    <Text style={styles.proName}>{pro.name}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pro.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.proMeta}>{pro.trade} - {pro.jobs}</Text>
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={14} color={COLORS.warning} />
                    <Text style={styles.ratingText}>{pro.rating}</Text>
                    <Text style={styles.priceText}>{pro.price}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={21} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.actionPanel} activeOpacity={0.88} onPress={() => openPostJob()}>
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={24} color="#071210" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Post a service request</Text>
                <Text style={styles.actionBody}>Add photos, budget, address, and timing after signup.</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open jobs preview</Text>
              <TouchableOpacity onPress={() => startSignup('tradesperson')}>
                <Text style={styles.sectionAction}>Filter</Text>
              </TouchableOpacity>
            </View>

            {openJobs.map(job => (
              <TouchableOpacity
                key={job.title}
                style={styles.jobCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/job-preview', params: { jobId: job.id } })}
              >
                <View style={styles.jobTopRow}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobBudget}>{job.budget}</Text>
                </View>
                <View style={styles.jobMetaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.jobMeta}>{job.location}</Text>
                </View>
                <View style={styles.jobFooter}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{job.status}</Text>
                  </View>
                  <Text style={styles.lockedText}>Sign up to accept</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.actionPanel} activeOpacity={0.88} onPress={() => startSignup('tradesperson')}>
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name="briefcase-check-outline" size={24} color="#071210" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Create your service profile</Text>
                <Text style={styles.actionBody}>Get discovered, quote requests, and manage your schedule.</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logo: { width: 42, height: 42, borderRadius: 10 },
  greeting: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  brand: { fontSize: 20, color: COLORS.text, fontWeight: '900' },
  loginButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginText: { fontSize: 13, color: COLORS.text, fontWeight: '800' },
  searchPanel: {
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  screenTitle: { fontSize: 25, lineHeight: 31, color: COLORS.text, fontWeight: '900' },
  searchRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  searchAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  segment: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: BORDER_RADIUS.sm,
  },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '800' },
  segmentTextActive: { color: '#071210' },
  categoryRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  categoryCard: {
    width: 98,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statItem: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontSize: 18, color: COLORS.text, fontWeight: '900', textAlign: 'center' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  sectionAction: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarText: { fontSize: 18, color: '#071210', fontWeight: '900' },
  proInfo: { flex: 1, gap: 4 },
  proNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  proName: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '900' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary + '18' },
  badgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '900' },
  proMeta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800' },
  priceText: { fontSize: 12, color: COLORS.text, fontWeight: '900', marginLeft: SPACING.sm },
  actionPanel: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '12',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  actionTitle: { fontSize: 15, color: COLORS.text, fontWeight: '900', marginBottom: 4 },
  actionBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  jobCard: {
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  jobTitle: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '900' },
  jobBudget: { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMeta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  jobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.warning + '16' },
  statusText: { fontSize: 11, color: COLORS.warning, fontWeight: '900' },
  lockedText: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },
});
