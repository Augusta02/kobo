import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import IconBadge from '../components/IconBadge';
import MoneyText from '../components/MoneyText';
import { colors, fontFamily, spacing, radius } from '../theme';
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

type BillBalance = {
  bill_id: string;
  bill_name: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
};

type Rotation = {
  id: string;
  name: string;
  num_days: number;
  current_member_id: string | null;
  next_due_date: string | null;
  is_due: boolean;
  participant_ids: string[];
};

type Balance = { from_member_id: string; to_member_id: string; amount: number };

function formatNaira(value: number) {
  return `₦${Math.round(value).toLocaleString()}`;
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabel(isDue: boolean, daysAway: number | null) {
  if (isDue || (daysAway !== null && daysAway <= 0)) return 'due now';
  if (daysAway === 1) return 'due tomorrow';
  if (daysAway !== null) return `due in ${daysAway} days`;
  return '';
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { household, member, members, signOut } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [billBalances, setBillBalances] = useState<BillBalance[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    try {
      const [billsData, rotationsData, balancesData, billBalancesData] = await Promise.all([
        api.get<Bill[]>(`/households/${household.id}/bills`),
        api.get<Rotation[]>(`/households/${household.id}/rotations`),
        api.get<Balance[]>(`/households/${household.id}/balances`),
        api.get<BillBalance[]>(`/households/${household.id}/bill-balances`),
      ]);
      setBills(billsData);
      setRotations(rotationsData);
      setBalances(balancesData);
      setBillBalances(billBalancesData);
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  }, [household]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function displayNameFor(memberId: string | null) {
    return members.find((m) => m.id === memberId)?.display_name ?? 'Unknown';
  }

  const myBalances = balances.filter(
    (b) => b.from_member_id === member?.id || b.to_member_id === member?.id
  );
  const netBalance = myBalances.reduce((sum, b) => {
    const amount = Number(b.amount);
    return sum + (b.to_member_id === member?.id ? amount : -amount);
  }, 0);

  async function handleSettleBillSplit(billId: string, debtorMemberId: string) {
    if (!household) return;
    try {
      await api.patch(`/households/${household.id}/bills/${billId}/splits/${debtorMemberId}/settle`);
      loadData();
    } catch (err) {
      console.error('Failed to settle bill split', err);
    }
  }
  
  const myBillBalances = billBalances.filter(
    (b) => b.from_member_id === member?.id || b.to_member_id === member?.id
  );

  const upcomingRotation = [...rotations]
    .filter((r) => r.next_due_date)
    .sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime())[0];

  const upcomingBills = [...bills]
    .filter((b) => b.next_due_date)
    .sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime())
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.wordmark}>Hearth</Text>
          <Pressable onPress={() => navigation.navigate('Invite' as never)} style={styles.inviteIcon}>
            <Feather name="users" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => signOut()} style={styles.inviteIcon}>
            <Feather name="log-out" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : (
          <>
            <Card style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Your balance</Text>
              <MoneyText
                amount={formatNaira(Math.abs(netBalance))}
                direction={netBalance >= 0 ? 'in' : 'out'}
                size={32}
                style={styles.balanceAmount}
              />
              {myBalances.length === 0 && (
                <Text style={styles.balanceLine}>You're settled up.</Text>
              )}
              {myBalances.map((b, index) => {
                const youAreOwed = b.to_member_id === member?.id;
                const otherId = youAreOwed ? b.from_member_id : b.to_member_id;
                return (
                  <View key={index} style={styles.balanceRow}>
                    <Text style={styles.balanceLine}>
                      {youAreOwed ? `${displayNameFor(otherId)} owes you` : `You owe ${displayNameFor(otherId)}`}
                    </Text>
                    <MoneyText
                      amount={formatNaira(Number(b.amount))}
                      direction={youAreOwed ? 'in' : 'out'}
                      size={14}
                    />
                  </View>
                );
              })}
            </Card>

            

            {myBillBalances.length > 0 && (
              <Card style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Bills</Text>
                {myBillBalances.map((b, index) => {
                  const youAreOwed = b.to_member_id === member?.id;
                  const otherId = youAreOwed ? b.from_member_id : b.to_member_id;
                  return (
                    <View key={index} style={styles.billBalanceRow}>
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLine}>
                          {youAreOwed ? `${displayNameFor(otherId)} owes you` : `You owe ${displayNameFor(otherId)}`}
                        </Text>
                        <MoneyText
                          amount={formatNaira(Number(b.amount))}
                          direction={youAreOwed ? 'in' : 'out'}
                          size={14}
                        />
                      </View>
                      <Text style={styles.billBalanceTag}>{b.bill_name}</Text>
                      {youAreOwed && (
                        <Pressable onPress={() => handleSettleBillSplit(b.bill_id, otherId)}>
                          <Text style={styles.settleLink}>Mark paid</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </Card>
            )}

            

            {upcomingRotation && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>This week</Text>
                </View>
                <Card style={styles.rowCard}>
                  <IconBadge tone="secondary">
                    <Feather name="refresh-cw" size={18} color={colors.secondary} />
                  </IconBadge>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{upcomingRotation.name}</Text>
                    <Text style={styles.rowSubtitle}>
                      {displayNameFor(upcomingRotation.current_member_id)}'s turn ·{' '}
                      {dueLabel(upcomingRotation.is_due, daysUntil(upcomingRotation.next_due_date))}
                    </Text>
                  </View>
                  <Avatar
                    initial={displayNameFor(upcomingRotation.current_member_id).charAt(0).toUpperCase()}
                    variant="solid"
                    size={34}
                  />
                </Card>
              </>
            )}

            {upcomingBills.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Coming up</Text>
                </View>
                {upcomingBills.map((bill, index) => (
                  <Card key={bill.id} style={styles.rowCard}>
                    <IconBadge tone={index % 2 === 0 ? 'primary' : 'secondary'}>
                      <Feather
                        name="credit-card"
                        size={18}
                        color={index % 2 === 0 ? colors.primary : colors.secondary}
                      />
                    </IconBadge>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{bill.name}</Text>
                      <Text style={styles.rowSubtitle}>{dueLabel(bill.is_due, daysUntil(bill.next_due_date))}</Text>
                    </View>
                    <MoneyText amount={formatNaira(bill.total_amount)} direction="neutral" size={14} />
                  </Card>
                ))}
              </>
            )}

            {!upcomingRotation && upcomingBills.length === 0 && (
              <Text style={styles.emptyText}>Nothing due right now.</Text>
            )}
          </>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('LogExpense' as never)}>
        <Feather name="plus" size={24} color={colors.surface} />
      </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    color: colors.primary,
  },
  inviteIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    gap: spacing.sm,
  },
  balanceLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  balanceAmount: {
    marginBottom: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLine: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
    billBalanceRow: {
    marginBottom: spacing.sm,
  },
  billBalanceTag: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settleLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.primary,
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#202521',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
});