import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { SUPPORTED_LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import { FontFamily } from '@/constants/Typography';

function GlobeIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M2 12h20" />
      <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Svg>
  );
}

function CheckIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [visible, setVisible] = useState(false);

  const current = i18n.language as LanguageCode;

  const handleSelect = async (code: LanguageCode) => {
    setVisible(false);
    await changeLanguage(code);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: colors.separator }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <GlobeIcon color={colors.labelSecondary} size={16} />
        <Text variant="caption1" color={colors.labelSecondary} style={styles.langCode}>
          {current.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text variant="subheadline" color={colors.labelSecondary} style={styles.sheetTitle}>
                  {t('lang.select')}
                </Text>

                {SUPPORTED_LANGUAGES.map((lang, idx) => {
                  const isSelected = current === lang.code;
                  const isLast = idx === SUPPORTED_LANGUAGES.length - 1;
                  return (
                    <React.Fragment key={lang.code}>
                      <TouchableOpacity
                        style={styles.langRow}
                        onPress={() => handleSelect(lang.code)}
                        activeOpacity={0.7}
                      >
                        <Text variant="body" style={styles.flag}>{lang.flag}</Text>
                        <Text
                          variant="body"
                          color={isSelected ? colors.tint : colors.label}
                          style={[styles.langLabel, isSelected && { fontFamily: FontFamily.interSemiBold }]}
                        >
                          {lang.label}
                        </Text>
                        {isSelected && <CheckIcon color={colors.tint} />}
                      </TouchableOpacity>
                      {!isLast && <View style={[styles.divider, { backgroundColor: colors.separator }]} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  langCode: {
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  sheet: {
    borderRadius: Spacing.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
  },
  sheetTitle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  flag: {
    fontSize: 20,
    lineHeight: 24,
  },
  langLabel: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
});
