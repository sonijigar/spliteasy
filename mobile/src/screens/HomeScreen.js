import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Avatar, Card, Button, EmptyState } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

const CATEGORY_ICONS = {
  food: 'fast-food-outline',
  transport: 'car-outline',
  shopping: 'bag-outline',
  entertainment: 'film-outline',
  rent: 'home-outline',
  utilities: 'flash-outline',
  other: 'ellipsis-horizontal-outline',
};

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ balances: [], summary: { totalOwedToYou: 0, totalYouOwe: 0, netBalance: 0 } });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [expRes, balRes] = await Promise.all([api.getExpenses(), api.getBalances()]);
      setExpenses(expRes.expenses);
      setBalances(balRes);
    } catch (e) {
      console.warn('Failed to load data:', e.message);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.deleteExpense(id); await loadData(); } catch {}
        }
      },
    ]);
  };

  const { summary } = balances;
  const net = summary.netBalance;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Avatar name={user?.name || '?'} size={42} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceBubble1} />
        <View style={styles.balanceBubble2} />
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <Text style={styles.balanceAmount}>${Math.abs(net).toFixed(2)}</Text>
        <Text style={styles.balanceSub}>{net >= 0 ? 'You are owed overall' : 'You owe overall'}</Text>

        <View style={styles.balanceRow}>
          <View style={styles.balancePill}>
            <Text style={styles.pillLabel}>You owe</Text>
            <Text style={styles.pillValue}>${summary.totalYouOwe.toFixed(2)}</Text>
          </View>
          <View style={styles.balancePill}>
            <Text style={styles.pillLabel}>Owed to you</Text>
            <Text style={styles.pillValue}>${summary.totalOwedToYou.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Button title="Add Expense" variant="secondary" onPress={() => navigation.navigate('AddExpense')} style={{ flex: 1 }} />
        <Button title="Add Friend" variant="secondary" onPress={() => navigation.navigate('Friends')} style={{ flex: 1 }} />
      </View>

      {/* Individual Balances */}
      {balances.balances.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balances</Text>
          {balances.balances.map((b, i) => (
            <Card key={i} style={styles.row}>
              <Avatar name={b.name} size={36} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowName}>{b.name}</Text>
                <Text style={styles.rowSub}>{b.amount > 0 ? 'owes you' : 'you owe'}</Text>
              </View>
              <Text style={[styles.rowAmount, { color: b.amount > 0 ? colors.green : colors.primary }]}>
                ${Math.abs(b.amount).toFixed(2)}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {expenses.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No expenses yet" subtitle="Add your first expense to start splitting!" />
        ) : (
          expenses.slice(0, 10).map((exp) => {
            const iconName = CATEGORY_ICONS[exp.category] || 'ellipsis-horizontal-outline';
            return (
              <Card key={exp._id} onPress={() => handleDelete(exp._id)} style={styles.row}>
                <View style={styles.expIcon}>
                  <Ionicons name={iconName} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowName}>{exp.description}</Text>
                  <Text style={styles.rowSub}>
                    Paid by {exp.paidBy?.name || 'Unknown'} · Split {exp.splitWith.length} ways
                  </Text>
                </View>
                <Text style={styles.rowAmount}>${exp.amount.toFixed(2)}</Text>
              </Card>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 60 },
  greeting: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  balanceCard: {
    marginHorizontal: spacing.lg, borderRadius: radius.xl, padding: spacing.lg,
    backgroundColor: colors.primary, overflow: 'hidden',
  },
  balanceBubble1: { position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  balanceBubble2: { position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'], marginVertical: 4 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  balancePill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10 },
  pillLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  pillValue: { fontSize: 16, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'], marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, marginTop: 20, marginBottom: 8 },
  section: { paddingHorizontal: spacing.lg, marginTop: 16 },
  sectionTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  expIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(232,80,91,0.12)', alignItems: 'center', justifyContent: 'center' },
});
