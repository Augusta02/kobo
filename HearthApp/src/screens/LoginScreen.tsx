import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, radius } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError('Could not sign in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Hearth</Text>
      <Text style={styles.subtitle}>Sign in to your household</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
            <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
            </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={submitting ? 'Signing in…' : 'Sign in'}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 6,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
});