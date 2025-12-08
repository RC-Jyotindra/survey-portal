"use client";

import { useEffect } from 'react';
import { getTheme, generateThemeCSS, ThemeConfig } from '@/lib/themes';

interface ThemeProviderProps {
  themeName: string;
  children: React.ReactNode;
}

export default function ThemeProvider({ themeName, children }: ThemeProviderProps) {
  useEffect(() => {
    const theme = getTheme(themeName);
    const css = generateThemeCSS(theme);
    
    // Create or update the theme style element
    let styleElement = document.getElementById('survey-theme-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'survey-theme-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
    
    // Cleanup function to remove the style element when component unmounts
    return () => {
      const element = document.getElementById('survey-theme-styles');
      if (element) {
        element.remove();
      }
    };
  }, [themeName]);

  return <>{children}</>;
}

// Hook to get current theme
export function useTheme(themeName: string): ThemeConfig {
  return getTheme(themeName);
}
