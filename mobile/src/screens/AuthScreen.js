import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/UI';
import { colors, spacing } from '../utils/theme';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        await signUp(name.trim(), phone.trim(), password);
      } else {
        await signIn(phone.trim(), password);
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💸</Text>
          <Text style={styles.title}>
            Split<Text style={{ color: colors.primary }}>Easy</Text>
          </Text>
          <Text style={styles.subtitle}>Split expenses effortlessly</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {isRegister && (
            <Input label="Your Name" placeholder="e.g. Alex" value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <Input
            label="Phone Number" placeholder="e.g. +1 555 0123"
            value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none"
          />
          <Input
            label="Password" placeholder="Min 6 characters"
            value={password} onChangeText={setPassword} secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={isRegister ? 'Create Account' : 'Sign In'}
            onPress={handleSubmit} loading={loading}
            disabled={!phone.trim() || !password}
            style={{ marginTop: 8 }}
          />

          <Button
            title={isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            variant="secondary"
            onPress={() => { setIsRegister(!isRegister); setError(''); }}
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logo: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  form: {},
  error: { color: colors.primary, fontSize: 13, textAlign: 'center', marginBottom: 8 },
});
