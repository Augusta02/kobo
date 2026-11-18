import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors, fontFamily } from '../theme';

type MoneyTextProps = {
  amount: string;
  direction?: 'in' | 'out' | 'neutral';
  size?: number;
  style?: TextStyle;
};
// direction === in is for money coming to a housemate A (another housemate owes A)
// direction === out is for unpaid/owed by A/ pending
// direction === neutral is palin figures like a total
export default function MoneyText({ amount, direction = 'neutral', size = 14, style }: MoneyTextProps) {
  const color =
    direction === 'in' ? colors.success : direction === 'out' ? colors.error : colors.textPrimary;

  return <Text style={[styles.text, { color, fontSize: size }, style]}>{amount}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.bold,
  },
});