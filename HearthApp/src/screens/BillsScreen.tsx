import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import { Feather } from '@expo/vector-icons';
import Card from '../components/Card';
import IconBadge from '../components/IconBadge';
import StatusChip from '../components/StatusChip';
import { colors, fontFamily, spacing } from '../theme';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';

type BillSplit = { member_id: string; share_amount: number; paid: boolean };
type Bill = {
  id: string;
  name: string;
  total_amount: number;
  num_days: number;
  next_due_date: string | null;
  is_due: boolean;
  splits: BillSplit[];
};

function formatNaira(value: number | string) {
  return `₦${Number(value).toLocaleString()}`;
}

export default function BillsScreen() {
  const navigation = useNavigation();
  const { household, members } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Bill[]>(`/households/${household.id}/bills`);
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills', err);
      setError('Could not load bills. Pull down to try again, or check your connection.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills])
  );

  function displayNameFor(memberId: string) {
    return members.find((m) => m.id === memberId)?.display_name ?? 'Unknown';
  }

  async function handleSettleSplit(billId: string, memberId: string) {
    if (!household) return;
    try {
      await api.patch(`/households/${household.id}/bills/${billId}/splits/${memberId}/settle`);
      loadBills();
    } catch (err) {
      console.error('Failed to settle split', err);
      Alert.alert('Error', 'Could not mark that as paid. Try again.');
    }
  }

  async function handleSettleCycle(billId: string) {
    if (!household) return;
    try {
      await api.patch(`/households/${household.id}/bills/${billId}/settle-cycle`);
      loadBills();
    } catch (err) {
      console.error('Failed to settle cycle', err);
      Alert.alert('Error', 'Could not settle this cycle. Try again.');
    }
  }

  function handleDeleteBill(billId: string, billName: string) {
    Alert.alert(
      'Delete bill',
      `Delete "${billName}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!household) return;
            try {
              await api.delete(`/households/${household.id}/bills/${billId}`);
              loadBills();
            } catch (err) {
              console.error('Failed to delete bill', err);
              Alert.alert('Error', 'Could not delete the bill. Try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Bills</Text>
        <Text style={styles.subtitle}>Recurring costs, split three ways</Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />}

        {!loading && error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && bills.length === 0 && (
          <Text style={styles.emptyText}>No bills yet — add your first one below.</Text>
        )}

        {!loading &&
          !error &&
          bills.map((bill, index) => (
            <Card key={bill.id} style={styles.billCard}>
              <View style={styles.billHeader}>
                <IconBadge tone={index % 2 === 0 ? 'primary' : 'secondary'}>
                  <Feather
                    name="credit-card"
                    size={18}
                    color={index % 2 === 0 ? colors.primary : colors.secondary}
                  />
                </IconBadge>
                <View style={styles.billBody}>
                  <Text style={styles.billTitle}>{bill.name}</Text>
                  <Text style={styles.billSubtitle}>
                    every {bill.num_days} days{bill.is_due ? ' · due now' : ''}
                  </Text>
                </View>
                <View style={styles.billAmountWrap}>
                  <Text style={styles.billAmount}>{formatNaira(bill.total_amount)}</Text>
                  <Text style={styles.billEach}>total</Text>
                </View>
                <Pressable
                  onPress={() => (navigation as any).navigate('EditBill', { bill })}
                  hitSlop={8}
                  style={styles.iconSpacing}
                >
                  <Feather name="edit-2" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => handleDeleteBill(bill.id, bill.name)} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {bill.splits.map((split) =>
                  split.paid ? (
                    <StatusChip
                      key={split.member_id}
                      label={`${displayNameFor(split.member_id)} · paid`}
                      tone="success"
                    />
                  ) : (
                    <Pressable key={split.member_id} onPress={() => handleSettleSplit(bill.id, split.member_id)}>
                      <StatusChip label={`${displayNameFor(split.member_id)} · pending`} tone="error" />
                    </Pressable>
                  )
                )}
              </View>
              {bill.is_due && (
                <Pressable onPress={() => handleSettleCycle(bill.id)}>
                  <Text style={styles.logLink}>Mark cycle settled</Text>
                </Pressable>
              )}
            </Card>
          ))}

        <Card style={styles.billCard}>
          <View style={styles.billHeader}>
            <IconBadge tone="primary">
              <Feather name="zap" size={18} color={colors.primary} />
            </IconBadge>
            <View style={styles.billBody}>
              <Text style={styles.billTitle}>Fuel & generator</Text>
              <Text style={styles.billSubtitle}>no fixed schedule · split when logged</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('LogExpense' as never)}>
            <Text style={styles.logLink}>Log one</Text>
          </Pressable>
        </Card>

        <Card style={styles.billCard}>
          <View style={styles.billHeader}>
            <IconBadge tone="secondary">
              <Feather name="refresh-cw" size={18} color={colors.secondary} />
            </IconBadge>
            <View style={styles.billBody}>
              <Text style={styles.billTitle}>Water, bins and other rotating duties</Text>
              <Text style={styles.billSubtitle}>no fixed cost · handled in Rotations</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Rotations' as never)}>
            <Text style={styles.logLink}>Open Rotations</Text>
          </Pressable>
        </Card>
        <PrimaryButton label="Add a bill" onPress={() => navigation.navigate('CreateBill' as never)} />
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
  billCard: {
    gap: spacing.md,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconSpacing: {
    marginRight: spacing.sm,
  },
  billBody: {
    flex: 1,
  },
  billTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  billSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  billAmountWrap: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  billEach: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  logLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
});