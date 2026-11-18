import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type IconBadgeProps = {
  children: ReactNode;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: number;
};

const toneMap = {
  primary: { bg: colors.primaryTint, fg: colors.primary },
  secondary: { bg: colors.secondaryTint, fg: colors.secondary },
  success: { bg: colors.successTint, fg: colors.success },
  warning: { bg: colors.warningTint, fg: colors.warning },
  error: { bg: colors.errorTint, fg: colors.error },
};

export default function IconBadge({ children, tone = 'primary', size = 38 }: IconBadgeProps) {
  const { bg, fg } = toneMap[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, width: size, height: size, borderRadius: size * 0.26 },
      ]}
    >
      <View style={{ ...styles.iconWrap }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});