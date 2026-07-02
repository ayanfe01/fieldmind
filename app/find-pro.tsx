import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { MARKETPLACE_PRO_LIST, MarketplaceProId } from '../lib/marketplacePros';
import { SERVICE_CATEGORY_OPTIONS } from '../lib/serviceCategories';
import { fetchPublicServicePros, PublicServicePro } from '../lib/cloudData';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from '../components/ui/Avatar';

const filters = ['All', ...SERVICE_CATEGORY_OPTIONS.slice(0, 5).map(item => item.label)];

const uniqueServices = (services: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return services.filter((service): service is string => {
    const normalized = service?.trim();
    const key = normalized?.toLowerCase();
    if (!normalized || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

type DirectoryPro = {
  id: string;
  profileId?: MarketplaceProId;
  participantUserId?: string;
  profilePhoto?: string | null;
  name: string;
  ownerName?: string;
  businessName?: string;
  trade: string;
  category: string;
  rating: string;
  jobs: string;
  price: string;
  response: string;
  badge: string;
  about: string;
  services: string[];
};

const formatPublicPro = (pro: PublicServicePro): DirectoryPro => {
  const primaryTrade = pro.customTrade || pro.trade || pro.trades?.[0] || 'Service Pro';
  const ownerName = pro.name?.trim() || 'Service Pro';
  const businessName = pro.businessName?.trim();
  const displayName = businessName || ownerName;
  const price = pro.pricingMode === 'hourly' && pro.hourlyRate
    ? `$${pro.hourlyRate}/hr`
    : pro.pricingMode === 'fixed' && pro.fixedRate
      ? `From $${pro.fixedRate}`
      : 'Quote first';

  return {
    id: `profile-${pro.id}`,
    participantUserId: pro.id,
    name: displayName,
    ownerName,
    businessName,
    trade: primaryTrade,
    category: primaryTrade,
    rating: 'New',
    jobs: pro.yearsExperience ? `${pro.yearsExperience} yrs experience` : 'New on FieldMind',
    price,
    response: pro.serviceArea || 'Service area available',
    badge: 'Verified account',
    about: pro.bio || `${displayName} offers ${primaryTrade.toLowerCase()} services on FieldMind.`,
    services: uniqueServices([primaryTrade, ...(pro.trades || []), pro.customTrade]).slice(0, 4),
    profilePhoto: pro.profilePhoto,
  };
};

export default function FindProScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const themedAlert = useThemedAlert();
  const { isAuthenticated, startConversation } = useAppStore();
  const [query, setQuery] = useState(params.category || '');
  const [filter, setFilter] = useState(params.category || 'All');
  const [cloudPros, setCloudPros] = useState<DirectoryPro[]>([]);
  const [loadingPros, setLoadingPros] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingPros(true);
    fetchPublicServicePros()
      .then(pros => {
        if (active) setCloudPros(pros.map(formatPublicPro));
      })
      .finally(() => {
        if (active) setLoadingPros(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const directoryPros: DirectoryPro[] = useMemo(() => [
    ...cloudPros,
    ...MARKETPLACE_PRO_LIST.map(pro => ({
      ...pro,
      profileId: pro.id,
      services: [...pro.services],
      profilePhoto: null,
    })),
  ], [cloudPros]);

  const pros = useMemo(() => {
    const search = query.trim().toLowerCase();
    const activeFilter = filter === 'All' ? '' : filter.toLowerCase();

    return directoryPros.filter((pro) => {
      const haystack = [
        pro.name,
        pro.ownerName,
        pro.businessName,
        pro.trade,
        pro.category,
        pro.about,
        ...pro.services,
      ].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesFilter = !activeFilter || haystack.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [directoryPros, filter, query]);

  const openProfile = (pro: DirectoryPro) => {
    router.push({
      pathname: '/pro-profile',
      params: {
        proId: pro.profileId || pro.id,
        participantUserId: pro.participantUserId,
        profilePhoto: pro.profilePhoto || undefined,
        name: pro.name,
        ownerName: pro.ownerName,
        businessName: pro.businessName,
        trade: pro.trade,
        jobs: pro.jobs,
        price: pro.price,
        response: pro.response,
        about: pro.about,
        services: pro.services.join('|'),
      },
    });
  };

  const requestQuote = (pro: DirectoryPro) => {
    if (!isAuthenticated) {
      themedAlert.show({
        title: 'Create an account',
        message: 'Sign up or log in to request a quote, message pros, and keep the conversation in one place.',
        icon: 'message-lock-outline',
        actions: [
          { label: 'Log in', icon: 'login', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: '/find-pro' } }) },
          { label: 'Sign up', icon: 'account-plus-outline', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'customer', next: '/find-pro' } }) },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
      return;
    }

    const conversationId = startConversation({
      participantId: pro.id,
      participantUserId: pro.participantUserId,
      participantPhoto: pro.profilePhoto,
      participantName: pro.name,
      participantRole: 'tradesperson',
      subject: `Quote request: ${pro.trade}`,
      quoteRequested: true,
    });
    router.push({
      pathname: '/chat/[conversationId]',
      params: {
        conversationId,
        draft: `Hi ${pro.name}, I would like a quote for ${pro.trade.toLowerCase()} work.`,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Pro</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/post-job')}>
          <MaterialCommunityIcons name="clipboard-plus-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchPanel}>
          <Text style={styles.title}>Search service pros</Text>
          <Text style={styles.subtitle}>Type the exact work you need, then message or request a quote.</Text>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Mechanic, tailor, nail tech, plumber..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.trim().length > 0 ? (
              <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
                <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map(item => {
            const active = filter === item;
            return (
              <TouchableOpacity key={item} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(item)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{pros.length} matches</Text>
          <TouchableOpacity onPress={() => router.push('/post-job')}>
            <Text style={styles.resultAction}>Post a job instead</Text>
          </TouchableOpacity>
        </View>

        {pros.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-search-outline" size={30} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>No exact match yet</Text>
            <Text style={styles.emptyBody}>Post a job with your own category and pros can reach out with quotes.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push({ pathname: '/post-job', params: query ? { category: query } : undefined })}>
              <Text style={styles.emptyButtonText}>Post a Request</Text>
            </TouchableOpacity>
          </View>
        ) : pros.map(pro => (
          <TouchableOpacity key={pro.id} style={styles.proCard} activeOpacity={0.86} onPress={() => openProfile(pro)}>
            <View style={styles.proTop}>
              <Avatar name={pro.name} uri={pro.profilePhoto} size={52} />
              <View style={styles.proInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.proName}>{pro.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pro.badge}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{pro.trade} - {pro.jobs}</Text>
                {pro.ownerName && pro.ownerName !== pro.name ? (
                  <Text style={styles.ownerName}>by {pro.ownerName}</Text>
                ) : null}
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={14} color={COLORS.warning} />
                  <Text style={styles.rating}>{pro.rating}</Text>
                  <Text style={styles.price}>{pro.price}</Text>
                  <Text style={styles.response}>{pro.response}</Text>
                </View>
              </View>
            </View>

            <View style={styles.serviceRow}>
              {pro.services.slice(0, 3).map((service, index) => (
                <View key={`${pro.id}-${service}-${index}`} style={styles.serviceChip}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={(event) => {
                  event.stopPropagation();
                  openProfile(pro);
                }}
              >
                <Text style={styles.secondaryText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={(event) => {
                  event.stopPropagation();
                  requestQuote(pro);
                }}
              >
                <MaterialCommunityIcons name="message-text-outline" size={17} color="#071210" />
                <Text style={styles.primaryText}>Request Quote</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        {loadingPros ? (
          <View style={styles.loadingPros}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Refreshing service pros...</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  searchPanel: { gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 24, color: COLORS.text, fontWeight: '900' },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  searchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  clearButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  filterRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  filterTextActive: { color: '#071210' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  resultTitle: { fontSize: 16, color: COLORS.text, fontWeight: '900' },
  resultAction: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },
  proCard: { gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  proTop: { flexDirection: 'row', gap: SPACING.md },
  proInfo: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  proName: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '900' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary + '18' },
  badgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '900' },
  meta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  ownerName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  rating: { fontSize: 12, color: COLORS.text, fontWeight: '900' },
  price: { fontSize: 12, color: COLORS.primary, fontWeight: '900', marginLeft: SPACING.sm },
  response: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  serviceChip: { paddingHorizontal: SPACING.sm, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  serviceText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  secondaryButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  secondaryText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '900' },
  primaryButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  primaryText: { fontSize: 13, color: '#071210', fontWeight: '900' },
  emptyCard: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  emptyBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, textAlign: 'center' },
  emptyButton: { marginTop: SPACING.sm, minHeight: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  emptyButtonText: { fontSize: 14, color: '#071210', fontWeight: '900' },
  loadingPros: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  loadingText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
});
