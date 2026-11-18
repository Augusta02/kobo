import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';

const categories = ['Fuel', 'Generator repair', 'Other'];

export default function LogExpenseScreen() {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('12,900');
  const [category, setCategory] = useState('Fuel');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Log an expense</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <View style={styles.receiptPlaceholder}>
            <Text style={styles.receiptText}>[receipt photo]</Text>
          </View>
          <Text style={styles.retakeLink}>Retake photo</Text>
        </View>

        <View>
          <Text style={styles.label}>Total detected</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>From your receipt — check it's right before saving.</Text>
        </View>

        <View>
          <Text style={styles.label}>What was this for</Text>
          <View style={styles.pillRow}>
            {categories.map((item) => {
              const active = item === category;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Split with</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarOption}>
              <Avatar initial="N" variant="solid" size={44} />
              <Text style={styles.avatarLabel}>Nene</Text>
            </View>
            <View style={[styles.avatarOption, { opacity: 0.55 }]}>
              <Avatar initial="A" variant="outline" size={44} />
              <Text style={styles.avatarLabelMuted}>Amaka</Text>
            </View>
            <View style={styles.avatarOption}>
              <Avatar initial="Z" variant="solid" size={44} />
              <Text style={styles.avatarLabel}>Zainab</Text>
            </View>
          </View>
        </View>

        <Card style={styles.splitCard}>
          <Text style={styles.splitSummary}>Split two ways · ₦6,450 each</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitName}>Nene</Text>
            <Text style={styles.splitPaid}>₦6,450 · you paid</Text>
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitName}>Zainab</Text>
            <Text style={styles.splitOwes}>₦6,450 · owes you</Text>
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitNameMuted}>Amaka</Text>
            <Text style={styles.splitOut}>sitting this one out</Text>
          </View>
        </Card>

        <PrimaryButton label="Log expense" onPress={() => navigation.goBack()} />
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
  receiptPlaceholder: {
    height: 190,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  retakeLink: {
    marginTop: 10,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
  helperText: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: 8,
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
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  pillLabelActive: {
    fontFamily: fontFamily.semibold,
    color: colors.surface,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarOption: {
    alignItems: 'center',
    gap: 6,
  },
  avatarLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textPrimary,
  },
  avatarLabelMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  splitCard: {
    gap: spacing.sm,
  },
  splitSummary: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitName: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  splitNameMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  splitPaid: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.success,
  },
  splitOwes: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.success,
  },
  splitOut: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});