import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../supabase';
import type { ProfileRow } from '../database.types';

export type Profile = ProfileRow;

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
};

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  studentNumber?: string;
};

type AuthContextValue = {
  session: Session | null;
  authUser: SupabaseUser | null;
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (values: Pick<Profile, 'full_name' | 'student_number' | 'department' | 'program'>) => Promise<void>;
  updatePassword: (password: string, currentPassword?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) return 'That email is already registered. Try signing in instead.';
  if (lower.includes('student_number') || lower.includes('profiles_student_number_key')) return 'That student number is already linked to an account.';
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email from the message we sent, then sign in.';
  if (lower.includes('password should be at least')) return 'Use a password with at least 8 characters.';
  if (lower.includes('row-level security') || lower.includes('permission denied')) return 'UM-Pasa could not save your profile. Check that the Phase 1 profile policies and registration trigger are installed.';
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Cannot reach Supabase. Check your internet connection and Supabase project settings.';
  return message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      setProfile(null);
      setProfileError(authErrorMessage(error.message));
      throw new Error(authErrorMessage(error.message));
    }
    setProfile(data as Profile);
    setProfileError(null);
    return data as Profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      return null;
    }
    return loadProfile(authUser.id);
  }, [authUser, loadProfile]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      setProfileError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to this project’s .env file, then restart Expo.');
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setLoading(true);
      // Query after the auth callback returns to avoid re-entering Supabase Auth's lock.
      setTimeout(() => {
        if (active) loadProfile(nextSession.user.id).catch(() => undefined).finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    });

    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setProfileError(authErrorMessage(error.message));
        setLoading(false);
        return;
      }
      setSession(data.session);
      setAuthUser(data.session?.user ?? null);
      if (data.session?.user) {
        try { await loadProfile(data.session.user.id); } catch { /* shown through profileError */ }
      }
      if (active) setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) throw new Error('Add your Supabase project URL and anon/publishable key to this project’s .env file, then restart Expo.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error(authErrorMessage(error.message));
    if (!data.user) throw new Error('Sign in did not return a user. Please try again.');
    await loadProfile(data.user.id);
  }, [loadProfile]);

  const register = useCallback(async ({ fullName, email, password, studentNumber }: RegisterInput) => {
    if (!supabaseConfigured) throw new Error('Add your Supabase project URL and anon/publishable key to this project’s .env file, then restart Expo.');
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          student_number: studentNumber?.trim() || null,
          role: 'student',
        },
      },
    });
    if (error) {
      if (studentNumber?.trim() && error.message.toLowerCase().includes('database error saving new user')) {
        throw new Error('The account could not be created with this student number. It may already be linked to another account; if it is unique, check the profile trigger and schema.');
      }
      throw new Error(authErrorMessage(error.message));
    }
    if (!data.user) throw new Error('Account creation did not return a user. Please try again.');

    // Phase 1's auth.users trigger creates the profile even if email confirmation
    // is enabled. If sign-up returns a session, verify the row is immediately readable.
    if (data.session) await loadProfile(data.user.id);
    return { needsEmailConfirmation: !data.session };
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(authErrorMessage(error.message));
  }, []);

  const updateProfile = useCallback(async (values: Pick<Profile, 'full_name' | 'student_number' | 'department' | 'program'>) => {
    if (!authUser) throw new Error('Sign in again to update your profile.');
    const { error } = await supabase.from('profiles').update({
      full_name: values.full_name.trim(),
      student_number: values.student_number?.trim() || null,
      department: values.department?.trim() || null,
      program: values.program?.trim() || null,
    }).eq('id', authUser.id);
    if (error) throw new Error(authErrorMessage(error.message));
    await loadProfile(authUser.id);
  }, [authUser, loadProfile]);

  const updatePassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    if (currentPassword && authUser?.email) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('Current password is incorrect. Please check and try again.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(authErrorMessage(error.message));
  }, [authUser]);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabaseConfigured) throw new Error('Supabase is not configured.');
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: 'umpasa://reset-password',
    });
    if (error) throw new Error(authErrorMessage(error.message));
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!authUser) throw new Error('Sign in again to delete your account.');
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw new Error(authErrorMessage(error.message));
    await logout();
  }, [authUser, logout]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    authUser,
    user: profile && authUser ? {
      id: authUser.id,
      name: profile.full_name,
      email: authUser.email ?? '',
      role: profile.role,
    } : null,
    profile,
    loading,
    profileError,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    updatePassword,
    resetPassword,
    deleteAccount,
  }), [session, authUser, profile, loading, profileError, login, register, logout, refreshProfile, updateProfile, updatePassword, resetPassword, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
