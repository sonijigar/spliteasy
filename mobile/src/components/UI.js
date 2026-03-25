import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../utils/theme';

// ── Avatar ──────────────────────────────────────────────────
const AVATAR_COLORS = ['#e8505b', '#f9a826', '#14a76c', '#4a90d9', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'];

export function Avatar({ name = '', size = 36, color }) {
  const idx = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const bg = color || AVATAR_COLORS[idx];
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7}
      style={[styles.card, style]}>
      {children}
    </Wrapper>
  );
}

// ── Button ──────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={[styles.btnText, !isPrimary && { color: colors.text }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Input ───────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && { borderColor: colors.primary }]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// ── Empty State ─────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon || 'help-circle-outline'} size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 15,
  },
  error: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
