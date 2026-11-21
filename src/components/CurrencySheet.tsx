import React, { useMemo } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, PanResponder, Platform, Dimensions, useColorScheme,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { SUPPORTED_CURRENCIES, CURRENCY_INFO, countryToFlagEmoji, type SupportedCurrency } from '@/constants/currencies';
import { useCurrency } from '@/context/CurrencyContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CurrencySheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { currency, setCurrency } = useCurrency();
  const translateY = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2, speed: 18 }).start();
    }
  }, [visible, translateY]);

  function dismiss() {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 80 || vy > 0.8) {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  async function handleSelect(code: SupportedCurrency) {
    await setCurrency(code);
    dismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundGrouped, transform: [{ translateY }] }]}>
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.separator }]} />
          </View>
          <View style={styles.header}>
            <Text variant="headline">{t('currency.title')}</Text>
          </View>
          <View style={styles.body}>
            {SUPPORTED_CURRENCIES.map((code, index) => {
              const info = CURRENCY_INFO[code];
              const selected = currency === code;
              const flag = countryToFlagEmoji(info.countryCode);
              const name = t(`currency.${code}`);
              return (
                <View key={code}>
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => handleSelect(code)}
                  >
                    <Text variant="title3" style={{ width: 36 }}>{flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="callout">{name}</Text>
                      <Text variant="footnote" color={colors.labelSecondary}>{code} · {info.symbol}</Text>
                    </View>
                    {selected && (
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M20 6L9 17l-5-5" stroke={colors.tint} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </TouchableOpacity>
                  {index < SUPPORTED_CURRENCIES.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: 48 }]} />
                  )}
                </View>
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  handleZone: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { paddingHorizontal: Spacing.md, paddingBottom: 12 },
  body: { paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
});
