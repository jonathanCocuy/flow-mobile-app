import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

type AppColors = typeof Colors[keyof typeof Colors];

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_LETTERS = ['D','L','M','X','J','V','S'];

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2v3M16 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownSmall({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarPicker({ date, onSelect, colors }: {
  date: Date;
  onSelect: (d: Date) => void;
  colors: AppColors;
}) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goFwd = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isSelected = (d: number) =>
    d === date.getDate() && viewMonth === date.getMonth() && viewYear === date.getFullYear();
  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isFuture = (d: number) => new Date(viewYear, viewMonth, d) > today;

  return (
    <View style={[calStyles.root, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeftIcon color={colors.label} />
        </TouchableOpacity>
        <Text variant="callout" style={{ fontWeight: '600' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goFwd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronRightIcon color={colors.label} />
        </TouchableOpacity>
      </View>
      <View style={calStyles.row}>
        {DAY_LETTERS.map(l => (
          <View key={l} style={calStyles.cell}>
            <Text variant="caption2" color={colors.labelTertiary} align="center" style={{ fontWeight: '600' }}>
              {l}
            </Text>
          </View>
        ))}
      </View>
      <View style={calStyles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`blank-${i}`} style={calStyles.cell} />;
          const sel = isSelected(d);
          const tod = isToday(d);
          const fut = isFuture(d);
          return (
            <TouchableOpacity
              key={d}
              style={calStyles.cell}
              onPress={() => !fut && onSelect(new Date(viewYear, viewMonth, d))}
              activeOpacity={fut ? 1 : 0.7}
            >
              <View style={[
                calStyles.dayCircle,
                sel && { backgroundColor: colors.tint },
                !sel && tod && { borderWidth: 1.5, borderColor: colors.tint },
              ]}>
                <Text
                  variant="footnote"
                  align="center"
                  color={sel ? colors.tintForeground : fut ? colors.labelTertiary : colors.label}
                  style={{ fontWeight: sel || tod ? '700' : '400' }}
                >
                  {d}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  root: { padding: Spacing.sm, marginTop: 4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: Spacing.xs },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Public component ──────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  value: Date;
  onChange: (d: Date) => void;
  colors: AppColors;
}

export function DatePickerField({ value, onChange, colors }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        style={[fieldStyles.row, { backgroundColor: colors.fillTertiary, borderRadius: Spacing.radius.md }]}
        activeOpacity={0.7}
      >
        <CalendarIcon color={colors.labelSecondary} />
        <Text variant="callout" style={{ flex: 1 }}>{formatDate(value)}</Text>
        <ChevronDownSmall color={colors.labelTertiary} />
      </TouchableOpacity>
      {open && (
        <CalendarPicker
          date={value}
          onSelect={d => { onChange(d); setOpen(false); }}
          colors={colors}
        />
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
});
