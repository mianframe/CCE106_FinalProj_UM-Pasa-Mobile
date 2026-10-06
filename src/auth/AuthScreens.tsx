import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { supabaseConfigured } from '../supabase';
import { useTheme } from '../theme/ThemeContext';
import { themeTokens, type ThemeMode } from '../theme/tokens';

function AuthField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: any) {
  const { mode } = useTheme();
  const C = themeTokens[mode].colors;
  const s = createStyles(mode);

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={C.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={s.field}
      />
    </View>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { mode } = useTheme();
  const s = createStyles(mode);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/UMPASALOGO.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.tagline}>ACADEMIC RESOURCE MARKETPLACE</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SubmitButton({ title, busy, onPress }: { title: string; busy: boolean; onPress: () => void }) {
  const { mode } = useTheme();
  const s = createStyles(mode);

  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[s.buttonShell, busy && { opacity: 0.65 }]}>
      <LinearGradient colors={['#f23b31', '#b70201', '#790101']} style={s.button}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={s.buttonText}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

export function LoginScreen({ navigation }: any) {
  const { login, resetPassword, profileError } = useAuth();
  const { mode } = useTheme();
  const s = createStyles(mode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your university email and password.');
      return;
    }
    if (!/^[^\s@]+@umindanao\.edu\.ph$/i.test(email.trim())) {
      setError('Use your @umindanao.edu.ph email address.');
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setForgotMsg('');
    setError('');
    if (!forgotEmail.trim()) {
      setError('Enter your UM email to receive a password reset link.');
      return;
    }
    if (!/^[^\s@]+@umindanao\.edu\.ph$/i.test(forgotEmail.trim())) {
      setError('Use your @umindanao.edu.ph email address.');
      return;
    }
    setForgotBusy(true);
    try {
      await resetPassword(forgotEmail);
      setForgotMsg('Password reset instructions sent. Please check your university email.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send reset instructions.');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome to UM-Pasa" subtitle="Sign in to continue to your campus marketplace.">
      <AuthField label="UM email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {!supabaseConfigured && profileError ? <Text style={s.error}>{profileError}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <SubmitButton title="Sign in" busy={busy} onPress={submit} />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setShowForgot(!showForgot);
          setForgotEmail(email || forgotEmail);
          setError('');
          setForgotMsg('');
        }}
      >
        <Text style={s.forgotLink}>{showForgot ? '− Close password recovery' : 'Forgot password?'}</Text>
      </Pressable>
      {showForgot && (
        <View style={s.forgotBox}>
          <Text style={s.forgotTitle}>Password recovery</Text>
          <Text style={s.forgotText}>Enter your student email to receive a secure password reset link.</Text>
          <AuthField label="UM email for recovery" value={forgotEmail} onChangeText={setForgotEmail} keyboardType="email-address" autoCapitalize="none" />
          {forgotMsg ? <Text style={s.success}>{forgotMsg}</Text> : null}
          <SubmitButton title={forgotBusy ? 'Sending link…' : 'Send password reset link'} busy={forgotBusy} onPress={sendReset} />
        </View>
      )}
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={s.link}>New to UM-Pasa? Create a student account</Text>
      </Pressable>
      <Text style={s.note}>Use your University of Mindanao student email.</Text>
    </AuthLayout>
  );
}

export function RegisterScreen({ navigation }: any) {
  const { register, profileError } = useAuth();
  const { mode } = useTheme();
  const s = createStyles(mode);

  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!fullName.trim() || !email.trim() || !password || !confirm) {
      setError('Complete your name, email, password, and confirmation.');
      return;
    }
    if (!/^[^\s@]+@umindanao\.edu\.ph$/i.test(email.trim())) {
      setError('Registration requires an @umindanao.edu.ph email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    if (studentNumber.trim().length > 50) {
      setError('Student number must be 50 characters or fewer.');
      return;
    }
    setBusy(true);
    try {
      const result = await register({ fullName, email, password, studentNumber });
      setSuccess(
        result.needsEmailConfirmation
          ? 'Account created. Check your university email to confirm it, then sign in.'
          : 'Your student account is ready. You are now signed in.'
      );
      if (result.needsEmailConfirmation) {
        setTimeout(() => navigation.navigate('Login'), 1200);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create student account" subtitle="Register with your University of Mindanao email.">
      <AuthField label="Full name" value={fullName} onChangeText={setFullName} />
      <AuthField label="Student number (optional)" value={studentNumber} onChangeText={setStudentNumber} autoCapitalize="characters" />
      <AuthField label="UM email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <AuthField label="Password (8 characters minimum)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
      {!supabaseConfigured && profileError ? <Text style={s.error}>{profileError}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      {success ? <Text accessibilityRole="alert" style={s.success}>{success}</Text> : null}
      <SubmitButton title="Create student account" busy={busy} onPress={submit} />
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={s.link}>Already registered? Sign in</Text>
      </Pressable>
      <Text style={s.note}>New accounts are created with the Student role. Admin access is assigned separately.</Text>
    </AuthLayout>
  );
}

function createStyles(mode: ThemeMode) {
  const C = themeTokens[mode].colors;
  const isDark = mode === 'dark';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    page: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 36 },
    logo: { width: 170, height: 110, alignSelf: 'center', marginBottom: 4 },
    tagline: { textAlign: 'center', letterSpacing: 2.2, color: C.gold, fontWeight: '800', fontSize: 10, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', color: C.white, marginBottom: 5, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: C.cream, lineHeight: 19, marginBottom: 16 },
    fieldWrap: { marginBottom: 12 },
    label: { color: C.cream, fontWeight: '700', fontSize: 13, marginBottom: 6 },
    field: {
      color: C.white,
      backgroundColor: C.input,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 44,
    },
    buttonShell: {
      borderRadius: 14,
      overflow: 'hidden',
      marginVertical: 6,
      minHeight: 48,
      shadowColor: '#b70201',
      shadowOpacity: 0.23,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
    button: { paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
    buttonText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },
    link: { textAlign: 'center', color: C.gold, fontWeight: '800', marginTop: 18, padding: 8 },
    forgotLink: { textAlign: 'center', color: C.cream, fontWeight: '700', fontSize: 13, marginTop: 12, padding: 6 },
    forgotBox: {
      marginTop: 12,
      marginBottom: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: C.panel,
      borderWidth: 1,
      borderColor: C.border,
    },
    forgotTitle: { color: C.gold, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    forgotText: { color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
    note: { textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 16 },
    error: { color: isDark ? '#ff8c82' : C.red, fontSize: 14, marginBottom: 12 },
    success: { color: C.green, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  });
}
