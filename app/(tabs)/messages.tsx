import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { COLORS, SPACING } from '../../lib/constants';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../../components/ui/Avatar';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { Conversation } from '../../lib/types';

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
        <View style={styles.avatarWrap}>
          <Avatar name={conversation.participantName} uri={conversation.participantPhoto} size={50} />
        </View>
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

export default function MessagesScreen() {
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
        {
          label: 'Delete',
          variant: 'danger',
          icon: 'trash-can-outline',
          onPress: () => deleteConversation(conversation.id),
        },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  }, [themedAlert, deleteConversation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="message-text-outline" size={20} color={COLORS.textSecondary} />
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="message-text-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>Request a quote or message a service pro to start a chat.</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  headerRight: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  list: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: 110 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm, marginTop: 4 },
  hint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.md, fontStyle: 'italic' },
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '66',
  },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  threadBody: { flex: 1, minWidth: 0 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: 2 },
  name: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '800' },
  time: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  subject: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 2 },
  lastMessage: { fontSize: 13, color: COLORS.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg * 2 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
});
