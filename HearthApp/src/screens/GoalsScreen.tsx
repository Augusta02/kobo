import { ScrollView, StyleSheet, Text, View, Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import MoneyText from '../components/MoneyText';
import { colors, fontFamily, spacing, radius } from '../theme';

const progress = 0.68;

export default function GoalsScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>Saving together</Text>

        <Card style={styles.goalCard}>
          <Text style={styles.goalName}>Solar panel</Text>
          <Text style={styles.goalTarget}>₦204,000 of ₦300,000</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.personName}>Nene</Text>
              <MoneyText amount="₦100,000" direction="in" size={14} />
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.personName}>Zainab</Text>
              <Text style={styles.partialAmount}>₦84,000</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.personNameMuted}>Amaka</Text>
              <Text style={styles.zeroAmount}>₦0</Text>
            </View>
          </View>
        </Card>

        <PrimaryButton label="Add a contribution" onPress={() => navigation.navigate('AddContribution' as never)} />
        <Pressable
          style={{ alignItems: 'center', paddingVertical: 10 }}
          onPress={() => navigation.navigate('CreateGoal' as never)}
        >
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 14, color: colors.primary }}>
            + Start a new goal
          </Text>
        </Pressable>
         
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  goalCard: {
    gap: spacing.sm,
  },
  goalName: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  goalTarget: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  breakdown: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  personNameMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  partialAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  zeroAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});