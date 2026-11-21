import React, { useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Dimensions, Platform, useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { ThemePreference, useThemePreference } from '@/context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Option = {
  value: ThemePreference;
  labelKey: string;
  icon: string;
  descKey: string;
};

const OPTIONS: Option[] = [
  { value: 'light',  labelKey: 'theme.light',      icon: 'Sun',         descKey: 'theme.lightDesc' },
  { value: 'dark',   labelKey: 'theme.dark',        icon: 'Moon',        descKey: 'theme.darkDesc' },
  { value: 'system', labelKey: 'theme.system',      icon: 'Smartphone',  descKey: 'theme.systemDesc' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { preference, setPreference } = useThemePreference();

  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

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

  const handleSelect = async (value: ThemePreference) => {
    await setPreference(value);
    dismissSheet();
  };

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
            <Text variant="headline">{t('theme.title')}</Text>
            <TouchableOpacity onPress={dismissSheet} hitSlop={12}>
              <Icon name="X" size={20} color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>

          <Text variant="footnote" color={colors.labelSecondary} style={styles.subtitle}>
            {t('theme.subtitle')}
          </Text>

          {/* Options */}
          <View style={[styles.card, { backgroundColor: colors.backgroundGroupedSecondary, borderColor: colors.separator }]}>
            {OPTIONS.map((opt, idx) => {
              const selected = preference === opt.value;
              return (
                <React.Fragment key={opt.value}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.separator }]} />}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => handleSelect(opt.value)}
                    activeOpacity={0.7}
                  >
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: selected ? `${colors.tint}14` : colors.fillTertiary }]}>
                      <Icon name={opt.icon} size={20} color={selected ? colors.tint : colors.labelSecondary} />
                    </View>

                    {/* Labels */}
                    <View style={{ flex: 1 }}>
                      <Text variant="callout" style={{ fontWeight: selected ? '600' : '400' }}>
                        {t(opt.labelKey)}
                      </Text>
                      <Text variant="caption1" color={colors.labelSecondary} style={{ lineHeight: 18, marginTop: 1 }}>
                        {t(opt.descKey)}
                      </Text>
                    </View>

                    {/* Check */}
                    {selected && (
                      <Icon name="Check" size={18} color={colors.tint} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
