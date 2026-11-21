import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { group_id?: string; group_name?: string; member_id?: string } | null;
  read: boolean;
  created_at: string;
}

type MemberStatus = 'pending' | 'accepted' | 'rejected';

/** Unread count for the header badge. */
export async function fetchUnreadCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false);
  return count ?? 0;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires after anything that changes the unread count. */
  onChanged?: () => void;
}

export function NotificationsSheet({ visible, onClose, onChanged }: NotificationsSheetProps) {
  const { t } = useTranslation();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [items, setItems] = useState<AppNotification[]>([]);
  const [statuses, setStatuses] = useState<Record<string, MemberStatus>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  function dismissSheet() {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
      onClose();
    });
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(() => {
          onClose();
        });
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  // Held in a ref so `load` stays stable even when the parent passes an inline
  // callback — otherwise the open effect would re-run on every parent render.
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const list = (data ?? []) as AppNotification[];
    setItems(list);

    // An invitation's real state lives on the member row — the notification is
    // only the nudge, and it does not change when the invite is answered.
    const memberIds = list
      .filter(n => n.type === 'group_invite' && n.data?.member_id)
      .map(n => n.data!.member_id!);

    if (memberIds.length) {
      const { data: members } = await supabase
        .from('shared_members')
        .select('id, status')
        .in('id', memberIds);
      setStatuses(Object.fromEntries(
        (members ?? []).map(m => [m.id as string, m.status as MemberStatus]),
      ));
    } else {
      setStatuses({});
    }

    setLoading(false);

    const unread = list.filter(n => !n.read).map(n => n.id);
    if (unread.length) {
      await supabase.from('notifications').update({ read: true }).in('id', unread);
      onChangedRef.current?.();
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) load();
  }, [visible, load]);

  const respond = async (notif: AppNotification, accept: boolean) => {
    const memberId = notif.data?.member_id;
    if (!memberId) return;
    setBusyId(notif.id);
    setError('');
    const { error: rpcError } = await supabase.rpc('respond_to_invitation', {
      p_member_id: memberId,
      p_accept: accept,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      if (!accept && notif.data?.group_id) {
        const [{ data: group }, { data: member }] = await Promise.all([
          supabase.from('shared_groups').select('user_id').eq('id', notif.data.group_id).single(),
          supabase.from('shared_members').select('name').eq('id', memberId).single(),
        ]);
        if (group?.user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: group.user_id,
            p_type: 'invite_rejected',
            p_title: t('split.invite.rejectedNotifTitle'),
            p_body: t('split.invite.rejectedNotifBody', {
              member: member?.name ?? '',
              group: notif.data.group_name ?? '',
            }),
            p_data: { group_id: notif.data.group_id, group_name: notif.data.group_name, member_id: memberId },
          });

          // If no non-me members remain active (pending/accepted), the group
          // is now empty — delete it so the owner doesn't end up alone in it.
          const { count } = await supabase
            .from('shared_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', notif.data.group_id)
            .eq('is_me', false)
            .neq('status', 'rejected');
          if ((count ?? 0) === 0) {
            await supabase.from('shared_groups').delete().eq('id', notif.data.group_id);
          }
        }
      }
      await load();
      onChangedRef.current?.();
    }
    setBusyId(null);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismissSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGroupedSecondary, transform: [{ translateY }] }]}>
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />
          </View>

          <View style={styles.header}>
            <Text variant="headline">{t('notifications.title')}</Text>
            <TouchableOpacity onPress={dismissSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text variant="body" color={colors.tint}>{t('transactions.add.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!!error && (
              <Text variant="caption1" color={colors.expense} align="center" style={{ marginBottom: Spacing.sm }}>
                {error}
              </Text>
            )}

            {loading ? (
              <View style={{ gap: Spacing.sm }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={{ gap: 8, paddingVertical: Spacing.sm }}>
                    <Skeleton width={160} height={14} radius={4} />
                    <Skeleton width={220} height={11} radius={4} />
                  </View>
                ))}
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={{ marginBottom: Spacing.sm }}>
                  <Icon name="Bell" size={44} color={colors.labelTertiary} strokeWidth={1.4} />
                </View>
                <Text variant="headline" style={{ fontWeight: '700', marginBottom: 6 }}>
                  {t('notifications.empty')}
                </Text>
                <Text variant="subheadline" color={colors.labelSecondary} align="center" style={{ lineHeight: 22 }}>
                  {t('notifications.emptyDesc')}
                </Text>
              </View>
            ) : (
              items.map((n, idx) => {
                const isInvite = n.type === 'group_invite' && !!n.data?.member_id;
                const status = isInvite ? statuses[n.data!.member_id!] : undefined;

                return (
                  <View key={n.id}>
                    {idx > 0 && (
                      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 46 }} />
                    )}
                    <View style={styles.row}>
                      <View style={[styles.avatar, { backgroundColor: colors.tint + '18' }]}>
                        <Icon name={isInvite ? 'Users' : 'Bell'} size={18} color={colors.tint} />
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <Text variant="callout" style={{ fontWeight: '600' }}>{n.title}</Text>
                        <Text variant="caption1" color={colors.labelSecondary}>{n.body}</Text>
                        <Text variant="caption2" color={colors.labelTertiary}>{fmtWhen(n.created_at)}</Text>

                        {isInvite && status === 'pending' && (
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={[styles.acceptBtn, { backgroundColor: colors.tint, opacity: busyId === n.id ? 0.6 : 1 }]}
                              onPress={() => respond(n, true)}
                              disabled={busyId === n.id}
                              activeOpacity={0.85}>
                              <Text variant="caption1" color={colors.tintForeground} style={{ fontWeight: '700' }}>
                                {t('notifications.accept')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.rejectBtn, { borderColor: colors.separator, opacity: busyId === n.id ? 0.6 : 1 }]}
                              onPress={() => respond(n, false)}
                              disabled={busyId === n.id}
                              activeOpacity={0.85}>
                              <Text variant="caption1" color={colors.labelSecondary} style={{ fontWeight: '600' }}>
                                {t('notifications.reject')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isInvite && (status === 'accepted' || status === 'rejected') && (
                          <View style={[styles.statusChip, {
                            backgroundColor: status === 'accepted' ? colors.income + '18' : colors.expense + '18',
                          }]}>
                            <Text style={{
                              fontSize: 11, fontWeight: '700',
                              color: status === 'accepted' ? colors.income : colors.expense,
                            }}>
                              {status === 'accepted' ? t('notifications.acceptedChip') : t('notifications.rejectedChip')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.4,
    borderTopLeftRadius: Spacing.radius.xxl,
    borderTopRightRadius: Spacing.radius.xxl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 8 },
  acceptBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
  },
  rejectBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Spacing.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: Spacing.xl,
  },
});
