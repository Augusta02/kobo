import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Card from '../components/Card';
import IconBadge from '../components/IconBadge';
import Avatar from '../components/Avatar';
import { colors, fontFamily, spacing, radius } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

type Rotation = {
  id: string;
  name: string;
  num_days: number;
  current_member_id: string | null;
  next_due_date: string | null;
  is_due: boolean;
  participant_ids: string[];
};

export default function RotationsScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRotations = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Rotation[]>(`/households/${household.id}/rotations`);
      setRotations(data);
    } catch (err) {
      console.error('Failed to load rotations', err);
      setError('Could not load rotations. Pull down to try again, or check your connection.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  useFocusEffect(
    useCallback(() => {
      loadRotations();
    }, [loadRotations])
  );

  function displayNameFor(memberId: string | null) {
    return members.find((m) => m.id === memberId)?.display_name ?? 'Unknown';
  }

  function handleCompleteTurn(rotation: Rotation) {
    const options = rotation.participant_ids.map((memberId) => ({
      text: displayNameFor(memberId) + (memberId === rotation.current_member_id ? ' (their turn)' : ''),
      onPress: () => submitCompletion(rotation.id, memberId, rotation.current_member_id),
    }));
    Alert.alert(
      'Who did this?',
      `It's ${displayNameFor(rotation.current_member_id)}'s turn for ${rotation.name}.`,
      [...options, { text: 'Cancel', style: 'cancel' }]
    );
  }

  async function submitCompletion(rotationId: string, completedByMemberId: string, currentMemberId: string | null) {
    try {
      const body: { amount: number; completed_by_member_id?: string } = { amount: 0 };
      if (completedByMemberId !== currentMemberId) {
        body.completed_by_member_id = completedByMemberId;
      }
      await api.post(`/rotations/${rotationId}/complete`, body);
      loadRotations();
    } catch (err) {
      console.error('Failed to complete turn', err);
      Alert.alert('Error', 'Could not mark this turn done. Try again.');
    }
  }

  function handleDeleteRotation(rotationId: string, rotationName: string) {
    Alert.alert(
      'Delete rotation',
      `Delete "${rotationName}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!household) return;
            try {
              await api.delete(`/households/${household.id}/rotations/${rotationId}`);
              loadRotations();
            } catch (err) {
              console.error('Failed to delete rotation', err);
              Alert.alert('Error', 'Could not delete the rotation. Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rotations</Text>
        <Text style={styles.subtitle}>Shared duties, taken in turns</Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />}

        {!loading && error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && rotations.length === 0 && (
          <Text style={styles.emptyText}>No rotations yet — add your first one below.</Text>
        )}

        {!loading &&
          !error &&
          rotations.map((rotation, index) => (
            <Card key={rotation.id} style={styles.rotationCard}>
              <View style={styles.rotationHeader}>
                <IconBadge tone={index % 2 === 0 ? 'secondary' : 'primary'}>
                  <Feather
                    name="refresh-cw"
                    size={18}
                    color={index % 2 === 0 ? colors.secondary : colors.primary}
                  />
                </IconBadge>
                <View style={styles.rotationBody}>
                  <Text style={styles.rotationTitle}>{rotation.name}</Text>
                  <Text style={styles.rotationSubtitle}>
                    every {rotation.num_days} days · {displayNameFor(rotation.current_member_id)}'s turn
                    {rotation.is_due ? ' · due now' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => (navigation as any).navigate('EditRotation', { rotation })}
                  hitSlop={8}
                  style={{ marginRight: spacing.sm }}
                >
                  <Feather name="edit-2" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => handleDeleteRotation(rotation.id, rotation.name)} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.avatarStack}>
                {rotation.participant_ids.map((memberId) => (
                  <Avatar
                    key={memberId}
                    initial={displayNameFor(memberId).charAt(0).toUpperCase()}
                    variant={memberId === rotation.current_member_id ? 'solid' : 'tint'}
                    size={32}
                  />
                ))}
              </View>
              <Pressable onPress={() => handleCompleteTurn(rotation)}>
                <Text style={styles.completeLink}>Mark {displayNameFor(rotation.current_member_id)}'s turn done</Text>
              </Pressable>
            </Card>
          ))}

        <Pressable style={styles.addButton} onPress={() => navigation.navigate('CreateRotation' as never)}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={styles.addLabel}>Add</Text>
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
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  rotationCard: {
    gap: spacing.md,
  },
  rotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rotationBody: {
    flex: 1,
  },
  rotationTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rotationSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  avatarStack: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  completeLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 13,
    marginTop: spacing.sm,
  },
  addLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.primary,
  },
});