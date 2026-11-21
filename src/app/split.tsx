import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { RefreshScrollView } from '@/components/ui/RefreshScrollView';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SharedMember {
  id: string;
  group_id: string;
  name: string;
  share_pct: number;
  is_me: boolean;
  color: string;
  member_user_id: string | null;
  invited_email: string | null;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SharedGroup {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  shared_members: SharedMember[];
  shared_expenses: { amount: number; paid_by_member_id: string | null }[];
}

interface MemberForm {
  id?: string;
  name: string;
  share: string;
  is_me: boolean;
  color: string;
  email: string;
  status?: 'pending' | 'accepted' | 'rejected';
  linked: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6',
];

const GROUP_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#06b6d4', '#6366f1',
];

const GROUP_ICONS: import('@/components/ui/Icon').IconName[] = [
  'Users', 'Home', 'Plane', 'Car', 'Utensils', 'Coffee',
  'ShoppingCart', 'Music', 'Gamepad2', 'Dumbbell',
  'GraduationCap', 'Briefcase', 'Heart', 'Star', 'Gift',
  'Dog', 'Cat', 'Tent', 'Sailboat', 'Mountain',
];

const ACTION_WIDTH = 72;
const SNAP_THRESHOLD = ACTION_WIDTH;

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Balance helpers ────────────────────────────────────────────────────────────

// In a group someone else owns, "me" is the member linked to my account —
// is_me belongs to whoever created the group.
function findMe(group: SharedGroup, userId: string) {
  return group.shared_members.find(m => m.member_user_id === userId)
    ?? (group.user_id === userId ? group.shared_members.find(m => m.is_me) : undefined);
}

function getMyBalance(group: SharedGroup, userId: string): number {
  const me = findMe(group, userId);
  if (!me) return 0;
  let paid = 0;
  let owed = 0;
  for (const exp of group.shared_expenses) {
    if (exp.paid_by_member_id === me.id) paid += Number(exp.amount);
    owed += (me.share_pct / 100) * Number(exp.amount);
  }
  return paid - owed;
}

