import React, {
  createContext, useContext, useState, useEffect, useMemo,
} from 'react';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Try to get the stored preference from localStorage
    const stored = localStorage.getItem('kotoba-dark-mode');
    if (stored !== null) {
      return JSON.parse(stored);
    }
    // Default to light mode
    return false;
  });

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
  }, [isDarkMode]);

  // Persist theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('kotoba-dark-mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
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
