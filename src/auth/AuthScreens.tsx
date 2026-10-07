import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { Ionicons } from '@expo/vector-icons';
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
          <Text style={s.tagline}>UM TAGUM COLLEGE · ACADEMIC MARKETPLACE</Text>
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
  const C = themeTokens[mode].colors;
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

  const handleGoogleWorkspace = () => {
    Alert.alert(
      'UM Institutional Google Account',
      'University of Mindanao Tagum College student emails are powered by Google Workspace for Education (@umindanao.edu.ph).\n\n• For in-app access, enter your student email credentials below.\n• Need to verify your inbox or reset your password on Gmail?',
      [
        {
          text: 'Auto-fill @umindanao',
          onPress: () => {
            if (!email.includes('@')) {
              setEmail(prev => prev.trim() ? `${prev.trim()}@umindanao.edu.ph` : '@umindanao.edu.ph');
            }
          },
        },
        {
          text: 'Open Gmail',
          onPress: () => Linking.openURL('https://mail.google.com').catch(() => {}),
        },
        { text: 'Got it', style: 'cancel' },
      ]
    );
  };

  return (
    <AuthLayout title="Welcome to UM-Pasa" subtitle="Sign in to continue to your campus marketplace.">
      {/* Modern Google Workspace SSO Entrypoint */}
      <Pressable
        accessibilityRole="button"
        onPress={handleGoogleWorkspace}
        style={s.googleButton}
      >
        <View style={s.googleIconCircle}>
          <Ionicons name="logo-google" size={17} color="#EA4335" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.googleButtonTitle}>Sign in with UM Google Account</Text>
          <Text style={s.googleButtonSub}>Institutional @umindanao.edu.ph Workspace</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.cream} />
      </Pressable>

      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>OR SIGN IN WITH EMAIL</Text>
        <View style={s.dividerLine} />
      </View>

      <AuthField label="UM email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {email.length > 0 && !email.includes('@') && (
        <Pressable
          onPress={() => setEmail(`${email.trim()}@umindanao.edu.ph`)}
          style={s.emailChip}
        >
          <Ionicons name="sparkles" size={12} color={C.gold} />
          <Text style={s.emailChipText}>Tap to add @umindanao.edu.ph</Text>
        </Pressable>
      )}
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
  const C = themeTokens[mode].colors;
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
    if (!fullName.trim() || !studentNumber.trim() || !email.trim() || !password || !confirm) {
      setError('Complete your full name, student ID, email, and password.');
      return;
    }
    if (studentNumber.trim().length < 4 || studentNumber.trim().length > 50) {
      setError('Enter a valid University of Mindanao student ID number.');
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
    setBusy(true);
    try {
      const result = await register({ fullName, email, password, studentNumber: studentNumber.trim() });
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
      <AuthField label="Student ID number (e.g. 2024-12345)" value={studentNumber} onChangeText={setStudentNumber} autoCapitalize="characters" />
      <AuthField label="UM email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {email.length > 0 && !email.includes('@') && (
        <Pressable
          onPress={() => setEmail(`${email.trim()}@umindanao.edu.ph`)}
          style={s.emailChip}
        >
          <Ionicons name="sparkles" size={12} color={C.gold} />
          <Text style={s.emailChipText}>Tap to add @umindanao.edu.ph</Text>
        </Pressable>
      )}
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
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: C.panel,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    googleIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EAE0D8',
    },
    googleButtonTitle: {
      color: C.white,
      fontWeight: '800',
      fontSize: 13,
    },
    googleButtonSub: {
      color: C.muted,
      fontSize: 11,
      marginTop: 2,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },
    dividerText: {
      color: C.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    emailChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(246,200,76,0.15)' : '#FFF3D6',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(246,200,76,0.3)' : '#FFE082',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: -4,
      marginBottom: 12,
    },
    emailChipText: {
      color: isDark ? C.gold : '#8A6500',
      fontSize: 11,
      fontWeight: '800',
    },
    note: { textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 16 },
    error: { color: isDark ? '#ff8c82' : C.red, fontSize: 14, marginBottom: 12 },
    success: { color: C.green, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  });
}