function fmtCOP(n: number): string {
  return Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

// ── SwipeableRow ──────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  children: React.ReactNode;
  editLabel: string;
  deleteLabel: string;
  editColor: string;
  editTextColor?: string;
  deleteColor: string;
  cardColor: string;
  separatorColor?: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeableRow({
  children, editLabel, deleteLabel,
  editColor, editTextColor = '#fff', deleteColor, cardColor, separatorColor,
  onEdit, onDelete,
}: SwipeableRowProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 })
      .start(() => { isOpen.current = false; });
  }, [translateX]);

  const open = useCallback(() => {
    Animated.spring(translateX, { toValue: -(ACTION_WIDTH * 2), useNativeDriver: true, bounciness: 4 })
      .start(() => { isOpen.current = true; });
  }, [translateX]);

  const onMove = useCallback((_: unknown, { dx }: { dx: number }) => {
    const base = isOpen.current ? -(ACTION_WIDTH * 2) : 0;
    translateX.setValue(Math.max(-(ACTION_WIDTH * 2), Math.min(0, base + dx)));
  }, [translateX]);

  const onRelease = useCallback((_: unknown, { dx, vx }: { dx: number; vx: number }) => {
    const base = isOpen.current ? -(ACTION_WIDTH * 2) : 0;
    const moved = base + dx;
    if (!isOpen.current) {
      if (moved < -SNAP_THRESHOLD || vx < -0.5) { open(); } else { close(); }
    } else {
      if (moved > -(ACTION_WIDTH * 2 - SNAP_THRESHOLD) || vx > 0.5) { close(); } else { open(); }
    }
  }, [open, close]);

  // eslint-disable-next-line react-hooks/refs
  const panHandlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy),
    onPanResponderMove: onMove,
    onPanResponderRelease: onRelease,
  }).panHandlers, [onMove, onRelease]);

  return (
    <View style={[
      { overflow: 'hidden', backgroundColor: cardColor },
      separatorColor ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separatorColor } : undefined,
    ]}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' }}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: editColor, width: ACTION_WIDTH }]}
          onPress={() => { close(); onEdit(); }}
          activeOpacity={0.85}>
          <EditIcon color={editTextColor} />
          <Text style={{ color: editTextColor, fontSize: 11, marginTop: 3, fontWeight: '600' }}>{editLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: deleteColor, width: ACTION_WIDTH }]}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.85}>
          <TrashIcon color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, marginTop: 3, fontWeight: '600' }}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[{ backgroundColor: cardColor }, { transform: [{ translateX }] }]} {...panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SplitSkeleton() {
  return (
    <View style={{ gap: Spacing.sm }}>
      {[1, 2, 3].map(i => (
        <Card key={i} radius={Spacing.radius.lg} padding={0}>
          <View style={{ padding: Spacing.md, gap: 8 }}>
            <Skeleton width={140} height={16} radius={4} />
            <Skeleton width={100} height={12} radius={4} />
            <Skeleton width={80} height={20} radius={10} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── GroupSheet ────────────────────────────────────────────────────────────────

interface GroupSheetProps {
  visible: boolean;
  editing: SharedGroup | null;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  userEmail: string;
}

function GroupSheet({ visible, editing, onClose, onSaved, userId, userEmail }: GroupSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const translateY = useMemo(() => new Animated.Value(600), []);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, translateY]);

  function dismiss() {
    Animated.timing(translateY, { toValue: 600, duration: 280, useNativeDriver: true }).start(onClose);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 150 || g.vy > 0.5) {
        Animated.timing(translateY, { toValue: 600, duration: 280, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });
  const [name, setName] = useState('');
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [groupIcon, setGroupIcon] = useState<import('@/components/ui/Icon').IconName>('Users');
  const [members, setMembers] = useState<MemberForm[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    if (editing) {
      setName(editing.name);
      setGroupColor(editing.color ?? GROUP_COLORS[0]);
      setGroupIcon((editing.icon as import('@/components/ui/Icon').IconName | null) ?? 'Users');
      setMembers(editing.shared_members.map(m => ({
        id: m.id,
        name: m.name,
        share: String(m.share_pct),
        is_me: m.is_me,
        color: m.color,
        email: m.invited_email ?? '',
        status: m.status,
        linked: !!m.member_user_id || !!m.invited_email,
      })));
      setRemovedIds([]);
    } else {
      setName('');
      setGroupColor(GROUP_COLORS[0]);
      setGroupIcon('Users');
      setMembers([{ name: 'Yo', share: '100', is_me: true, color: MEMBER_COLORS[0], email: '', linked: false }]);
      setRemovedIds([]);
    }
    setError('');
    setSaving(false);
  }, [editing]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (visible) reset(); }, [visible, reset]);

  const addMember = () => {
    const usedColors = members.map(m => m.color);
    const nextColor = MEMBER_COLORS.find(c => !usedColors.includes(c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    setMembers(prev => {
      const newList = [...prev, { name: '', share: '', is_me: false, color: nextColor, email: '', linked: false }];
      const count = newList.length;
      const each = Math.floor(100 / count);
      const rem = 100 - each * count;
      return newList.map((m, i) => ({ ...m, share: String(i === 0 ? each + rem : each) }));
    });
  };

  const removeMember = (idx: number) => {
    const m = members[idx];
    if (m.id) setRemovedIds(prev => [...prev, m.id!]);
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, patch: Partial<MemberForm>) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };

  const cycleColor = (idx: number) => {
    const cur = MEMBER_COLORS.indexOf(members[idx].color);
    updateMember(idx, { color: MEMBER_COLORS[(cur + 1) % MEMBER_COLORS.length] });
  };

  const setIsMe = (idx: number) => {
    setMembers(prev => prev.map((m, i) => ({ ...m, is_me: i === idx })));
  };

  const splitEqually = () => {
    if (!members.length) return;
    const each = Math.floor(100 / members.length);
    const rem = 100 - each * members.length;
    setMembers(prev => prev.map((m, i) => ({ ...m, share: String(i === 0 ? each + rem : each) })));
  };

  const save = async () => {
    setError('');
    const trimName = name.trim();
    if (!trimName) { setError(t('split.group.error.nameRequired')); return; }
    if (!members.length) { setError(t('split.group.error.noMembers')); return; }
    if (!members.some(m => !m.is_me)) { setError(t('split.group.error.noOtherMembers')); return; }
    for (const m of members) {
      if (!m.name.trim()) { setError(t('split.group.error.memberName')); return; }
      const pct = parseFloat(m.share);
      if (isNaN(pct) || pct <= 0 || pct > 100) { setError(t('split.group.error.memberShare')); return; }
      const mail = m.email.trim();
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        setError(t('split.group.error.email')); return;
      }
      if (!m.is_me && mail && mail.toLowerCase() === userEmail.toLowerCase()) {
        setError(t('split.group.error.selfInvite')); return;
      }
    }
    const total = members.reduce((s, m) => s + parseFloat(m.share), 0);
    if (Math.abs(total - 100) > 1) { setError(t('split.group.error.shareSum')); return; }

    setSaving(true);
    try {
      let groupId = editing?.id;
      if (editing) {
        const res = await supabase.from('shared_groups').update({ name: trimName, color: groupColor, icon: groupIcon }).eq('id', editing.id);
        if (res.error) throw res.error;
      } else {
        const { data, error: err } = await supabase.from('shared_groups').insert({ user_id: userId, name: trimName, color: groupColor, icon: groupIcon }).select('id').single();
        if (err) throw err;
        groupId = data.id;
      }

      if (removedIds.length) {
        const res = await supabase.from('shared_members').delete().in('id', removedIds);
        if (res.error) throw res.error;
      }

      // An email turns a member into an invitation.  If the address already
      // belongs to a user we link and notify them now; otherwise it waits in
      // invited_email until they sign up and claim it.
      const applyInvite = async (payload: Record<string, unknown>, email: string) => {
        const { data: uid, error } = await supabase.rpc('get_user_id_by_email', { p_email: email });
        if (error) throw error;
        const invitedUserId = (uid as string | null) ?? null;
        payload.status = 'pending';
        if (invitedUserId) payload.member_user_id = invitedUserId;
        else payload.invited_email = email;
        return invitedUserId;
      };

      const notify = async (userId: string, memberId: string) => {
        const { error } = await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_type: 'group_invite',
          p_title: t('split.invite.notifTitle'),
          p_body: t('split.invite.notifBody', { group: trimName }),
          p_data: { group_id: groupId, group_name: trimName, member_id: memberId },
        });
        if (error) throw error;
      };

      for (const m of members) {
        const payload: Record<string, unknown> = {
          group_id: groupId!,
          name: m.name.trim(),
          share_pct: parseFloat(m.share),
          is_me: m.is_me,
          color: m.color,
        };

        const email = m.is_me ? '' : m.email.trim().toLowerCase();
        const invitedUserId = email && !m.linked ? await applyInvite(payload, email) : null;

        if (m.id) {
          const { error } = await supabase.from('shared_members').update(payload).eq('id', m.id);
          if (error) throw error;
          if (invitedUserId) await notify(invitedUserId, m.id);
        } else {
          const { data, error } = await supabase
            .from('shared_members').insert(payload).select('id').single();
          if (error) throw error;
          if (invitedUserId) await notify(invitedUserId, data.id);
        }
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e ? String((e as {message: unknown}).message) : JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, {
    backgroundColor: colors.fillPrimary,
    color: colors.label,
    borderColor: colors.separator,
  }];

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={dismiss} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.fillPrimary }]} {...panResponder.panHandlers} />
          <Text variant="title3" style={{ marginBottom: Spacing.md, fontWeight: '700' }}>
            {editing ? t('split.editGroup') : t('split.addGroup')}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="caption1" color={colors.labelSecondary} style={styles.fieldLabel}>
              {t('split.group.name').toUpperCase()}
            </Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder={t('split.group.namePh')}
              placeholderTextColor={colors.labelTertiary}
              maxLength={40}
            />

            {/* Color picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
              {t('split.group.color').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm }}>
              {GROUP_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setGroupColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    groupColor === c && { borderWidth: 3, borderColor: '#fff', shadowColor: c, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
                  ]}
                />
              ))}
            </View>

            {/* Icon picker */}
            <Text variant="caption1" color={colors.labelSecondary} style={[styles.fieldLabel, { marginTop: Spacing.xs }]}>
              {t('split.group.icon').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm }}>
              {GROUP_ICONS.map(iconName => (
                <TouchableOpacity
                  key={iconName}
                  onPress={() => setGroupIcon(iconName)}
                  style={[
                    styles.iconBtn,
                    groupIcon === iconName && { backgroundColor: groupColor + '33', borderColor: groupColor, borderWidth: 2 },
                    groupIcon !== iconName && { backgroundColor: colors.fillPrimary },
                  ]}
                >
                  <Icon name={iconName} size={20} color={groupIcon === iconName ? groupColor : colors.labelSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.xs }}>
              <Text variant="caption1" color={colors.labelSecondary} style={{ flex: 1, textTransform: 'uppercase', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
                {t('split.group.members')}
              </Text>
              <TouchableOpacity onPress={splitEqually}>
                <Text variant="caption1" color={colors.tint} style={{ fontWeight: '600' }}>{t('split.group.dividir')}</Text>
              </TouchableOpacity>
            </View>

            {members.map((m, idx) => (
              <View key={idx} style={[styles.memberBlock, { borderColor: colors.separator }]}>
              <View style={styles.memberRow}>
                <TouchableOpacity onPress={() => cycleColor(idx)} hitSlop={8}>
                  <View style={[styles.colorDot, { backgroundColor: m.color }]} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.memberName, { color: colors.label, borderBottomColor: colors.separator }]}
                  value={m.name}
                  onChangeText={v => updateMember(idx, { name: v })}
                  placeholder={t('split.group.memberNamePh')}
                  placeholderTextColor={colors.labelTertiary}
                  maxLength={25}
                />
                <TextInput
                  style={[styles.memberShare, { color: colors.label, borderBottomColor: colors.separator }]}
                  value={m.share}
                  onChangeText={v => updateMember(idx, { share: v })}
                  placeholder="50"
                  placeholderTextColor={colors.labelTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text variant="caption1" color={colors.labelSecondary} style={{ marginRight: Spacing.xs }}>%</Text>
                <TouchableOpacity onPress={() => setIsMe(idx)} style={[styles.meBtn, {
                  backgroundColor: m.is_me ? colors.tint + '20' : colors.fillPrimary,
                  borderColor: m.is_me ? colors.tint : colors.separator,
                }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: m.is_me ? colors.tint : colors.labelTertiary }}>YO</Text>
                </TouchableOpacity>
                {members.length > 1 && (
                  <TouchableOpacity onPress={() => removeMember(idx)} hitSlop={8} style={{ marginLeft: Spacing.xs }}>
                    <Text style={{ fontSize: 18, color: colors.expense, lineHeight: 20 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!m.is_me && (
                m.linked ? (
                  <View style={styles.inviteStatusRow}>
                    <View style={[styles.statusChip, {
                      backgroundColor: m.status === 'accepted' ? colors.income + '18'
                        : m.status === 'rejected' ? colors.expense + '18'
                        : colors.tint + '18',
                    }]}>
                      <Text style={{
                        fontSize: 11, fontWeight: '700',
                        color: m.status === 'accepted' ? colors.income
                          : m.status === 'rejected' ? colors.expense
                          : colors.tint,
                      }}>
                        {m.status === 'accepted' ? t('split.invite.accepted')
                          : m.status === 'rejected' ? t('split.invite.rejected')
                          : t('split.invite.pending')}
                      </Text>
                    </View>
                    {!!m.email && (
                      <Text variant="caption2" color={colors.labelTertiary} numberOfLines={1} style={{ flex: 1 }}>
                        {m.email}
                      </Text>
                    )}
                  </View>
                ) : (
                  <TextInput
                    style={[styles.emailInput, { color: colors.label, borderColor: colors.separator }]}
                    value={m.email}
                    onChangeText={v => updateMember(idx, { email: v })}
                    placeholder={t('split.invite.emailPh')}
                    placeholderTextColor={colors.labelTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )
              )}
              </View>
            ))}

            <TouchableOpacity style={[styles.addMemberBtn, { borderColor: colors.separator }]} onPress={addMember}>
              <Text variant="caption1" color={colors.tint} style={{ fontWeight: '600' }}>+ {t('split.group.addMember')}</Text>
            </TouchableOpacity>

            {!!error && (
              <Text variant="caption1" color={colors.expense} style={{ marginTop: Spacing.sm }}>{error}</Text>
            )}
            <View style={{ height: Spacing.md }} />
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}>
            <Text variant="callout" color={colors.tintForeground} style={{ fontWeight: '700' }}>
              {saving ? '...' : editing ? t('split.group.update') : t('split.group.save')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SplitScreen() {
  const { t } = useTranslation();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SharedGroup | null>(null);
  const [deleting, setDeleting] = useState<SharedGroup | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // No user_id filter: RLS returns both the groups I own and the ones I was
    // invited to and accepted.
    const { data } = await supabase
      .from('shared_groups')
      .select('*, shared_members(*), shared_expenses(amount, paid_by_member_id)')
      .order('created_at', { ascending: false });
    setGroups((data ?? []) as SharedGroup[]);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalPending = useMemo(() => {
    return groups.reduce((s, g) => {
      const bal = getMyBalance(g, user?.id ?? '');
      return s + (bal > 0 ? bal : 0);
    }, 0);
  }, [groups, user]);

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.from('shared_groups').delete().eq('id', deleting.id);
    setDeleting(null);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGrouped }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <BackIcon color={colors.label} />
          </TouchableOpacity>
          <Text variant="title3" style={{ fontWeight: '700' }}>{t('split.title')}</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <SplitSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGrouped }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="title3" style={{ fontWeight: '700' }}>{t('split.title')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => { setEditing(null); setSheetOpen(true); }}
          hitSlop={8}>
          <PlusIcon color={colors.tintForeground} />
        </TouchableOpacity>
      </View>

      <RefreshScrollView onRefresh={load} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {groups.length > 0 && totalPending > 0 && (
          <Card radius={Spacing.radius.lg} style={[styles.summaryCard, { backgroundColor: colors.tint + '12' }]}>
            <Text variant="caption1" color={colors.tint} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              {t('split.totalPending')}
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.tint }}>
              ${fmtCOP(totalPending)}{' '}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.tint + 'AA' }}>COP</Text>
            </Text>
            <Text variant="caption1" color={colors.labelSecondary} style={{ marginTop: 2 }}>
              {groups.length} {t('split.activeGroups')}
            </Text>
          </Card>
        )}

        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={{ marginBottom: Spacing.sm }}>
              <Icon name="Users" size={52} color={colors.labelTertiary} strokeWidth={1.4} />
            </View>
            <Text variant="headline" style={{ fontWeight: '700', marginBottom: 6 }}>{t('split.empty')}</Text>
            <Text variant="subheadline" color={colors.labelSecondary} align="center" style={{ lineHeight: 22, marginBottom: Spacing.lg }}>
              {t('split.emptyDesc')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setEditing(null); setSheetOpen(true); }}
              activeOpacity={0.85}>
              <PlusIcon color={colors.tintForeground} />
              <Text variant="subheadline" color={colors.tintForeground} style={{ fontWeight: '600' }}>
                {t('split.addGroup')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {groups.map((group) => {
              const balance = getMyBalance(group, user?.id ?? '');
              const memberNames = group.shared_members.map(m => m.name).join(', ');
              const totalExp = group.shared_expenses.reduce((s, e) => s + Number(e.amount), 0);
              const accentColor = group.color ?? colors.tint;
              const hasMe = !!findMe(group, user?.id ?? '');

              return (
                <Card key={group.id} radius={Spacing.radius.xl} padding={0} style={{ overflow: 'hidden' }}>
                  <SwipeableRow
                    editLabel={t('common.edit') ?? 'Edit'}
                    deleteLabel={t('common.delete')}
                    editColor={accentColor}
                    editTextColor="#fff"
                    deleteColor={colors.expense}
                    cardColor={colors.card}
                    onEdit={() => { setEditing(group); setSheetOpen(true); }}
                    onDelete={() => setDeleting(group)}>
                    <TouchableOpacity
                      style={[styles.groupRow, { backgroundColor: colors.card }]}
                      onPress={() => router.push({ pathname: '/split-detail', params: { id: group.id, name: group.name } })}
                      activeOpacity={0.7}>
                      <View style={[styles.groupAvatar, { backgroundColor: accentColor + '22' }]}>
                        {group.icon ? (
                          <Icon name={group.icon} size={22} color={accentColor} strokeWidth={1.8} />
                        ) : (
                          <Text style={{ fontSize: 20, fontWeight: '800', color: accentColor }}>
                            {group.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="callout" style={{ fontWeight: '600' }} numberOfLines={1}>{group.name}</Text>
                        <Text variant="caption1" color={colors.labelSecondary} numberOfLines={1}>{memberNames}</Text>
                        {hasMe ? (
                          balance > 1 ? (
                            <View style={[styles.badge, { backgroundColor: colors.income + '18' }]}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.income }}>
                                {t('split.youAreOwed')} ${fmtCOP(balance)}
                              </Text>
                            </View>
                          ) : balance < -1 ? (
                            <View style={[styles.badge, { backgroundColor: colors.expense + '18' }]}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.expense }}>
                                {t('split.youOwe')} ${fmtCOP(balance)}
                              </Text>
                            </View>
                          ) : totalExp > 0 ? (
                            <View style={[styles.badge, { backgroundColor: accentColor + '20' }]}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor }}>{t('split.balanceZero')}</Text>
                            </View>
                          ) : null
                        ) : totalExp > 0 ? (
                          <Text variant="caption2" color={colors.labelSecondary}>${fmtCOP(totalExp)} COP total</Text>
                        ) : null}
                      </View>
                      <ChevronRight color={colors.labelTertiary} />
                    </TouchableOpacity>
                  </SwipeableRow>
                </Card>
              );
            })}
          </View>
        )}

        {groups.length > 0 && (
          <Text variant="caption2" color={colors.labelTertiary} align="center" style={{ marginTop: Spacing.sm }}>
            {t('split.swipeHint')}
          </Text>
        )}

        <View style={{ height: 80 }} />
      </RefreshScrollView>

      <GroupSheet
        visible={sheetOpen}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
        userId={user?.id ?? ''}
        userEmail={user?.email ?? ''}
      />

      <ConfirmDialog
        visible={!!deleting}
        title={t('split.deleteTitle')}
        message={t('split.deleteMessage', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 80 },
  summaryCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md + 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  groupAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  fieldLabel: {
    textTransform: 'uppercase', fontSize: 11,
    fontWeight: '600', letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  memberBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  emailInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    marginLeft: 28,
    marginTop: 2,
  },
  inviteStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 28,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  colorDot: {
    width: 20, height: 20, borderRadius: 10,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberShare: {
    width: 42,
    fontSize: 14,
    paddingVertical: 4,
    textAlign: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  addMemberBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Spacing.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});
