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
      bg: '#FFF7F1',
      bgSecondary: '#FFF4EC',
      panel: '#FFFFFF',
      panel2: '#FFF4EC',
      red: '#B70201',
      deep: '#8E0101',
      gold: '#8A6500',
      white: '#1D1617',
      cream: '#514548',
      muted: '#716469',
      line: '#EADFD8',
      green: '#176C46',
      border: '#EADFD8',
      input: '#FFFFFF',
      chip: '#FFFFFF',
      soft: '#FFF4EC',
      dangerSoft: '#FFF0EB',
      error: '#A42320',
      shadow: '#5C2923',
      glass: 'rgba(255,255,255,0.78)',
      glassStrong: 'rgba(255,255,255,0.92)',
      highlight: 'rgba(255,255,255,0.9)',
    },
  },
  dark: {
    ...shared,
    colors: {
      bg: '#070708',
      bgSecondary: '#0D0D0F',
      panel: '#202024',
      panel2: '#29282D',
      red: '#E62424',
      deep: '#8E0101',
      gold: '#F6C84C',
      white: '#FFFFFF',
      cream: '#F1DCC0',
      muted: '#B8AAA0',
      line: 'rgba(255,255,255,0.11)',
      green: '#4ADE80',
      border: 'rgba(255,255,255,0.13)',
      input: 'rgba(20,19,23,0.9)',
      chip: 'rgba(255,255,255,0.055)',
      soft: 'rgba(255,255,255,0.045)',
      dangerSoft: 'rgba(166,17,17,0.16)',
      error: '#FF8C82',
      shadow: '#000000',
      glass: 'rgba(32,32,36,0.78)',
      glassStrong: 'rgba(41,40,45,0.92)',
      highlight: 'rgba(255,255,255,0.08)',
    },
  },
} as const;

export type ThemeMode = keyof typeof themeTokens;
export type ThemeTokens = (typeof themeTokens)[ThemeMode];
export type ThemeColors = ThemeTokens['colors'];
