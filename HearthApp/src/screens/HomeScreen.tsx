import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import IconBadge from '../components/IconBadge';
import MoneyText from '../components/MoneyText';
import { colors, fontFamily, spacing, radius } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { signOut } = useAuth();

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

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <MoneyText amount="₦8,200" direction="in" size={32} style={styles.balanceAmount} />
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLine}>Amaka owes you</Text>
            <MoneyText amount="₦4,900" direction="in" size={14} />
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLine}>Zainab owes you</Text>
            <MoneyText amount="₦3,300" direction="in" size={14} />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This week</Text>
        </View>
        <Card style={styles.rowCard}>
          <IconBadge tone="secondary">
            <Feather name="droplet" size={18} color={colors.secondary} />
          </IconBadge>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Water refill</Text>
            <Text style={styles.rowSubtitle}>Zainab's turn · due in 3 days</Text>
          </View>
          <Avatar initial="Z" variant="solid" size={34} />
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Coming up</Text>
        </View>
        <Card style={styles.rowCard}>
          <IconBadge tone="primary">
            <Feather name="wifi" size={18} color={colors.primary} />
          </IconBadge>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Internet</Text>
            <Text style={styles.rowSubtitle}>due in 5 days</Text>
          </View>
          <MoneyText amount="₦4,000" direction="neutral" size={14} />
        </Card>
        <Card style={styles.rowCard}>
          <IconBadge tone="secondary">
            <Feather name="feather" size={18} color={colors.secondary} />
          </IconBadge>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Cleaning service</Text>
            <Text style={styles.rowSubtitle}>due tomorrow</Text>
          </View>
          <MoneyText amount="₦3,433" direction="neutral" size={14} />
        </Card>
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