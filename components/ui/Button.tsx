import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../lib/constants';

interface ButtonProps {
  title: string; onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean; disabled?: boolean; style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const buttonSize = buttonSizeStyles[size];
  const textVariant = textVariantStyles[variant];
  const textSize = textSizeStyles[size];

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], buttonSize, isDisabled && styles.disabled, style]}
      onPress={onPress} disabled={isDisabled} activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : COLORS.primary} size="small" />
        : <Text style={[styles.text, textVariant, textSize]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md },
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: COLORS.error },
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32 },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '700', letterSpacing: 0.3 },
  text_primary: { color: '#fff' },
  text_secondary: { color: COLORS.text },
  text_ghost: { color: COLORS.primary },
  text_danger: { color: '#fff' },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});

const buttonSizeStyles = {
  sm: styles.size_sm,
  md: styles.size_md,
  lg: styles.size_lg,
};

const textVariantStyles = {
  primary: styles.text_primary,
  secondary: styles.text_secondary,
  ghost: styles.text_ghost,
  danger: styles.text_danger,
};

const textSizeStyles = {
  sm: styles.textSize_sm,
  md: styles.textSize_md,
  lg: styles.textSize_lg,
};
