import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

const PROS = {
  ayanfe: {
    name: 'Ayanfe Buildings',
    trade: 'Engineer',
    rating: '4.9',
    jobs: '126 completed jobs',
    price: 'Quote or hourly',
    response: 'Replies in 12 min',
    about: 'Structural, repair, and small build work with clean quotes and documented job completion.',
    services: ['Repairs', 'Installations', 'Site assessment', 'Quotes'],
  },
  plumbing: {
    name: 'Northside Plumbing',
    trade: 'Plumber',
    rating: '4.8',
    jobs: '89 completed jobs',
    price: 'From $85/hr',
    response: 'Replies in 18 min',
    about: 'Leaks, fixture replacements, emergency plumbing, and preventative maintenance.',
    services: ['Leaks', 'Fixtures', 'Drainage', 'Emergency calls'],
  },
  electric: {
    name: 'BrightLine Electric',
    trade: 'Electrician',
    rating: '4.7',
    jobs: '73 completed jobs',
    price: '$90/hr',
    response: 'Replies in 25 min',
    about: 'Residential electrical installs, troubleshooting, panel work, and outdoor power.',
    services: ['Outlets', 'Lighting', 'Panel work', 'Troubleshooting'],
  },
  hair: {
    name: 'Amina Hair Studio',
    trade: 'Hairstylist',
    rating: '4.9',
    jobs: '141 completed bookings',
    price: 'From $80/session',
    response: 'Replies in 9 min',
    about: 'Cuts, installs, styling, and event hair with clear session pricing and quote-based custom work.',
    services: ['Hair styling', 'Braids', 'Installs', 'Event styling'],
  },
  tailor: {
    name: 'Precision Tailoring',
    trade: 'Tailor',
    rating: '4.8',
    jobs: '64 completed jobs',
    price: 'Quote first',
    response: 'Replies in 22 min',
    about: 'Alterations, repairs, fittings, and custom garment work priced after request details.',
    services: ['Alterations', 'Repairs', 'Fittings', 'Custom work'],
  },
} as const;

const reviews = [
  { name: 'M. Johnson', text: 'Clear estimate, showed up on time, and documented everything.' },
  { name: 'Sarah W.', text: 'Professional communication and the final invoice matched the quote.' },
] as const;

export default function ProProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, startConversation } = useAppStore();
  const params = useLocalSearchParams<{ proId?: keyof typeof PROS }>();
  const pro = PROS[params.proId || 'ayanfe'] || PROS.ayanfe;
  const proId = params.proId || 'ayanfe';
  const nextRoute = `/pro-profile?proId=${proId}`;

  const openChat = (quoteRequested = false) => {
    if (isAuthenticated) {
      const conversationId = startConversation({
        participantId: proId,
        participantName: pro.name,
        participantRole: 'tradesperson',
        subject: quoteRequested ? `Quote request: ${pro.trade}` : pro.name,
        quoteRequested,
        initialMessage: quoteRequested ? `Hi ${pro.name}, I would like a quote for ${pro.trade.toLowerCase()} work.` : undefined,
      });
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
      return;
    }
    Alert.alert('Create an account', 'Sign up or log in to message, book, or request a quote from this service pro.', [
      { text: 'Log in', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } }) },
      { text: 'Sign up', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'customer', next: nextRoute } }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Pro</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => isAuthenticated ? router.push('/profile') : router.push({ pathname: '/(auth)/login', params: { next: nextRoute } })}>
          <MaterialCommunityIcons name={isAuthenticated ? 'account-circle-outline' : 'login'} size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{pro.name.charAt(0)}</Text>
          </View>
          <View style={styles.heroText}>
            <View style={styles.verifiedRow}>
              <Text style={styles.name}>{pro.name}</Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="shield-check" size={13} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.trade}>{pro.trade} · {pro.jobs}</Text>
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star" size={15} color={COLORS.warning} />
              <Text style={styles.rating}>{pro.rating}</Text>
              <Text style={styles.price}>{pro.price}</Text>
              <Text style={styles.response}>{pro.response}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => openChat(false)}>
            <MaterialCommunityIcons name="message-text-outline" size={19} color="#071210" />
            <Text style={styles.primaryText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => openChat(true)}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={19} color={COLORS.primary} />
            <Text style={styles.secondaryText}>Request Quote</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>About</Text>
          <Text style={styles.about}>{pro.about}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Services</Text>
          <View style={styles.serviceGrid}>
            {pro.services.map(service => (
              <View key={service} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent work</Text>
          <View style={styles.portfolioGrid}>
            {['Bathroom repair', 'Outdoor outlet', 'Ceiling install'].map(item => (
              <TouchableOpacity key={item} style={styles.portfolioCard} activeOpacity={0.85} onPress={() => openChat(false)}>
                <MaterialCommunityIcons name="image-outline" size={26} color={COLORS.textMuted} />
                <Text style={styles.portfolioText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Reviews</Text>
          {reviews.map((review, index) => (
            <View key={review.name} style={[styles.review, index > 0 && styles.reviewBorder]}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{review.name}</Text>
                <View style={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MaterialCommunityIcons key={i} name="star" size={12} color={COLORS.warning} />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.bottomCta} onPress={() => openChat(true)}>
          <Text style={styles.bottomCtaText}>{isAuthenticated ? 'Request a Quote' : 'Sign Up to Book or Message'}</Text>
        </TouchableOpacity>
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
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText: { fontSize: 26, color: '#071210', fontWeight: '900' },
  heroText: { flex: 1, gap: 5 },
  verifiedRow: { gap: SPACING.sm },
  name: { fontSize: 22, color: COLORS.text, fontWeight: '900' },
  verifiedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.success + '16' },
  verifiedText: { fontSize: 11, color: COLORS.success, fontWeight: '900' },
  trade: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  rating: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
  price: { fontSize: 13, color: COLORS.primary, fontWeight: '900', marginLeft: SPACING.sm },
  response: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  primaryButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  primaryText: { fontSize: 14, color: '#071210', fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary + '44' },
  secondaryText: { fontSize: 14, color: COLORS.primary, fontWeight: '900' },
  panel: { gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  panelTitle: { fontSize: 16, color: COLORS.text, fontWeight: '900' },
  about: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  serviceChip: { paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  serviceText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800' },
  portfolioGrid: { flexDirection: 'row', gap: SPACING.sm },
  portfolioCard: { flex: 1, minHeight: 94, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  portfolioText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '800', textAlign: 'center' },
  review: { gap: 6, paddingVertical: SPACING.sm },
  reviewBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
  stars: { flexDirection: 'row' },
  reviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  bottomCta: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md },
  bottomCtaText: { fontSize: 15, color: '#071210', fontWeight: '900' },
});
