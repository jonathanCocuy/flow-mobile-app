import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Dimensions, useColorScheme, AppState,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type PermStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

interface PermissionRowProps {
  icon: string;
  label: string;
  description: string;
  status: PermStatus;
  canRequest: boolean;
  onAllow: () => void;
  onOpenSettings: () => void;
  colors: typeof Colors[keyof typeof Colors];
}

function statusColor(status: PermStatus, colors: typeof Colors[keyof typeof Colors]) {
  if (status === 'granted') return colors.income;
  if (status === 'limited') return colors.tintOrange;
  return colors.expense;
}

function PermissionRow({ icon, label, description, status, canRequest, onAllow, onOpenSettings, colors }: PermissionRowProps) {
  const { t } = useTranslation();

  const statusLabel =
    status === 'granted' ? t('permissions.granted') :
    status === 'limited' ? t('permissions.limited') :
    status === 'denied' ? t('permissions.denied') :
    t('permissions.notDetermined');

  return (
    <View style={styles.permRow}>
      <View style={[styles.permIconWrap, { backgroundColor: `${colors.tint}14` }]}>
        <Icon name={icon} size={20} color={colors.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text variant="callout" style={{ fontWeight: '600' }}>{label}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(status, colors)}18` }]}>
            <Text variant="caption2" style={{ color: statusColor(status, colors), fontWeight: '700' }}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text variant="caption1" color={colors.labelSecondary} style={{ lineHeight: 18 }}>{description}</Text>
        {status !== 'granted' && (
          <TouchableOpacity
            style={[styles.permBtn, { borderColor: colors.tint }]}
            onPress={canRequest ? onAllow : onOpenSettings}
            activeOpacity={0.7}
          >
            <Text variant="caption1" color={colors.tint} style={{ fontWeight: '600' }}>
              {canRequest ? t('permissions.allow') : t('permissions.openSettings')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PermissionsSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [photosStatus, setPhotosStatus] = useState<PermStatus>('undetermined');
  const [cameraStatus, setCameraStatus] = useState<PermStatus>('undetermined');

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  const refreshPermissions = useCallback(async () => {
    const [photos, camera] = await Promise.all([
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
    ]);
    setPhotosStatus(photos.status as PermStatus);
    setCameraStatus(camera.status as PermStatus);
  }, []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshPermissions();
    }
  }, [visible, translateY, refreshPermissions]);

  // Refresh when user comes back from Settings
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermissions();
    });
    return () => sub.remove();
  }, [visible, refreshPermissions]);

  function dismissSheet() {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const requestPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPhotosStatus(status as PermStatus);
  };

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraStatus(status as PermStatus);
  };

  const openSettings = () => Linking.openSettings();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismissSheet}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.fillPrimary }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text variant="headline">{t('permissions.title')}</Text>
            <TouchableOpacity onPress={dismissSheet} hitSlop={12}>
              <Icon name="X" size={20} color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>

          <Text variant="footnote" color={colors.labelSecondary} style={styles.subtitle}>
            {t('permissions.subtitle')}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
            <PermissionRow
              icon="Image"
              label={t('permissions.photos')}
              description={t('permissions.photosDesc')}
              status={photosStatus}
              canRequest={photosStatus === 'undetermined'}
              onAllow={requestPhotos}
              onOpenSettings={openSettings}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <PermissionRow
              icon="Camera"
              label={t('permissions.camera')}
              description={t('permissions.cameraDesc')}
              status={cameraStatus}
              canRequest={cameraStatus === 'undetermined'}
              onAllow={requestCamera}
              onOpenSettings={openSettings}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            {/* Notifications — no expo-notifications; link to Settings */}
            <View style={styles.permRow}>
              <View style={[styles.permIconWrap, { backgroundColor: `${colors.tint}14` }]}>
                <Icon name="Bell" size={20} color={colors.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text variant="callout" style={{ fontWeight: '600' }}>{t('permissions.notifications')}</Text>
                </View>
                <Text variant="caption1" color={colors.labelSecondary} style={{ lineHeight: 18 }}>
                  {t('permissions.notificationsDesc')}
                </Text>
                <TouchableOpacity
                  style={[styles.permBtn, { borderColor: colors.tint }]}
                  onPress={openSettings}
                  activeOpacity={0.7}
                >
                  <Text variant="caption1" color={colors.tint} style={{ fontWeight: '600' }}>
                    {t('permissions.openSettings')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  subtitle: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  card: {
    marginHorizontal: Spacing.md,
    borderRadius: Spacing.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  permIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Spacing.radius.full,
  },
  permBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Spacing.radius.full,
    borderWidth: 1,
  },
});
