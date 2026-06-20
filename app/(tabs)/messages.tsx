import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { useAppStore } from '../../store/useAppStore';

export default function MessagesScreen() {
  const router = useRouter();
  const conversations = useAppStore(s => s.conversations);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="message-text-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>Request a quote or message a service pro to start a chat.</Text>
          </View>
        ) : conversations.map(conversation => (
          <TouchableOpacity
            key={conversation.id}
            style={styles.thread}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{conversation.participantName.charAt(0)}</Text>
            </View>
            <View style={styles.threadBody}>
              <View style={styles.threadTop}>
                <Text style={styles.name}>{conversation.participantName}</Text>
                <Text style={styles.time}>{format(new Date(conversation.updatedAt), 'MMM d')}</Text>
              </View>
              <Text style={styles.subject} numberOfLines={1}>{conversation.subject || 'Conversation'}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{conversation.lastMessage || 'Tap to continue'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 110, gap: SPACING.sm },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: SPACING.lg },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900', marginTop: SPACING.md },
  emptyBody: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  thread: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, color: '#071210', fontWeight: '900' },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '900' },
  time: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  subject: { fontSize: 12, color: COLORS.primary, fontWeight: '800', marginTop: 3 },
  lastMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
});
