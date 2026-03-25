import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Avatar, Card, Button, EmptyState, Input } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

export default function GroupsScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadGroups = async () => {
    try {
      const res = await api.getGroups();
      setGroups(res.groups);
    } catch (e) {
      console.warn('Failed to load groups:', e.message);
    }
  };

  useFocusEffect(useCallback(() => { loadGroups(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateError('Group name is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await api.createGroup({ name: groupName.trim(), description: groupDescription.trim() || undefined });
      setGroupName('');
      setGroupDescription('');
      setShowCreate(false);
      await loadGroups();
    } catch (e) {
      setCreateError(e.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDismissCreate = () => {
    setShowCreate(false);
    setGroupName('');
    setGroupDescription('');
    setCreateError('');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Groups</Text>
            <Text style={styles.subtitle}>Trips, households & shared expenses</Text>
          </View>
          <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn} testID="create-group-button">
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <View style={styles.section}>
          {groups.length === 0 ? (
            <EmptyState
              emoji="🏕️"
              title="No groups yet"
              subtitle="Create a group for a trip, household, or any shared expense!"
            />
          ) : (
            groups.map((group) => (
              <Card
                key={group._id}
                testID={`group-card-${group._id}`}
                onPress={() => navigation.navigate('GroupDetail', { groupId: group._id, groupName: group.name })}
                style={styles.groupCard}
              >
                <View style={styles.groupIcon}>
                  <Text style={{ fontSize: 22 }}>🏕️</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  {group.description ? (
                    <Text style={styles.groupDesc} numberOfLines={1}>{group.description}</Text>
                  ) : null}
                  <Text style={styles.groupMeta}>
                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                <View style={styles.memberAvatars}>
                  {group.members.slice(0, 3).map((member, i) => (
                    <View key={member._id} style={[styles.avatarWrap, { zIndex: 3 - i, marginLeft: i > 0 ? -8 : 0 }]}>
                      <Avatar name={member.name} size={28} />
                    </View>
                  ))}
                  {group.members.length > 3 && (
                    <View style={[styles.avatarWrap, { marginLeft: -8 }]}>
                      <View style={styles.moreAvatar}>
                        <Text style={styles.moreAvatarText}>+{group.members.length - 3}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={handleDismissCreate}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleDismissCreate} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create Group</Text>

            <Input
              label="Group Name"
              placeholder="e.g. Road Trip 2024, Apartment"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />

            <Input
              label="Description (optional)"
              placeholder="What is this group for?"
              value={groupDescription}
              onChangeText={setGroupDescription}
            />

            {createError ? <Text style={styles.error}>{createError}</Text> : null}

            <Button
              title="Create Group"
              onPress={handleCreateGroup}
              loading={creating}
              disabled={!groupName.trim()}
              style={{ marginTop: 8 }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleDismissCreate}
              style={{ marginTop: 10 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 16
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { paddingHorizontal: spacing.lg },
  groupCard: { flexDirection: 'row', alignItems: 'center' },
  groupIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(232,80,91,0.12)',
    alignItems: 'center', justifyContent: 'center'
  },
  groupName: { fontSize: 15, fontWeight: '600', color: colors.text },
  groupDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  groupMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  memberAvatars: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderWidth: 2, borderColor: colors.bgCard, borderRadius: 14 },
  moreAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgCardHover,
    alignItems: 'center', justifyContent: 'center'
  },
  moreAvatarText: { fontSize: 9, color: colors.textSecondary, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
  error: { color: colors.primary, fontSize: 13, marginBottom: 8 },
});
