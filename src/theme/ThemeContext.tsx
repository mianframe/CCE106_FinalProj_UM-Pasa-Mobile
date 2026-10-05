import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeTokens, type ThemeMode, type ThemeTokens } from './tokens';

export type { ThemeMode } from './tokens';
type ThemeContextValue = { mode: ThemeMode; tokens: ThemeTokens; setMode: (mode: ThemeMode) => void };
const STORAGE_KEY = 'um-pasa-appearance';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, updateMode] = useState<ThemeMode>('light');
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') updateMode(stored);
    }).catch(() => undefined);
  }, []);
  const setMode = useCallback((next: ThemeMode) => {
    updateMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ mode, tokens: themeTokens[mode], setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
