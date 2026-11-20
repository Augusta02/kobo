import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';
import { api } from '../lib/apiClient';

type Goal = {
  id: string;
  name: string;
  target_amount: number;
};

export default function EditGoalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { goal } = route.params as { goal: Goal };

  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target_amount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    const trimmedName = name.trim();
    const targetValue = parseFloat(target.replace(/,/g, ''));

    if (!trimmedName) {
      setError('Give the goal a name.');
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setError('Enter a valid target amount.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/goals/${goal.id}`, {
        name: trimmedName,
        target_amount: targetValue,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to update goal', err);
      setError('Could not save changes. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Edit goal</Text>
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
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                setTarget(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned);
              }}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {submitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton label="Save changes" onPress={handleSubmit} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
});
