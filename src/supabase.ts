import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

const DEFAULT_SUPABASE_URL = 'https://qtboywnuopgpgmspxxng.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Ym95d251b3BncGdtc3B4eG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTI1MTksImV4cCI6MjEwNjIyODUxOX0.R7lPKh3SZhePIUCbv8sow1sGR7zMsmtuiFczg8_1rRk';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_') &&
  !supabaseAnonKey.includes('YOUR_'),
);

// Fallback values are never used to authenticate: AuthProvider checks
// supabaseConfigured and shows a setup error before making any request.
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://not-configured.supabase.co',
  supabaseAnonKey ?? 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
