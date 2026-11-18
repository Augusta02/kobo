import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';

const goals = ['Solar panel'];

export default function AddContributionScreen() {
  const navigation = useNavigation();
  const [selectedGoal, setSelectedGoal] = useState(goals[0]);
  const [amount, setAmount] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Add a contribution</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.label}>Contributing to</Text>
          <View style={styles.pillRow}>
            {goals.map((goal) => {
              const active = goal === selectedGoal;
              return (
                <Pressable
                  key={goal}
                  onPress={() => setSelectedGoal(goal)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{goal}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <PrimaryButton label="Add contribution" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 19,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  pillLabelActive: {
    color: colors.surface,
  },
  amountWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: colors.textPrimary,
    zIndex: 1,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingVertical: 14,
    paddingLeft: 36,
    paddingRight: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});