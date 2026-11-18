import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fontFamily, radius, spacing } from '../theme';

export default function InviteScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Add your housemates</Text>
      </View>
      <Text style={styles.headerSubtitle}>Hearth works best with everyone in</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.label}>Household name</Text>
          <TextInput style={styles.input} defaultValue="Flat 4B, Chevron Drive" />
        </View>

        <View>
          <Text style={styles.label}>Members</Text>
          <View style={styles.memberList}>
            <View style={styles.memberRow}>
              <Avatar initial="N" variant="solid" size={38} />
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>
                  Nene <Text style={styles.memberYou}>· you</Text>
                </Text>
                <Text style={styles.memberStatus}>Admin</Text>
              </View>
            </View>
            <View style={styles.memberRow}>
              <Avatar initial="A" variant="tint" size={38} />
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>Amaka</Text>
                <Text style={styles.memberStatusJoined}>Joined 2 days ago</Text>
              </View>
            </View>
            <View style={styles.memberRow}>
              <View style={styles.pendingAvatar}>
                <Text style={styles.pendingInitial}>Z</Text>
              </View>
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>Zainab</Text>
                <Text style={styles.memberStatusPending}>Invited · waiting to join</Text>
              </View>
              <Text style={styles.resendLink}>Resend</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>Copy invite link</Text>
          </Pressable>
          <PrimaryButton label="Continue" onPress={() => navigation.goBack()} />
        </View>
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
  },
  headerTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    paddingHorizontal: spacing.lg,
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
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
  memberList: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  memberBody: {
    flex: 1,
  },
  memberName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  memberYou: {
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  memberStatus: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  memberStatusJoined: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.success,
    marginTop: 1,
  },
  memberStatusPending: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.warning,
    marginTop: 1,
  },
  pendingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#C7CDBC',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInitial: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.warning,
  },
  resendLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.warning,
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },
});