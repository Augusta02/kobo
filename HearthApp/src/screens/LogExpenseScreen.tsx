import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/apiClient';
import { auth } from '../lib/firebase';
import { API_BASE_URL } from '../lib/config';
import { colors, fontFamily, radius, spacing } from '../theme';

const categories = ['Fuel', 'Generator repair', 'Other'];

type ReceiptPreview = {
  uri: string;
  name: string;
  isImage: boolean;
};

// Fetching the local file into a real Blob (instead of appending the
// {uri, name, type} shorthand straight to FormData) avoids RN's
// "Unsupported FormDataPart implementation" error on newer RN versions.
async function uploadReceipt(
  householdId: string,
  uri: string,
  filename: string
): Promise<{ total: number | null; s3_key: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  const idToken = await user.getIdToken();

  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch(`${API_BASE_URL}/households/${householdId}/expenses/scan-receipt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

export default function LogExpenseScreen() {
  const navigation = useNavigation();
  const { household, member, members } = useAuth();

  const [receipt, setReceipt] = useState<ReceiptPreview | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Fuel');
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = parseFloat(amount.replace(/,/g, '')) || 0;

  function toggleParticipant(memberId: string) {
    setParticipantIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  }

  async function handleReceiptPicked(uri: string, name: string, isImage: boolean) {
    setError(null);
    setReceipt({ uri, name, isImage });
    setS3Key(null);
    if (!household) return;

    setScanning(true);
    try {
      const result = await uploadReceipt(household.id, uri, name);
      setS3Key(result.s3_key);
      if (result.total != null) {
        setAmount(String(result.total));
      } else {
        setError("Couldn't find a total on that receipt — enter the amount by hand.");
      }
    } catch (err) {
      console.error('Failed to scan receipt', err);
      setError("Couldn't read that receipt — you can still enter the amount by hand.");
    } finally {
      setScanning(false);
    }
  }

  async function handleTakePhoto() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? 'receipt.jpg';
      await handleReceiptPicked(asset.uri, name, true);
    }
  }

  async function handlePickFromLibrary() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName ?? 'receipt.jpg';
      await handleReceiptPicked(asset.uri, name, true);
    }
  }

  async function handlePickDocument() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const isImage = (asset.mimeType ?? '').startsWith('image/');
    await handleReceiptPicked(asset.uri, asset.name, isImage);
  }

  async function handleSubmit() {
    setError(null);

    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (participantIds.length === 0) {
      setError('Pick at least one person to split with.');
      return;
    }
    if (!household || !member) {
      setError("Still loading your household — try again in a moment.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/households/${household.id}/expenses`, {
        name: category,
        category,
        total_amount: amountValue,
        participant_ids: participantIds,
        contributions: [{ member_id: member.id, amount_contributed: amountValue }],
        s3_key: s3Key,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to log expense', err);
      setError("Couldn't log the expense — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Log an expense</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          {receipt?.isImage ? (
            <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
          ) : receipt ? (
            <View style={styles.receiptPlaceholder}>
              <Text style={styles.receiptText}>📄 {receipt.name}</Text>
            </View>
          ) : (
            <View style={styles.receiptPlaceholder}>
              <Text style={styles.receiptText}>No receipt yet</Text>
            </View>
          )}

          {scanning && (
            <View style={styles.scanningRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.scanningText}>Reading receipt…</Text>
            </View>
          )}

          <View style={styles.receiptActions}>
            <Pressable onPress={handleTakePhoto}>
              <Text style={styles.retakeLink}>{receipt ? 'Retake photo' : 'Take photo'}</Text>
            </Pressable>
            <Pressable onPress={handlePickFromLibrary}>
              <Text style={styles.retakeLink}>Choose from library</Text>
            </Pressable>
            <Pressable onPress={handlePickDocument}>
              <Text style={styles.retakeLink}>Upload PDF / file</Text>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Total detected</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <Text style={styles.helperText}>From your receipt — check it's right before saving.</Text>
        </View>

        <View>
          <Text style={styles.label}>What was this for</Text>
          <View style={styles.pillRow}>
            {categories.map((item) => {
              const active = item === category;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Split with</Text>
          <View style={styles.avatarRow}>
            {members.map((m) => {
              const active = participantIds.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleParticipant(m.id)}
                  style={[styles.avatarOption, !active && styles.avatarOptionMuted]}
                >
                  <Avatar initial={m.display_name.charAt(0).toUpperCase()} variant={active ? 'solid' : 'outline'} size={44} />
                  <Text style={active ? styles.avatarLabel : styles.avatarLabelMuted}>{m.display_name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {amountValue > 0 && participantIds.length > 0 && (
          <Card style={styles.splitCard}>
            <Text style={styles.splitSummary}>
              Split {participantIds.length} way{participantIds.length > 1 ? 's' : ''} · ₦
              {Math.round(amountValue / participantIds.length).toLocaleString()} each
            </Text>
            {members.map((m) => {
              const isParticipant = participantIds.includes(m.id);
              if (!isParticipant) {
                return (
                  <View key={m.id} style={styles.splitRow}>
                    <Text style={styles.splitNameMuted}>{m.display_name}</Text>
                    <Text style={styles.splitOut}>sitting this one out</Text>
                  </View>
                );
              }

              const share = amountValue / participantIds.length;
              const isYou = m.id === member?.id;
              return (
                <View key={m.id} style={styles.splitRow}>
                  <Text style={styles.splitName}>{m.display_name}</Text>
                  <Text style={isYou ? styles.splitPaid : styles.splitOwes}>
                    ₦{Math.round(share).toLocaleString()} · {isYou ? 'you paid' : 'owes you'}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton
          label={submitting ? 'Saving…' : 'Log expense'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  receiptPlaceholder: {
    height: 190,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptImage: {
    height: 190,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    resizeMode: 'cover',
  },
  receiptText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  scanningText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: 10,
  },
  retakeLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  amountWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: colors.textPrimary,
    zIndex: 1,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingVertical: 14,
    paddingLeft: 36,
    paddingRight: 16,
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  helperText: {
    marginTop: 6,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  pillLabelActive: {
    fontFamily: fontFamily.semibold,
    color: colors.surface,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarOption: {
    alignItems: 'center',
    gap: 6,
  },
  avatarOptionMuted: {
    opacity: 0.55,
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
  splitCard: {
    gap: spacing.sm,
  },
  splitSummary: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitName: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  splitNameMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  splitPaid: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.success,
  },
  splitOwes: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.success,
  },
  splitOut: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.error,
  },
});