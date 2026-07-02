import React, { createContext, ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BORDER_RADIUS, COLORS, SPACING } from '../../lib/constants';

type AlertVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ThemedAlertAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: AlertVariant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type ThemedAlertOptions = {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actions?: ThemedAlertAction[];
  dismissible?: boolean;
};

type ThemedAlertContextValue = {
  show: (options: ThemedAlertOptions) => void;
  hide: () => void;
};

const ThemedAlertContext = createContext<ThemedAlertContextValue | null>(null);

export function ThemedAlertProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ThemedAlertOptions | null>(null);

  const hide = useCallback(() => setDialog(null), []);
  const show = useCallback((options: ThemedAlertOptions) => {
    setDialog({ dismissible: true, ...options });
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);
  const actions = dialog?.actions?.length
    ? dialog.actions
    : [{ label: 'OK', variant: 'primary' as const }];

  const runAction = async (action: ThemedAlertAction) => {
    setDialog(null);
    await action.onPress?.();
  };

  return (
    <ThemedAlertContext.Provider value={value}>
      {children}
      <Modal transparent visible={!!dialog} animationType="fade" statusBarTranslucent onRequestClose={hide}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dialog?.dismissible === false ? undefined : hide}
          />
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeButton} onPress={hide} activeOpacity={0.82}>
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerRow}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={dialog?.icon || 'information-outline'}
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.titleColumn}>
                <Text style={styles.title}>{dialog?.title}</Text>
                {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
              </View>
            </View>

            <View style={styles.actions}>
              {actions.map((action, index) => {
                const variant = action.variant || (index === 0 ? 'primary' : 'secondary');
                return (
                  <TouchableOpacity
                    key={`${action.label}-${index}`}
                    style={[styles.action, styles[`action_${variant}`]]}
                    activeOpacity={0.86}
                    onPress={() => void runAction(action)}
                  >
                    {action.icon ? (
                      <MaterialCommunityIcons
                        name={action.icon}
                        size={18}
                        color={variant === 'primary' ? '#071210' : actionColor(variant)}
                      />
                    ) : null}
                    <Text style={[styles.actionText, styles[`actionText_${variant}`]]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ThemedAlertContext.Provider>
  );
}

export function useThemedAlert() {
  const context = React.use(ThemedAlertContext);
  if (!context) {
    throw new Error('useThemedAlert must be used inside ThemedAlertProvider');
  }
  return context;
}

function actionColor(variant: AlertVariant) {
  if (variant === 'danger') return COLORS.error;
  if (variant === 'ghost') return COLORS.textSecondary;
  return COLORS.text;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(5, 8, 12, 0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
    paddingRight: 34,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '16',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  titleColumn: {
    flex: 1,
    gap: 7,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: SPACING.sm,
  },
  action: {
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  action_primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  action_secondary: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
  },
  action_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  action_danger: {
    backgroundColor: COLORS.error + '16',
    borderColor: COLORS.error + '44',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  actionText_primary: {
    color: '#071210',
  },
  actionText_secondary: {
    color: COLORS.text,
  },
  actionText_ghost: {
    color: COLORS.textSecondary,
  },
  actionText_danger: {
    color: COLORS.error,
  },
});
