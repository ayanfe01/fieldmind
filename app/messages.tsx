import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from '../components/ui/Avatar';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';
import { Conversation } from '../lib/types';

function formatThreadTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function ThreadRow({ conversation, onPress, onDelete }: { conversation: Conversation; onPress: () => void; onDelete: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.thread}
        activeOpacity={1}
        onPress={onPress}
        onLongPress={onDelete}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={500}
      >
        <Avatar name={conversation.participantName} uri={conversation.participantPhoto} size={50} />
        <View style={styles.threadBody}>
          <View style={styles.threadTop}>
            <Text style={styles.name} numberOfLines={1}>{conversation.participantName}</Text>
            <Text style={styles.time}>{formatThreadTime(conversation.updatedAt)}</Text>
          </View>
          {conversation.subject ? (
            <Text style={styles.subject} numberOfLines={1}>{conversation.subject}</Text>
          ) : null}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage || 'Tap to start chatting'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CustomerMessagesScreen() {
  const router = useRouter();
  const themedAlert = useThemedAlert();
  const conversations = useAppStore(s => s.conversations);
  const deleteConversation = useAppStore(s => s.deleteConversation);
  const refreshCloudData = useAppStore(s => s.refreshCloudData);

  useEffect(() => {
    void refreshCloudData();
    const timer = setInterval(() => void refreshCloudData(), 6000);
    return () => clearInterval(timer);
  }, [refreshCloudData]);

  const handleDelete = useCallback((conversation: Conversation) => {
    themedAlert.show({
      title: 'Delete conversation?',
      message: `This will remove your chat with ${conversation.participantName}. Messages cannot be recovered.`,
      icon: 'message-minus-outline',
      actions: [
        { label: 'Delete', variant: 'danger', icon: 'trash-can-outline', onPress: () => deleteConversation(conversation.id) },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  }, [themedAlert, deleteConversation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="message-text-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>Find a service pro and request a quote to start chatting.</Text>
          <TouchableOpacity style={styles.findProBtn} onPress={() => router.push('/find-pro')}>
            <MaterialCommunityIcons name="home-search-outline" size={18} color="#071210" />
            <Text style={styles.findProText}>Find a Pro</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>Recent</Text>
          {conversations.map(conversation => (
            <ThreadRow
              key={conversation.id}
              conversation={conversation}
              onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: conversation.id } })}
              onDelete={() => handleDelete(conversation)}
            />
          ))}
          <Text style={styles.hint}>Hold a conversation to delete it</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  list: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.md },
  hint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md, fontStyle: 'italic' },
  thread: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border + '66' },
  threadBody: { flex: 1, minWidth: 0 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: 2 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '800' },
  time: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  subject: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 2 },
  lastMessage: { fontSize: 13, color: COLORS.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg * 2, gap: SPACING.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  findProBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  findProText: { fontSize: 14, fontWeight: '900', color: '#071210' },
});
