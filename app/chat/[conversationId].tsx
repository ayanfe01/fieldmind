import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { useAppStore } from '../../store/useAppStore';

export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { conversations, messages, addMessage, user } = useAppStore();
  const [draft, setDraft] = useState('');
  const conversation = conversations.find(item => item.id === conversationId);
  const threadMessages = useMemo(
    () => messages.filter(message => message.conversationId === conversationId),
    [conversationId, messages]
  );

  const send = () => {
    if (!conversationId || !draft.trim()) return;
    addMessage(conversationId, draft);
    setDraft('');
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{conversation.participantName}</Text>
            <Text style={styles.subject} numberOfLines={1}>{conversation.subject || 'Conversation'}</Text>
          </View>
          <View style={styles.iconButton} />
        </View>

        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
          {conversation.quoteRequested && (
            <View style={styles.systemCard}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={COLORS.primary} />
              <Text style={styles.systemText}>Quote request started. Share details, photos, budget, and timing here.</Text>
            </View>
          )}
          {threadMessages.map(message => {
            const isMine = message.senderId === user?.id;
            return (
              <View key={message.id} style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!isMine && <Text style={styles.messageSender}>{message.senderName}</Text>}
                <Text style={[styles.messageText, isMine ? styles.textMine : styles.textTheirs]}>{message.text}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor={COLORS.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]} onPress={send} disabled={!draft.trim()}>
            <MaterialCommunityIcons name="send" size={20} color="#071210" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  name: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  subject: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  messages: { flex: 1 },
  messagesContent: { padding: SPACING.lg, gap: SPACING.sm },
  systemCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '33' },
  systemText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  messageBubble: { maxWidth: '82%', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  messageSender: { fontSize: 11, color: COLORS.textMuted, fontWeight: '900', marginBottom: 4 },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  textMine: { color: '#071210' },
  textTheirs: { color: COLORS.text },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  sendButtonDisabled: { opacity: 0.45 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  backButton: { paddingHorizontal: SPACING.lg, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  backText: { color: '#071210', fontWeight: '900' },
});
