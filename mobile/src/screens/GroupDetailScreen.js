import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Avatar, Card, Button, EmptyState } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

const CATEGORY_EMOJIS = {
  food: '🍕', transport: '🚗', shopping: '🛍️',
  entertainment: '🎬', rent: '🏠', utilities: '💡', other: '💰'
};

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadGroup = async () => {
    try {
      const res = await api.getGroup(groupId);
      setGroup(res.group);
      setExpenses(res.expenses || []);
      setBalances(res.balances || []);
    } catch (e) {
      console.warn('Failed to load group:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadGroup(); }, [groupId]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroup();
    setRefreshing(false);
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { groupId, groupName });
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGroup(groupId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete group');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Loading...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <EmptyState emoji="❌" title="Group not found" subtitle="This group may have been deleted." />
      </View>
    );
  }

  const isCreator = group.createdBy?._id === user?._id || group.createdBy === user?._id;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Group Header */}
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Text style={{ fontSize: 32 }}>🏕️</Text>
        </View>
        <Text style={styles.groupName}>{group.name}</Text>
        {group.description ? (
          <Text style={styles.groupDesc}>{group.description}</Text>
        ) : null}
        <Text style={styles.groupMeta}>{group.members.length} members</Text>
      </View>

      {/* Add Expense Button */}
      <View style={styles.actions}>
        <Button
          title="Add Expense"
          onPress={handleAddExpense}
          style={{ flex: 1 }}
        />
      </View>

      {/* Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.membersRow}>
            {group.members.map((member) => (
              <View key={member._id} style={styles.memberItem}>
                <Avatar name={member.name} size={40} />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member._id === user?._id ? 'You' : member.name}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Balances */}
      {balances.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who Owes Whom</Text>
          {balances.map((b, i) => (
            <Card key={i} style={styles.balanceRow}>
              <Avatar name={b.from?.name || '?'} size={32} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.balanceText}>
                  <Text style={{ color: colors.primary }}>{b.from?._id === user?._id ? 'You' : b.from?.name}</Text>
                  {' owes '}
                  <Text style={{ color: colors.green }}>{b.to?._id === user?._id ? 'You' : b.to?.name}</Text>
                </Text>
              </View>
              <Text style={styles.balanceAmount}>${b.amount?.toFixed(2)}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="No expenses yet"
            subtitle="Add the first expense for this group!"
          />
        ) : (
          expenses.map((exp) => (
            <Card key={exp._id} style={styles.expenseRow}>
              <View style={styles.expIcon}>
                <Text style={{ fontSize: 18 }}>{CATEGORY_EMOJIS[exp.category] || '💰'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.expName}>{exp.description}</Text>
                <Text style={styles.expMeta}>
                  Paid by {exp.paidBy?._id === user?._id ? 'You' : exp.paidBy?.name} · {exp.splitWith.length} people
                </Text>
              </View>
              <Text style={styles.expAmount}>${exp.amount?.toFixed(2)}</Text>
            </Card>
          ))
        )}
      </View>

      {/* Delete Group (creator only) */}
      {isCreator && (
        <View style={[styles.section, { marginBottom: 40 }]}>
          <TouchableOpacity onPress={handleDeleteGroup} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete Group</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  groupHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: spacing.lg },
  groupIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(232,80,91,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12
  },
  groupName: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  groupDesc: { fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  groupMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  actions: { paddingHorizontal: spacing.lg, marginBottom: 8 },
  section: { paddingHorizontal: spacing.lg, marginTop: 16 },
  sectionTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  membersRow: { flexDirection: 'row', gap: 16, paddingBottom: 4 },
  memberItem: { alignItems: 'center', width: 56 },
  memberName: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceText: { fontSize: 14, color: colors.text },
  balanceAmount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  expenseRow: { flexDirection: 'row', alignItems: 'center' },
  expIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(232,80,91,0.12)',
    alignItems: 'center', justifyContent: 'center'
  },
  expName: { fontSize: 14, fontWeight: '600', color: colors.text },
  expMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  expAmount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  deleteBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(232,80,91,0.3)',
    borderRadius: radius.md
  },
  deleteBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
