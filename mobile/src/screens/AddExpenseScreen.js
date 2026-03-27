import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Avatar, Button, Input, Card } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

const CATEGORIES = [
  { key: 'food', icon: 'fast-food-outline', label: 'Food' },
  { key: 'transport', icon: 'car-outline', label: 'Transport' },
  { key: 'shopping', icon: 'bag-outline', label: 'Shopping' },
  { key: 'entertainment', icon: 'film-outline', label: 'Fun' },
  { key: 'rent', icon: 'home-outline', label: 'Rent' },
  { key: 'other', icon: 'ellipsis-horizontal-outline', label: 'Other' },
];

const SPLIT_TYPES = [
  { key: 'equal', label: 'Equal' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'exact', label: 'Exact' },
  { key: 'shares', label: 'Shares' },
];

export default function AddExpenseScreen({ navigation }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [paidBy, setPaidBy] = useState(user?._id);
  const [splitWith, setSplitWith] = useState([user?._id]);
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFriends().then(res => setFriends(res.friends)).catch(() => {});
  }, []);

  const allPeople = [{ _id: user?._id, name: user?.name }, ...friends];

  const toggleSplit = (id) => {
    setSplitWith(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        const nextCustom = { ...customSplits };
        delete nextCustom[id];
        setCustomSplits(nextCustom);
        return next;
      }
      return [...prev, id];
    });
  };

  const updateCustomSplit = (userId, field, value) => {
    setCustomSplits(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const getSplitFieldLabel = () => {
    if (splitType === 'percentage') return '%';
    if (splitType === 'shares') return 'shares';
    if (splitType === 'exact') return '$';
    return '';
  };

  const getSplitFieldKey = () => {
    if (splitType === 'percentage') return 'percentage';
    if (splitType === 'shares') return 'shares';
    if (splitType === 'exact') return 'amount';
    return null;
  };

  const validateCustomSplits = () => {
    if (splitType === 'equal') return true;
    const fieldKey = getSplitFieldKey();
    const totalAmount = parseFloat(amount);

    for (const userId of splitWith) {
      const val = parseFloat(customSplits[userId]?.[fieldKey] || '0');
      if (isNaN(val) || val <= 0) return false;
    }

    if (splitType === 'percentage') {
      const total = splitWith.reduce((sum, uid) => sum + parseFloat(customSplits[uid]?.percentage || '0'), 0);
      return Math.abs(total - 100) <= 0.01;
    }
    if (splitType === 'exact') {
      const total = splitWith.reduce((sum, uid) => sum + parseFloat(customSplits[uid]?.amount || '0'), 0);
      return Math.abs(total - totalAmount) <= 0.01;
    }
    if (splitType === 'shares') {
      const total = splitWith.reduce((sum, uid) => sum + parseFloat(customSplits[uid]?.shares || '0'), 0);
      return total > 0;
    }
    return true;
  };

  const getCustomSplitsArray = () => {
    const fieldKey = getSplitFieldKey();
    return splitWith.map(userId => ({
      userId,
      [fieldKey]: parseFloat(customSplits[userId]?.[fieldKey] || '0')
    }));
  };

  const getValidationError = () => {
    if (splitType === 'equal') return null;
    const fieldKey = getSplitFieldKey();
    for (const userId of splitWith) {
      const val = parseFloat(customSplits[userId]?.[fieldKey] || '0');
      if (isNaN(val) || val <= 0) return 'All participants must have a value greater than zero';
    }
    if (splitType === 'percentage') {
      const total = splitWith.reduce((sum, uid) => sum + parseFloat(customSplits[uid]?.percentage || '0'), 0);
      if (Math.abs(total - 100) > 0.01) return `Percentages must sum to 100% (currently ${total.toFixed(1)}%)`;
    }
    if (splitType === 'exact') {
      const total = splitWith.reduce((sum, uid) => sum + parseFloat(customSplits[uid]?.amount || '0'), 0);
      const totalAmount = parseFloat(amount);
      if (Math.abs(total - totalAmount) > 0.01) return `Exact amounts must sum to $${totalAmount.toFixed(2)} (currently $${total.toFixed(2)})`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || splitWith.length === 0) {
      setError('Please fill in all fields');
      return;
    }
    const splitError = getValidationError();
    if (splitError) {
      setError(splitError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const splitsPayload = splitType !== 'equal' ? getCustomSplitsArray() : undefined;
      await api.createExpense(description.trim(), parseFloat(amount), category, paidBy, splitWith, splitType, splitsPayload);
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const splitAmount = amount && splitWith.length > 0 ? (parseFloat(amount) / splitWith.length).toFixed(2) : '0.00';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Big Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <Input label="Description" placeholder="e.g. Dinner at Olive Garden" value={description} onChangeText={setDescription} />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key} onPress={() => setCategory(cat.key)}
              style={[styles.chip, category === cat.key && styles.chipActive]}>
              <Ionicons name={cat.icon} size={14} color={category === cat.key ? colors.primary : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, color: category === cat.key ? colors.primary : colors.text }}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Paid By */}
        <Text style={styles.label}>Paid by</Text>
        <View style={styles.chipRow}>
          {allPeople.map(p => (
            <TouchableOpacity key={p._id} onPress={() => setPaidBy(p._id)}
              style={[styles.chip, paidBy === p._id && styles.chipActive]}>
              <Text style={{ fontSize: 14, color: paidBy === p._id ? colors.primary : colors.textSecondary }}>
                {p._id === user?._id ? 'You' : p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split Type */}
        <Text style={styles.label}>Split Type</Text>
        <View style={styles.chipRow}>
          {SPLIT_TYPES.map(st => (
            <TouchableOpacity key={st.key} onPress={() => setSplitType(st.key)}
              style={[styles.chip, splitType === st.key && styles.chipActive]}>
              <Text style={{ fontSize: 14, color: splitType === st.key ? colors.primary : colors.textSecondary }}>
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split With */}
        <Text style={styles.label}>
          {splitType === 'equal'
            ? `Split equally with (${splitWith.length} selected)`
            : `Split with (${splitWith.length} selected)`}
        </Text>
        {allPeople.map(p => {
          const selected = splitWith.includes(p._id);
          const fieldKey = getSplitFieldKey();
          const fieldLabel = getSplitFieldLabel();
          const customVal = customSplits[p._id]?.[fieldKey] || '';

          return (
            <Card key={p._id} onPress={() => toggleSplit(p._id)}
              style={[styles.splitCard, selected && styles.splitCardActive]}>
              <Avatar name={p.name} size={32} />
              <Text style={[styles.splitName, { flex: 1, marginLeft: 12 }]}>
                {p._id === user?._id ? 'You' : p.name}
              </Text>
              {selected && splitType === 'equal' && (
                <Text style={styles.splitAmount}>${splitAmount}</Text>
              )}
              {selected && splitType !== 'equal' && (
                <View style={styles.customSplitRow}>
                  {splitType === 'exact' && <Text style={styles.splitFieldPrefix}>$</Text>}
                  <TextInput
                    testID={`custom-split-${p._id}`}
                    style={styles.splitInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={customVal}
                    onChangeText={(val) => updateCustomSplit(p._id, fieldKey, val)}
                    onStartShouldSetResponder={() => true}
                  />
                  {splitType !== 'exact' && <Text style={styles.splitFieldSuffix}>{fieldLabel}</Text>}
                </View>
              )}
              {selected && <Text style={{ color: colors.primary, fontSize: 18, marginLeft: 8 }}>✓</Text>}
            </Card>
          );
        })}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Add Expense" onPress={handleSubmit} loading={loading}
          disabled={!description.trim() || !amount || splitWith.length === 0}
          style={{ marginTop: 16, marginBottom: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: 16 },
  amountSection: { alignItems: 'center', paddingVertical: 20 },
  amountLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  dollar: { fontSize: 40, fontWeight: '700', color: colors.textMuted, marginRight: 4 },
  amountInput: { fontSize: 48, fontWeight: '700', color: colors.text, minWidth: 120, textAlign: 'center', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: 'rgba(232,80,91,0.15)', borderColor: colors.primary },
  splitCard: { flexDirection: 'row', alignItems: 'center' },
  splitCardActive: { borderColor: 'rgba(232,80,91,0.3)', backgroundColor: 'rgba(232,80,91,0.06)' },
  splitName: { fontSize: 14, color: colors.text },
  splitAmount: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  customSplitRow: { flexDirection: 'row', alignItems: 'center' },
  splitInput: {
    fontSize: 14,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minWidth: 50,
    textAlign: 'right',
    paddingVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  splitFieldPrefix: { fontSize: 13, color: colors.textSecondary, marginRight: 2 },
  splitFieldSuffix: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
  error: { color: colors.primary, fontSize: 13, textAlign: 'center', marginTop: 8 },
});
