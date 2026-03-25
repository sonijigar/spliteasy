import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Avatar, Card, Button, EmptyState } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import * as api from '../services/api';

export default function SettleScreen() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState({});

  const loadData = async () => {
    try {
      const [balRes, setRes] = await Promise.all([api.getBalances(), api.getSettlements()]);
      setBalances(balRes.balances);
      setSettlements(setRes.settlements);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleSettle = (balance) => {
    // If balance.amount < 0, the user owes this person
    // If balance.amount > 0, this person owes the user
    const youOwe = balance.amount < 0;
    const amount = Math.abs(balance.amount);
    const msg = youOwe
      ? `Pay ${balance.name} $${amount.toFixed(2)}?`
      : `Record that ${balance.name} paid you $${amount.toFixed(2)}?`;

    Alert.alert('Settle Up', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setLoading(prev => ({ ...prev, [balance.userId]: true }));
          try {
            if (youOwe) {
              await api.createSettlement(balance.userId, amount);
            } else {
              // The other person pays the user — record from their perspective
              // For simplicity in V1, we record it as a settlement from current user's side
              await api.createSettlement(balance.userId, -amount);
            }
            await loadData();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to settle');
          } finally {
            setLoading(prev => ({ ...prev, [balance.userId]: false }));
          }
        }
      },
    ]);
  };

  const owes = balances.filter(b => b.amount < 0);  // user owes them
  const owed = balances.filter(b => b.amount > 0);   // they owe user

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {balances.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title="All settled up!" subtitle="No pending balances. Time to celebrate!" />
      ) : (
        <>
          {/* You Owe */}
          {owes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You Owe</Text>
              {owes.map(b => (
                <Card key={b.userId}>
                  <View style={styles.row}>
                    <Avatar name={b.name} size={40} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.name}>{b.name}</Text>
                      <Text style={styles.sub}>You owe them</Text>
                    </View>
                    <Text style={[styles.amount, { color: colors.primary }]}>${Math.abs(b.amount).toFixed(2)}</Text>
                  </View>
                  <Button title="Settle Up" variant="secondary"
                    onPress={() => handleSettle(b)} loading={loading[b.userId]}
                    style={{ marginTop: 12 }} />
                </Card>
              ))}
            </View>
          )}

          {/* Owed to You */}
          {owed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owed to You</Text>
              {owed.map(b => (
                <Card key={b.userId}>
                  <View style={styles.row}>
                    <Avatar name={b.name} size={40} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.name}>{b.name}</Text>
                      <Text style={styles.sub}>Owes you</Text>
                    </View>
                    <Text style={[styles.amount, { color: colors.green }]}>${b.amount.toFixed(2)}</Text>
                  </View>
                  <Button title="Record Payment" variant="secondary"
                    onPress={() => handleSettle(b)} loading={loading[b.userId]}
                    style={{ marginTop: 12 }} />
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      {/* History */}
      {settlements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement History</Text>
          {settlements.map(s => (
            <Card key={s._id} style={[styles.row, { opacity: 0.6 }]}>
              <Text style={{ color: colors.green, fontSize: 16, marginRight: 12 }}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.text }}>
                  {s.from?._id === user?._id ? 'You' : s.from?.name} paid {s.to?._id === user?._id ? 'you' : s.to?.name}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {new Date(s.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.green, fontVariant: ['tabular-nums'] }}>
                ${Math.abs(s.amount).toFixed(2)}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
