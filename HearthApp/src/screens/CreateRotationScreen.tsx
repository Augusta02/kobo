import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';
import { colors, fontFamily, radius, spacing } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

export default function CreateRotationScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [name, setName] = useState('');
  const [repeatsEvery, setRepeatsEvery] = useState('10');
  const [remind, setRemind] = useState('1');
  const [selected, setSelected] = useState<string[]>(() => members.map((m) => m.id));
  const [splitCost, setSplitCost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelected = (memberId: string) => {
    setSelected((prev) =>
      prev.includes(memberId) ? prev.filter((item) => item !== memberId) : [...prev, memberId]
    );
  };

  async function handleSubmit() {
    setError(null);

    const trimmedName = name.trim();
    const numDaysValue = parseInt(repeatsEvery, 10);

    if (!trimmedName) {
      setError('Give the rotation a name.');
      return;
    }
    if (!numDaysValue || numDaysValue <= 0) {
      setError('Enter a valid repeat interval.');
      return;
    }
    if (selected.length === 0) {
      setError('Pick at least one person to take turns.');
      return;
    }
    if (!household) {
      setError('No household loaded yet — try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/households/${household.id}/rotations`, {
        name: trimmedName,
        num_days: numDaysValue,
        remind_days: parseInt(remind, 10) || null,
        split_cost: splitCost,
        participant_ids: selected,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to create rotation', err);
      setError('Could not create the rotation. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>New rotation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Water refill"
            placeholderTextColor={colors.textSecondary}
          />
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
          <Text style={styles.label}>Who takes turns</Text>
          <View style={styles.avatarRow}>
            {members.map((member) => {
              const active = selected.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleSelected(member.id)}
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

        <Card style={styles.toggleCard}>
          <View style={styles.toggleBody}>
            <Text style={styles.toggleTitle}>Split the cost</Text>
            <Text style={styles.toggleSubtitle}>
              {splitCost ? 'Split evenly between everyone' : "Off — whoever's turn covers it"}
            </Text>
          </View>
          <Pressable
            onPress={() => setSplitCost((prev) => !prev)}
            style={[styles.switchTrack, splitCost && styles.switchTrackOn]}
          >
            <View style={[styles.switchThumb, splitCost && styles.switchThumbOn]} />
          </Pressable>
        </Card>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {submitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton label="Create rotation" onPress={handleSubmit} />
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
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleBody: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
});