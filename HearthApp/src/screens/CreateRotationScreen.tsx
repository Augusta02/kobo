import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';
import { colors, fontFamily, radius, spacing } from '../theme';

const people = [
  { initial: 'N', name: 'Nene' },
  { initial: 'A', name: 'Amaka' },
  { initial: 'Z', name: 'Zainab' },
];

export default function CreateRotationScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [repeatsEvery, setRepeatsEvery] = useState('10');
  const [remind, setRemind] = useState('1');
  const [selected, setSelected] = useState<string[]>(['N', 'A', 'Z']);
  const [splitCost, setSplitCost] = useState(false);

  const toggleSelected = (initial: string) => {
    setSelected((prev) =>
      prev.includes(initial) ? prev.filter((item) => item !== initial) : [...prev, initial]
    );
  };

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
              onChangeText={setRepeatsEvery}
              keyboardType="numeric"
            />
            <Text style={styles.suffix}>days</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Remind</Text>
            <TextInput
              style={styles.input}
              value={remind}
              onChangeText={setRemind}
              keyboardType="numeric"
            />
            <Text style={styles.suffix}>days before</Text>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Who takes turns</Text>
          <View style={styles.avatarRow}>
            {people.map((person) => {
              const active = selected.includes(person.initial);
              return (
                <Pressable
                  key={person.initial}
                  onPress={() => toggleSelected(person.initial)}
                  style={styles.avatarOption}
                >
                  <Avatar initial={person.initial} variant={active ? 'solid' : 'outline'} size={44} />
                  <Text style={active ? styles.avatarLabel : styles.avatarLabelMuted}>{person.name}</Text>
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

        <PrimaryButton label="Create rotation" onPress={() => navigation.goBack()} />
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
});