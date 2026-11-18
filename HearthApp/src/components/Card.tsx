import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../theme';

type CardProps = ViewProps & {
  padding?: number;
};

export default function Card({ style, padding = spacing.lg, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    shadowColor: '#202521',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
});