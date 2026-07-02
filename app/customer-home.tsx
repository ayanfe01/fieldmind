import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { MARKETPLACE_PRO_LIST } from '../lib/marketplacePros';
import { getServiceCategoryLabel } from '../lib/serviceCategories';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from '../components/ui/Avatar';

const savedPros = MARKETPLACE_PRO_LIST.slice(0, 3);

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, authInitialized, jobs, conversations, messages, profilePhoto } = useAppStore();
  const activeRequests = jobs.filter(job => job.clientId === user?.id && job.status !== 'completed' && job.status !== 'cancelled');
  const unreadCount = conversations.filter(c => {
    const convMsgs = messages.filter(m => m.conversationId === c.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastMsg = convMsgs[0];
    return lastMsg && lastMsg.senderId !== user?.id;
  }).length;

  if (!authInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.role === 'admin') {
    return <Redirect href="/admin" />;
  }

  if (user?.role === 'tradesperson') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Welcome back</Text>
            <Text style={styles.name}>{user?.name || 'FieldMind Customer'}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
            <Avatar name={user?.name} uri={profilePhoto} size={54} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryPanel} onPress={() => router.push('/post-job')} activeOpacity={0.86}>
          <View style={styles.primaryIcon}>
            <MaterialCommunityIcons name="clipboard-plus-outline" size={28} color="#071210" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryTitle}>Post a new job</Text>
            <Text style={styles.primaryBody}>Add photos, budget, timing, and let trusted pros quote.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#071210" />
        </TouchableOpacity>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/find-pro')}>
            <MaterialCommunityIcons name="home-search-outline" size={24} color={COLORS.primary} />
            <Text style={styles.quickText}>Find a Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/find-pro')}>
            <MaterialCommunityIcons name="shield-account-outline" size={24} color={COLORS.primary} />
            <Text style={styles.quickText}>Browse Pros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/messages')}>
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="message-text-outline" size={24} color={COLORS.primary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/job-history')}>
            <MaterialCommunityIcons name="history" size={24} color={COLORS.primary} />
            <Text style={styles.quickText}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Requests</Text>
            <TouchableOpacity onPress={() => router.push('/post-job')}>
              <Text style={styles.sectionAction}>New</Text>
            </TouchableOpacity>
          </View>
          {activeRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="file-search-outline" size={28} color={COLORS.primary} />
              <Text style={styles.emptyText}>No active requests yet</Text>
            </View>
          ) : activeRequests.map(request => (
            <TouchableOpacity key={request.id} style={styles.requestCard} onPress={() => router.push({ pathname: '/job-detail', params: { jobId: request.id } })} activeOpacity={0.86}>
              <View style={styles.requestIcon}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <Text style={styles.requestDetail}>
                  {getServiceCategoryLabel(request.category, request.customCategory)}
                  {request.budgetRange ? ` - ${request.budgetRange}` : ''}
                  {request.urgency ? ` - ${request.urgency}` : ''}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{request.status === 'scheduled' ? 'Quotes open' : request.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Pros</Text>
            <TouchableOpacity onPress={() => router.push('/find-pro')}>
              <Text style={styles.sectionAction}>See all</Text>
            </TouchableOpacity>
          </View>
          {savedPros.map(pro => (
            <TouchableOpacity
              key={pro.name}
              style={styles.proCard}
              onPress={() => router.push({ pathname: '/pro-profile', params: { proId: pro.id } })}
              activeOpacity={0.86}
            >
              <View style={styles.proAvatar}>
                <Text style={styles.proAvatarText}>{pro.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proName}>{pro.name}</Text>
                <Text style={styles.proMeta}>{pro.trade} - {pro.rating} rating</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 12, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  name: { fontSize: 27, color: COLORS.text, fontWeight: '900' },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryPanel: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl },
  primaryIcon: { width: 54, height: 54, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  primaryTitle: { fontSize: 20, color: '#071210', fontWeight: '900', marginBottom: 4 },
  primaryBody: { fontSize: 13, color: '#07352F', lineHeight: 19, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', gap: SPACING.sm },
  quickCard: { flex: 1, minHeight: 86, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  quickText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800', textAlign: 'center' },
  badge: { position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  sectionAction: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  requestIcon: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '14' },
  requestTitle: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  requestDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 17 },
  statusPill: { maxWidth: 94, paddingHorizontal: 8, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary + '16' },
  statusText: { fontSize: 10, color: COLORS.primary, fontWeight: '900', textAlign: 'center' },
  proCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  proAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  proAvatarText: { fontSize: 17, color: '#071210', fontWeight: '900' },
  proName: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  proMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, fontWeight: '700' },
});
