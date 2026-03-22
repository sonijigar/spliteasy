export const colors = {
  bg: '#0f0f1a',
  bgCard: '#1a1a2e',
  bgCardHover: '#222240',
  primary: '#e8505b',
  primaryDark: '#d63447',
  green: '#14a76c',
  text: '#e8e8f0',
  textSecondary: '#888a9e',
  textMuted: '#555a70',
  border: 'rgba(255,255,255,0.08)',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.5)',
};

export const fonts = {
  regular: { fontSize: 15, color: colors.text },
  bold: { fontSize: 15, fontWeight: '700', color: colors.text },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  caption: { fontSize: 13, color: colors.textSecondary },
  mono: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.text },
  monoLarge: { fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.white },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
