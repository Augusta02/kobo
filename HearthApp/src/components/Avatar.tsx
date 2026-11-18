import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../theme';

type AvatarProps = {
  initial: string;
  variant?: 'solid' | 'tint' | 'outline';
  size?: number;
};

export default function Avatar({ initial, variant = 'tint', size = 40 }: AvatarProps) {
  const baseStyle = [
    styles.avatar,
    { width: size, height: size, borderRadius: size / 2 },
    variant === 'solid' && { backgroundColor: colors.primary },
    variant === 'tint' && { backgroundColor: colors.secondaryTint },
    variant === 'outline' && {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
  ];

  const textColor =
    variant === 'solid' ? colors.surface : variant === 'tint' ? colors.secondary : colors.textSecondary;

  return (
    <View style={baseStyle}>
      <Text style={[styles.initial, { color: textColor, fontSize: size * 0.36 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initial: {
    fontFamily: fontFamily.bold,
  },
});