import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

type StatusChipProps = {
  label: string;
  tone: 'success' | 'warning' | 'error';
};

const toneMap = {
  success: { bg: colors.successTint, fg: colors.success, border: null },
  warning: { bg: colors.warningTint, fg: colors.warning, border: null },
  error: { bg: colors.errorTint, fg: colors.error, border: 'rgba(161,75,61,0.4)' },
};

export default function StatusChip({ label, tone }: StatusChipProps) {
  const { bg, fg, border } = toneMap[tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg },
        border ? { borderWidth: 1, borderColor: border } : null,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.input - 2,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11.5,
  },
});