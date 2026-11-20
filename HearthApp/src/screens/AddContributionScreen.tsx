import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

type Goal = { id: string; name: string };

export default function AddContributionScreen() {
  const navigation = useNavigation();
  const { household, member } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!household) return;
      setLoading(true);
      api
        .get<Goal[]>(`/households/${household.id}/goals`)
        .then((data) => {
          setGoals(data);
          setSelectedGoalId((prev) => prev ?? data[0]?.id ?? null);
        })
        .catch((err) => console.error('Failed to load goals', err))
        .finally(() => setLoading(false));
    }, [household])
  );

  async function handleSubmit() {
    setError(null);

    const amountValue = parseFloat(amount.replace(/,/g, ''));

    if (!selectedGoalId) {
      setError('Pick a goal to contribute to.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!member) {
      setError('No member loaded yet — try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/goals/${selectedGoalId}/contributions`, {
        member_id: member.id,
        amount: amountValue,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to add contribution', err);
      setError('Could not add the contribution. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Add a contribution</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : goals.length === 0 ? (
          <Text style={styles.emptyText}>No goals yet — start one first.</Text>
        ) : (
          <>
            <View>
              <Text style={styles.label}>Contributing to</Text>
              <View style={styles.pillRow}>
                {goals.map((goal) => {
                  const active = goal.id === selectedGoalId;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => setSelectedGoalId(goal.id)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{goal.name}</Text>
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
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned);
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
              <PrimaryButton label="Add contribution" onPress={handleSubmit} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { fontFamily: fontFamily.extrabold, fontSize: 19, color: colors.textPrimary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  label: { fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.sm },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillLabel: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.textPrimary },
  pillLabelActive: { color: colors.surface },
  amountWrap: { position: 'relative', justifyContent: 'center' },
  currencySymbol: { position: 'absolute', left: 16, fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.textPrimary, zIndex: 1 },
  amountInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingLeft: 36, paddingRight: 16, fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.textPrimary, backgroundColor: colors.surface },
  errorText: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.error, textAlign: 'center' },
});