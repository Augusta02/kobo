import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Card from '../components/Card';
import IconBadge from '../components/IconBadge';
import Avatar from '../components/Avatar';
import { colors, fontFamily, spacing, radius } from '../theme';

export default function RotationsScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rotations</Text>
        <Text style={styles.subtitle}>Shared duties, taken in turns</Text>

        <Card style={styles.rotationCard}>
          <View style={styles.rotationHeader}>
            <IconBadge tone="secondary">
              <Feather name="droplet" size={18} color={colors.secondary} />
            </IconBadge>
            <View style={styles.rotationBody}>
              <Text style={styles.rotationTitle}>Water refill</Text>
              <Text style={styles.rotationSubtitle}>every 10 days</Text>
            </View>
            <View style={styles.noCostTag}>
              <Text style={styles.noCostLabel}>no cost split</Text>
            </View>
          </View>
          <View style={styles.avatarStack}>
            <Avatar initial="N" variant="tint" size={32} />
            <Avatar initial="A" variant="tint" size={32} />
            <Avatar initial="Z" variant="solid" size={32} />
          </View>
        </Card>

        <Card style={styles.rotationCard}>
          <View style={styles.rotationHeader}>
            <IconBadge tone="primary">
              <Feather name="trash-2" size={18} color={colors.primary} />
            </IconBadge>
            <View style={styles.rotationBody}>
              <Text style={styles.rotationTitle}>Take out the bins</Text>
              <Text style={styles.rotationSubtitle}>every 3 days</Text>
            </View>
            <View style={styles.noCostTag}>
              <Text style={styles.noCostLabel}>no cost split</Text>
            </View>
          </View>
          <View style={styles.avatarStack}>
            <Avatar initial="N" variant="solid" size={32} />
            <Avatar initial="A" variant="tint" size={32} />
            <Avatar initial="Z" variant="tint" size={32} />
          </View>
        </Card>

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
  noCostTag: {
    backgroundColor: colors.secondaryTint,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.input - 2,
  },
  noCostLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: colors.secondary,
  },
  avatarStack: {
    flexDirection: 'row',
    gap: spacing.sm,
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