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

export default function CreateGoalScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [participants, setParticipants] = useState<string[]>(() => members.map((m) => m.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleParticipant = (memberId: string) => {
    setParticipants((prev) =>
      prev.includes(memberId) ? prev.filter((item) => item !== memberId) : [...prev, memberId]
    );
  };

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
    if (participants.length === 0) {
      setError('Pick at least one person saving towards this.');
      return;
    }
    if (!household) {
      setError('No household loaded yet — try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/households/${household.id}/goals`, {
        name: trimmedName,
        target_amount: targetValue,
        participant_ids: participants,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to create goal', err);
      setError('Could not create the goal. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

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

        <View>
          <Text style={styles.label}>Saving towards this</Text>
          <View style={styles.avatarRow}>
            {members.map((member) => {
              const active = participants.includes(member.id);
              return (
                <Pressable key={member.id} onPress={() => toggleParticipant(member.id)} style={styles.avatarOption}>
                  <Avatar initial={member.display_name.charAt(0).toUpperCase()} variant={active ? 'solid' : 'outline'} size={44} />
                  <Text style={active ? styles.avatarLabel : styles.avatarLabelMuted}>{member.display_name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {submitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton label="Create goal" onPress={handleSubmit} />
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingHorizontal: 16, fontFamily: fontFamily.regular, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface },
  amountWrap: { position: 'relative', justifyContent: 'center' },
  currencySymbol: { position: 'absolute', left: 16, fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.textPrimary, zIndex: 1 },
  amountInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 14, paddingLeft: 36, paddingRight: 16, fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.textPrimary, backgroundColor: colors.surface },
  avatarRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  avatarOption: { alignItems: 'center', gap: 6 },
  avatarLabel: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textPrimary },
  avatarLabelMuted: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  errorText: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.error, textAlign: 'center' },
});