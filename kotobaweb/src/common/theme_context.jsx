import React, {
  createContext, useContext, useState, useEffect, useMemo,
} from 'react';
import { getSetting, setSetting } from './settings';
import analytics from '../util/analytics';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => getSetting('darkMode'));

  // Apply the theme to the document root
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    // Ensure transitions are enabled when toggling
    document.body.classList.add('transitions-enabled');
  }, [isDarkMode]);

  // Persist theme preference to settings
  useEffect(() => {
    setSetting('darkMode', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;

      // Send analytics event for theme toggle
      analytics.event(
        'Theme',
        'Toggle',
        newTheme ? 'Dark Mode' : 'Light Mode',
      );

      return newTheme;
    });
  };

  const value = useMemo(() => ({
    isDarkMode,
    toggleTheme,
  }), [isDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
