/** Shared visual foundation for UM-Pasa. Keep semantic values here so screens
 * and reusable primitives can evolve without drifting between themes. */
const shared = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 },
  radius: { small: 11, medium: 16, large: 22, container: 28, pill: 999 },
  typography: {
    screenTitle: 24,
    sectionTitle: 17,
    body: 14,
    metadata: 12,
    label: 13,
  },
  elevation: { card: 2, floating: 8 },
} as const;

export const themeTokens = {
  light: {
    ...shared,
    colors: {
      bg: '#FAF7F5',
      bgSecondary: '#F4EFEA',
      panel: '#FFFFFF',
      panel2: '#F7F2ED',
      red: '#990000',
      deep: '#770000',
      gold: '#8A6500',
      white: '#181314',
      cream: '#4A3F42',
      muted: '#6E6266',
      line: '#E6DCD6',
      green: '#15803D',
      border: '#E6DCD6',
      input: '#FFFFFF',
      chip: '#FFFFFF',
      soft: '#F5EFEB',
      dangerSoft: '#FDF2F2',
      error: '#A42320',
      shadow: '#3D1C19',
      glass: 'rgba(255,255,255,0.85)',
      glassStrong: 'rgba(255,255,255,0.95)',
      highlight: 'rgba(255,255,255,0.9)',
    },
  },
  dark: {
    ...shared,
    colors: {
      bg: '#0E0E12',
      bgSecondary: '#15151B',
      panel: '#1B1B22',
      panel2: '#24242D',
      red: '#E62424',
      deep: '#990000',
      gold: '#F6C84C',
      white: '#FFFFFF',
      cream: '#E8DDD3',
      muted: '#A89C97',
      line: 'rgba(255,255,255,0.11)',
      green: '#4ADE80',
      border: 'rgba(255,255,255,0.12)',
      input: '#15151B',
      chip: 'rgba(255,255,255,0.065)',
      soft: 'rgba(255,255,255,0.05)',
      dangerSoft: 'rgba(230,36,36,0.14)',
      error: '#FF8C82',
      shadow: '#000000',
      glass: 'rgba(27,27,34,0.85)',
      glassStrong: 'rgba(36,36,45,0.95)',
      highlight: 'rgba(255,255,255,0.08)',
    },
  },
} as const;

export type ThemeMode = keyof typeof themeTokens;
export type ThemeTokens = (typeof themeTokens)[ThemeMode];
export type ThemeColors = ThemeTokens['colors'];
