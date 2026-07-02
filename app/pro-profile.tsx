import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { MARKETPLACE_PROS, MarketplaceProId } from '../lib/marketplacePros';
import { useAppStore } from '../store/useAppStore';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';
import { Avatar } from '../components/ui/Avatar';

const reviews = [
  { name: 'M. Johnson', text: 'Clear estimate, showed up on time, and documented everything.' },
  { name: 'Sarah W.', text: 'Professional communication and the final invoice matched the quote.' },
] as const;

export default function ProProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, startConversation, ratings, portfolioItems, user } = useAppStore();
  const themedAlert = useThemedAlert();
  const params = useLocalSearchParams<{
    proId?: MarketplaceProId | string;
    participantUserId?: string;
    name?: string;
    trade?: string;
    jobs?: string;
    price?: string;
    response?: string;
    about?: string;
    services?: string;
    profilePhoto?: string;
    ownerName?: string;
    businessName?: string;
  }>();
  const staticPro = MARKETPLACE_PROS[(params.proId as MarketplaceProId) || 'ayanfe'];
  const pro = staticPro || {
    name: params.name || 'Service Pro',
    trade: params.trade || 'Service Pro',
    rating: 'New',
    jobs: params.jobs || 'New on FieldMind',
    price: params.price || 'Quote first',
    response: params.response || 'Service area available',
    about: params.about || 'This service pro is available on FieldMind.',
    services: params.services?.split('|').filter(Boolean) || ['Quotes', 'Messages', 'Bookings'],
  };
  const proId = params.proId || 'ayanfe';
  const isOwnProfile = !!params.participantUserId && params.participantUserId === user?.id;
  const displayPortfolio = isOwnProfile ? portfolioItems : [];

  // Real ratings for this pro (by Supabase userId if known)
  const proUserId = params.participantUserId;
  const liveRatings = proUserId ? ratings.filter(r => r.ratedUserId === proUserId) : [];
  const avgStars = liveRatings.length > 0
    ? (liveRatings.reduce((s, r) => s + r.stars, 0) / liveRatings.length).toFixed(1)
    : null;
  const nextRoute = `/pro-profile?proId=${proId}`;

  const openChat = (quoteRequested = false) => {
    if (isAuthenticated) {
      const conversationId = startConversation({
      participantId: proId,
      participantUserId: params.participantUserId,
      participantPhoto: params.profilePhoto,
      participantName: pro.name,
      participantRole: 'tradesperson',
      subject: quoteRequested ? `Quote request: ${pro.trade}` : pro.name,
      quoteRequested,
    });
      router.push({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId,
          draft: quoteRequested ? `Hi ${pro.name}, I would like a quote for ${pro.trade.toLowerCase()} work.` : undefined,
        },
      });
      return;
    }
    themedAlert.show({
      title: 'Create an account',
      message: 'Sign up or log in to message, book, or request a quote from this service pro.',
      icon: 'message-lock-outline',
      actions: [
        { label: 'Log in', icon: 'login', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } }) },
        { label: 'Sign up', icon: 'account-plus-outline', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'customer', next: nextRoute } }) },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
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
          <Avatar name={pro.name} uri={params.profilePhoto} size={72} />
          <View style={styles.heroText}>
            <View style={styles.verifiedRow}>
              <Text style={styles.name}>{pro.name}</Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="shield-check" size={13} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            {params.ownerName && params.ownerName !== pro.name ? (
              <Text style={styles.ownerName}>by {params.ownerName}</Text>
            ) : null}
            <Text style={styles.trade}>{pro.trade} - {pro.jobs}</Text>
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star" size={15} color={COLORS.warning} />
              <Text style={styles.rating}>{avgStars ?? pro.rating}</Text>
              {liveRatings.length > 0 && (
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>({liveRatings.length})</Text>
              )}
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
            {pro.services.map((service, index) => (
              <View key={`${service}-${index}`} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        {displayPortfolio.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Recent work</Text>
            <View style={styles.portfolioGrid}>
              {displayPortfolio.map(item => (
                <View key={item.id} style={styles.portfolioCard}>
                  {item.uri ? (
                    <Image source={{ uri: item.uri }} style={styles.portfolioImage} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={26} color={COLORS.textMuted} />
                  )}
                  {item.caption ? <Text style={styles.portfolioText} numberOfLines={1}>{item.caption}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
            <Text style={styles.panelTitle}>Reviews</Text>
            {avgStars && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="star" size={16} color={COLORS.warning} />
                <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.text }}>{avgStars}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>({liveRatings.length})</Text>
              </View>
            )}
          </View>
          {liveRatings.length > 0 ? liveRatings.slice(0, 5).map((r, index) => (
            <View key={r.id} style={[styles.review, index > 0 && styles.reviewBorder]}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.raterName}</Text>
                <View style={styles.stars}>
                  {[1,2,3,4,5].map(n => (
                    <MaterialCommunityIcons key={n} name={n <= r.stars ? 'star' : 'star-outline'} size={12} color={COLORS.warning} />
                  ))}
                </View>
              </View>
              {r.review ? <Text style={styles.reviewText}>{r.review}</Text> : null}
            </View>
          )) : reviews.map((review, index) => (
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
  heroText: { flex: 1, gap: 5 },
  verifiedRow: { gap: SPACING.sm },
  name: { fontSize: 22, color: COLORS.text, fontWeight: '900' },
  ownerName: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
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
  portfolioImage: { width: '100%', height: 80, borderRadius: BORDER_RADIUS.md },
  review: { gap: 6, paddingVertical: SPACING.sm },
  reviewBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
  stars: { flexDirection: 'row' },
  reviewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  bottomCta: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md },
  bottomCtaText: { fontSize: 15, color: '#071210', fontWeight: '900' },
});
