import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

export default function CreateBillScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [repeatsEvery, setRepeatsEvery] = useState('30');
  const [remind, setRemind] = useState('2');
  const [splitWith, setSplitWith] = useState<string[]>(() => members.map((m) => m.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSplit = (memberId: string) => {
    setSplitWith((prev) =>
      prev.includes(memberId) ? prev.filter((item) => item !== memberId) : [...prev, memberId]
    );
  };

  async function handleSubmit() {
    setError(null);

    const trimmedName = name.trim();
    const amountValue = parseFloat(amount.replace(/,/g, ''));
    const numDaysValue = parseInt(repeatsEvery, 10);

    if (!trimmedName) {
      setError('Give the bill a name.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!numDaysValue || numDaysValue <= 0) {
      setError('Enter a valid repeat interval.');
      return;
    }
    if (splitWith.length === 0) {
      setError('Pick at least one person to split with.');
      return;
    }
    if (!household) {
      setError('No household loaded yet — try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/households/${household.id}/bills`, {
        name: trimmedName,
        total_amount: amountValue,
        num_days: numDaysValue,
        remind_days: parseInt(remind, 10) || null,
        participant_ids: splitWith,
        contributions: [],
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to create bill', err);
      setError('Could not create the bill. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>New bill</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Internet"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View>
          <Text style={styles.label}>Amount (total, per cycle)</Text>
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

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Repeats every</Text>
            <TextInput
              style={styles.input}
              value={repeatsEvery}
              onChangeText={(text) => setRepeatsEvery(text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.suffix}>days</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Remind</Text>
            <TextInput
              style={styles.input}
              value={remind}
              onChangeText={(text) => setRemind(text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.suffix}>days before</Text>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Split between</Text>
          <View style={styles.avatarRow}>
            {members.map((member) => {
              const active = splitWith.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleSplit(member.id)}
                  style={styles.avatarOption}
                >
                  <Avatar
                    initial={member.display_name.charAt(0).toUpperCase()}
                    variant={active ? 'solid' : 'outline'}
                    size={44}
                  />
                  <Text style={active ? styles.avatarLabel : styles.avatarLabelMuted}>
                    {member.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {submitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton label="Create bill" onPress={handleSubmit} />
        )}
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  suffix: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
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
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
});