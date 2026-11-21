import React from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Icon, PICKER_ICONS } from '@/components/ui/Icon';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

type AppColors = typeof Colors[keyof typeof Colors];

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const BACKDROP_PADDING = 24;
const COLUMNS = 6;
// Fixed cell size: a percentage width plus aspectRatio makes the ScrollView
// mis-measure its content height, leaving phantom scrollable space.
const CELL = Math.floor(
  (Dimensions.get('window').width - BACKDROP_PADDING * 2 - Spacing.md * 2) / COLUMNS
);

export function IconPicker({
  visible,
  current,
  onSelect,
  onClose,
  colors,
  title,
}: {
  visible: boolean;
  current: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  colors: AppColors;
  title: string;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={[styles.box, { backgroundColor: colors.backgroundGroupedSecondary }]}>
          <View style={styles.header}>
            <Text variant="footnote" color={colors.labelSecondary}>
              {title.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <XIcon color={colors.labelSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <View style={styles.grid}>
              {PICKER_ICONS.map(name => {
                const active = name === current;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => { onSelect(name); onClose(); }}
                    style={[
                      styles.cell,
                      active && { backgroundColor: `${colors.tint}20`, borderRadius: 10 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon name={name} size={22} color={active ? colors.tint : colors.label} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: BACKDROP_PADDING },
  box: { width: '100%', borderRadius: 20, padding: Spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
});
