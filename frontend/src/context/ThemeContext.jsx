import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('GOsocial-theme') || 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState('light');

  const updateEffectiveTheme = (selectedTheme) => {
    let active = selectedTheme;
    if (selectedTheme === 'system') {
      active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setEffectiveTheme(active);
    document.documentElement.setAttribute('data-theme', active);
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('GOsocial-theme', newTheme);
    updateEffectiveTheme(newTheme);
  };

  useEffect(() => {
    updateEffectiveTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        updateEffectiveTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
