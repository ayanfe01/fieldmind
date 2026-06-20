import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations } = useAppStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.iconButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="message-text-outline" size={44} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Request a quote or message a professional to start a chat.</Text>
          </View>
        ) : conversations.map(conversation => (
          <TouchableOpacity
            key={conversation.id}
            style={styles.card}
            activeOpacity={0.86}
            onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{conversation.participantName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{conversation.participantName}</Text>
                <Text style={styles.time}>{format(new Date(conversation.updatedAt), 'MMM d')}</Text>
              </View>
              <Text style={styles.subject} numberOfLines={1}>{conversation.subject || 'Conversation'}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{conversation.lastMessage || 'Tap to continue'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, color: COLORS.text, fontWeight: '900' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText: { fontSize: 18, color: '#071210', fontWeight: '900' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '900' },
  time: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  subject: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '800' },
  lastMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
});
