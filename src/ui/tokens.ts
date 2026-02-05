/**
 * Shared UI style tokens.
 * Warm neutral palette with liquid glass effects.
 */

/**
 * Warm grey palette with slight beige/stone undertone.
 * Named from dark to light.
 */
export const colors = {
  // Text colors
  text: {
    primary: '#2d2a26',      // Warm charcoal
    secondary: '#5c5650',    // Warm grey
    tertiary: '#8a847c',     // Muted warm grey
    muted: '#a9a29a',        // Light warm grey
    placeholder: '#c4bdb4',  // Very light warm grey
  },

  // Background colors
  bg: {
    page: '#f9f7f4',         // Warm off-white
    elevated: '#fdfcfa',     // Slightly warmer white
    subtle: 'rgba(45, 42, 38, 0.03)',  // Very subtle warm tint
    hover: 'rgba(45, 42, 38, 0.05)',   // Hover state
    active: 'rgba(45, 42, 38, 0.08)',  // Active/pressed state
  },

  // Border colors
  border: {
    subtle: 'rgba(45, 42, 38, 0.08)',   // Hairline border
    light: 'rgba(45, 42, 38, 0.12)',    // Light border
    default: 'rgba(45, 42, 38, 0.18)',  // Default border
  },

  // Status colors (vibrant but soothing, Apple-inspired)
  status: {
    permit: {
      bg: 'rgba(52, 168, 83, 0.08)',      // Fresh green tint
      border: 'rgba(52, 168, 83, 0.18)',  // Green border
      pill: 'rgba(52, 168, 83, 0.14)',    // Pill fill
      pillBorder: 'rgba(52, 168, 83, 0.25)',
      dot: '#34a853',                      // Google green (vibrant)
      text: '#1e7e34',                     // Dark green
      clock: 'rgba(52, 168, 83, 0.65)',   // Heatmap segment
    },
    fragmented: {
      bg: 'rgba(234, 179, 8, 0.08)',      // Warm yellow tint
      border: 'rgba(234, 179, 8, 0.18)',  // Yellow border
      pill: 'rgba(234, 179, 8, 0.14)',    // Pill fill
      pillBorder: 'rgba(234, 179, 8, 0.25)',
      dot: '#eab308',                      // Vibrant yellow
      text: '#a16207',                     // Dark amber
      clock: 'rgba(234, 179, 8, 0.65)',   // Heatmap segment
    },
    caution: {
      bg: 'rgba(249, 115, 22, 0.08)',     // Orange tint
      border: 'rgba(249, 115, 22, 0.18)', // Orange border
      pill: 'rgba(249, 115, 22, 0.14)',   // Pill fill
      pillBorder: 'rgba(249, 115, 22, 0.25)',
      dot: '#f97316',                      // Vibrant orange
      text: '#c2410c',                     // Dark orange
      clock: 'rgba(249, 115, 22, 0.65)',  // Heatmap segment
    },
    silence: {
      bg: 'rgba(45, 42, 38, 0.03)',       // Very subtle warm
      border: 'rgba(45, 42, 38, 0.08)',   // Subtle border
      pill: 'rgba(45, 42, 38, 0.10)',     // Pill fill
      pillBorder: 'rgba(45, 42, 38, 0.15)',
      dot: '#a9a29a',                      // Warm grey
      text: '#8a847c',                     // Muted text
      clock: 'rgba(45, 42, 38, 0.12)',    // Heatmap segment (very subtle)
    },
    unavailable: {
      bg: 'rgba(120, 113, 108, 0.08)',    // Neutral grey tint
      border: 'rgba(120, 113, 108, 0.15)',
      clock: 'rgba(120, 113, 108, 0.35)', // Heatmap segment for unavailable times
    },
  },

  // Accent (used sparingly)
  accent: {
    primary: '#6b6460',      // Warm neutral accent
    subtle: 'rgba(107, 100, 96, 0.1)',
  },

  // Mode-specific colors (chromatically distinct)
  modes: {
    FRAMING: {
      primary: '#8b5cf6',      // Purple
      bg: 'rgba(139, 92, 246, 0.08)',
      border: 'rgba(139, 92, 246, 0.20)',
      clock: 'rgba(139, 92, 246, 0.65)',
      text: '#6d28d9',
    },
    SYNTHESIS: {
      primary: '#06b6d4',      // Cyan
      bg: 'rgba(6, 182, 212, 0.08)',
      border: 'rgba(6, 182, 212, 0.20)',
      clock: 'rgba(6, 182, 212, 0.65)',
      text: '#0891b2',
    },
    EVALUATION: {
      primary: '#f59e0b',      // Amber
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.20)',
      clock: 'rgba(245, 158, 11, 0.65)',
      text: '#d97706',
    },
    EXECUTION: {
      primary: '#10b981',      // Green
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.20)',
      clock: 'rgba(16, 185, 129, 0.65)',
      text: '#059669',
    },
    REFLECTION: {
      primary: '#ec4899',      // Pink
      bg: 'rgba(236, 72, 153, 0.08)',
      border: 'rgba(236, 72, 153, 0.20)',
      clock: 'rgba(236, 72, 153, 0.65)',
      text: '#db2777',
    },
  },
} as const;

/**
 * Liquid glass effect styles.
 * Use these on floating surfaces (popovers, nav, elevated cards).
 */
export const glass = {
  // Standard floating surface
  surface: {
    background: 'rgba(253, 252, 250, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
      0 1px 0 0 rgba(255, 255, 255, 0.8) inset,
      0 4px 16px rgba(45, 42, 38, 0.08),
      0 8px 32px rgba(45, 42, 38, 0.04)
    `,
  },

  // Elevated surface (popovers, tooltips)
  elevated: {
    background: 'rgba(253, 252, 250, 0.95)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.6) inset,
      0 1px 0 0 rgba(255, 255, 255, 0.9) inset,
      0 8px 24px rgba(45, 42, 38, 0.12),
      0 16px 48px rgba(45, 42, 38, 0.06)
    `,
  },

  // Subtle card (inline cards, not floating)
  card: {
    background: 'rgba(253, 252, 250, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.3) inset,
      0 1px 0 0 rgba(255, 255, 255, 0.5) inset,
      0 2px 8px rgba(45, 42, 38, 0.04)
    `,
  },
} as const;

/**
 * Spacing scale.
 */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  xxl: '2rem',     // 32px
} as const;

/**
 * Border radius scale.
 */
export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
} as const;

/**
 * Typography styles.
 */
export const typography = {
  // Headings
  h1: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.text.primary,
  },
  h2: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.text.primary,
  },

  // Body text
  body: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.text.secondary,
  },
  bodySmall: {
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.text.secondary,
  },

  // Labels and captions
  label: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
    color: colors.text.tertiary,
  },
  caption: {
    fontSize: '0.6875rem',
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.text.muted,
  },
} as const;

/**
 * Transition presets.
 */
export const transitions = {
  fast: '0.1s ease',
  normal: '0.15s ease',
  slow: '0.25s ease',
} as const;

/**
 * Focus ring style for accessibility.
 */
export const focusRing = {
  outline: 'none',
  boxShadow: `0 0 0 2px ${colors.bg.page}, 0 0 0 4px ${colors.accent.primary}`,
} as const;

/**
 * Hover ring style for anchored popovers.
 */
export const hoverRing = {
  boxShadow: `0 0 0 2px ${colors.accent.subtle}`,
} as const;
