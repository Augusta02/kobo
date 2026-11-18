import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

type BackButtonProps = {
  onPress?: () => void;
};

export default function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Feather name="chevron-left" size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});