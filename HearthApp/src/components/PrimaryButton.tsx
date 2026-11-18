import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontFamily, radius, spacing } from '../theme';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

export default function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.surface,
    fontFamily: fontFamily.bold,
    fontSize: 15,
  },
});