import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Avatar, Card, Button, Input } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [mode, setMode] = useState('list');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFriends = async () => {
    try {
      const res = await api.getFriends();
      setFriends(res.friends);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadFriends(); }, []));

  const handleAddByPhone = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.addFriendByPhone(phone.trim());
      setPhone('');
      setMode('list');
      await loadFriends();
    } catch (e) {
      setError(e.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id, name) => {
    Alert.alert('Remove Friend', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { try { await api.removeFriend(id); await loadFriends(); } catch {} }
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="By Phone"
          variant={mode === 'addPhone' ? 'primary' : 'secondary'}
          icon={<Ionicons name="phone-portrait-outline" size={16} color={mode === 'addPhone' ? '#fff' : colors.textSecondary} />}
          onPress={() => setMode(mode === 'addPhone' ? 'list' : 'addPhone')}
          style={{ flex: 1 }}
        />
        <Button
          title="My QR Code"
          variant={mode === 'qr' ? 'primary' : 'secondary'}
          icon={<Ionicons name="qr-code-outline" size={16} color={mode === 'qr' ? '#fff' : colors.textSecondary} />}
          onPress={() => setMode(mode === 'qr' ? 'list' : 'qr')}
          style={{ flex: 1 }}
        />
      </View>

      {/* Add by Phone */}
      {mode === 'addPhone' && (
        <Card style={styles.addCard}>
          <Input
            label="Friend's Phone Number"
            placeholder="e.g. +1 555 0456"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Add Friend" onPress={handleAddByPhone} loading={loading} disabled={!phone.trim()} />
        </Card>
      )}

      {/* QR Code */}
      {mode === 'qr' && (
        <Card style={styles.qrCard}>
          <View style={styles.qrBox}>
            <Ionicons name="person-circle-outline" size={56} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.qrTitle}>{user?.name}</Text>
            <Text style={styles.qrSub}>{user?.phone}</Text>
            <View style={styles.qrCodeBox}>
              <Text style={styles.qrCodeText}>{user?.qrCode || `spliteasy:${user?._id}`}</Text>
            </View>
          </View>
          <Text style={styles.qrHint}>
            Share this code with friends. QR camera scanning coming in V2!
          </Text>
        </Card>
      )}

      {/* Friends List */}
      <Text style={styles.sectionTitle}>
        {friends.length > 0 ? `Friends (${friends.length})` : 'Friends'}
      </Text>

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={52} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>Add friends by phone number to start splitting expenses!</Text>
        </View>
      ) : (
        friends.map(friend => (
          <Card key={friend._id} onPress={() => handleRemove(friend._id, friend.name)} style={styles.row}>
            <Avatar name={friend.name} size={42} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.friendName}>{friend.name}</Text>
              {friend.phone && <Text style={styles.friendPhone}>{friend.phone}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Card>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: 60 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addCard: { marginBottom: 16 },
  qrCard: { alignItems: 'center', marginBottom: 16 },
  qrBox: { alignItems: 'center', padding: 24 },
  qrTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  qrSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  qrCodeBox: {
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  qrCodeText: { fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  qrHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  friendName: { fontSize: 15, fontWeight: '600', color: colors.text },
  friendPhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.primary, fontSize: 13, marginBottom: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
