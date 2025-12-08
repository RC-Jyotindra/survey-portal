export interface ThemeConfig {
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  spacing: {
    tight: string;
    normal: string;
    relaxed: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export const themes: Record<string, ThemeConfig> = {
  default: {
    name: 'default',
    displayName: 'Default',
    description: 'Clean and professional with blue accents',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#06b6d4',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },
    spacing: {
      tight: '0.5rem',
      normal: '1rem',
      relaxed: '1.5rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
  modern: {
    name: 'modern',
    displayName: 'Modern',
    description: 'Bold and contemporary with purple gradients',
    colors: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#ec4899',
      background: '#ffffff',
      surface: '#faf5ff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },
    spacing: {
      tight: '0.5rem',
      normal: '1rem',
      relaxed: '1.5rem',
    },
    borderRadius: {
      sm: '0.375rem',
      md: '0.75rem',
      lg: '1rem',
    },
    shadows: {
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  },
  minimal: {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Clean and minimal with subtle grays',
    colors: {
      primary: '#374151',
      secondary: '#6b7280',
      accent: '#9ca3af',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#d1d5db',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },
    spacing: {
      tight: '0.5rem',
      normal: '1rem',
      relaxed: '1.5rem',
    },
    borderRadius: {
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.375rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      lg: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    },
  },
  corporate: {
    name: 'corporate',
    displayName: 'Corporate',
    description: 'Professional and trustworthy with navy blue',
    colors: {
      primary: '#1e40af',
      secondary: '#374151',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      border: '#cbd5e1',
      success: '#047857',
      warning: '#b45309',
      error: '#b91c1c',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
      },
    },
    spacing: {
      tight: '0.5rem',
      normal: '1rem',
      relaxed: '1.5rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
};

export function getTheme(themeName: string): ThemeConfig {
  return themes[themeName] || themes['default']!;
}

export function generateThemeCSS(theme: ThemeConfig): string {
  return `
    :root {
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-accent: ${theme.colors.accent};
      --theme-background: ${theme.colors.background};
      --theme-surface: ${theme.colors.surface};
      --theme-text: ${theme.colors.text};
      --theme-text-secondary: ${theme.colors.textSecondary};
      --theme-border: ${theme.colors.border};
      --theme-success: ${theme.colors.success};
      --theme-warning: ${theme.colors.warning};
      --theme-error: ${theme.colors.error};
      
      --theme-font-family: ${theme.typography.fontFamily};
      --theme-heading-font: ${theme.typography.headingFont};
      --theme-font-size-xs: ${theme.typography.fontSize.xs};
      --theme-font-size-sm: ${theme.typography.fontSize.sm};
      --theme-font-size-base: ${theme.typography.fontSize.base};
      --theme-font-size-lg: ${theme.typography.fontSize.lg};
      --theme-font-size-xl: ${theme.typography.fontSize.xl};
      --theme-font-size-2xl: ${theme.typography.fontSize['2xl']};
      --theme-font-size-3xl: ${theme.typography.fontSize['3xl']};
      
      --theme-spacing-tight: ${theme.spacing.tight};
      --theme-spacing-normal: ${theme.spacing.normal};
      --theme-spacing-relaxed: ${theme.spacing.relaxed};
      
      --theme-radius-sm: ${theme.borderRadius.sm};
      --theme-radius-md: ${theme.borderRadius.md};
      --theme-radius-lg: ${theme.borderRadius.lg};
      
      --theme-shadow-sm: ${theme.shadows.sm};
      --theme-shadow-md: ${theme.shadows.md};
      --theme-shadow-lg: ${theme.shadows.lg};
    }
  `;
}
