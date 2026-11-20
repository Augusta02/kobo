import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, spacing, radius } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

type GoalParticipant = {
  member_id: string;
  share_amount: number;
  contributed_so_far: number;
  remaining: number;
  is_complete: boolean;
};
type Goal = {
  id: string;
  name: string;
  target_amount: number;
  total_saved: number;
  is_complete: boolean;
  participants: GoalParticipant[];
};

function formatMoney(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

export default function GoalsScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    if (!household) return;
    try {
      const data = await api.get<Goal[]>(`/households/${household.id}/goals`);
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  }, [household]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const nameFor = (memberId: string) =>
    members.find((m) => m.id === memberId)?.display_name ?? 'Someone';
  function handleDeleteGoal(goalId: string, goalName: string) {
    Alert.alert(
      'Delete goal',
      `Delete "${goalName}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/goals/${goalId}`);
              loadGoals();
            } catch (err) {
              console.error('Failed to delete goal', err);
              Alert.alert('Error', 'Could not delete the goal. Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>Saving together</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : goals.length === 0 ? (
          <Text style={styles.emptyText}>No goals yet — start one below.</Text>
        ) : (
          goals.map((goal) => {
            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeaderRow}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <View style={styles.goalHeaderIcons}>
                    <Pressable
                      onPress={() => (navigation as any).navigate('EditGoal', { goal })}
                      hitSlop={8}
                      style={styles.iconSpacing}
                    >
                      <Feather name="edit-2" size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteGoal(goal.id, goal.name)} hitSlop={8}>
                      <Feather name="trash-2" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.goalTarget}>
                  {formatMoney(goal.total_saved)} of {formatMoney(goal.target_amount)}
                </Text>

                <View style={styles.progressTrack}>
                  {goal.participants.map((participant) => {
                    const segmentPct = goal.target_amount > 0
                      ? (Number(participant.share_amount) / Number(goal.target_amount)) * 100
                      : 100 / goal.participants.length;
                    const fillPct = Number(participant.share_amount) > 0
                      ? Math.min(Number(participant.contributed_so_far) / Number(participant.share_amount), 1) * 100
                      : 0;
                    return (
                      <View
                        key={participant.member_id}
                        style={[styles.progressSegment, { width: `${segmentPct}%` }]}
                      >
                        <View style={[styles.progressSegmentFill, { width: `${fillPct}%` }]} />
                      </View>
                    );
                  })}
                </View>

                <View style={styles.breakdown}>
                  {goal.participants.map((participant) => (
                    <View key={participant.member_id} style={styles.breakdownRow}>
                      <Text style={participant.contributed_so_far > 0 ? styles.personName : styles.personNameMuted}>
                        {nameFor(participant.member_id)}
                      </Text>
                      <Text style={participant.is_complete ? styles.personShareDone : styles.personShare}>
                        {formatMoney(participant.contributed_so_far)} of {formatMoney(participant.share_amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })
        )}

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
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  title: { fontFamily: fontFamily.extrabold, fontSize: 22, color: colors.textPrimary },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 12.5, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  goalCard: { gap: spacing.sm },
  goalName: { fontFamily: fontFamily.bold, fontSize: 17, color: colors.textPrimary },
  goalTarget: { fontFamily: fontFamily.regular, fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.xs },
    progressTrack: {
    flexDirection: 'row',
    height: 8,
    gap: 2,
  },
  progressSegment: {
    height: '100%',
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  breakdown: { marginTop: spacing.sm, gap: spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personName: { fontFamily: fontFamily.regular, fontSize: 14, color: colors.textPrimary },
  personNameMuted: { fontFamily: fontFamily.regular, fontSize: 14, color: colors.textSecondary },
  personShare: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.textSecondary },
  personShareDone: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.success },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: spacing.sm,
  },
});
