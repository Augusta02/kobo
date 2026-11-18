import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';

export default function CreateGoalScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>New goal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.label}>What are you saving for</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Solar panel"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View>
          <Text style={styles.label}>Target amount</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={target}
              onChangeText={setTarget}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <PrimaryButton label="Create goal" onPress={() => navigation.goBack()} />
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
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