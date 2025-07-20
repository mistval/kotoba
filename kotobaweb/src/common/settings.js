// Utility for managing application settings in localStorage

const SETTINGS_KEY = 'kotoba-settings';

// Function to get system theme preference
function getSystemThemePreference() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false; // Default to light theme if unable to detect
}

const DEFAULT_SETTINGS = {
  darkMode: getSystemThemePreference(),
  // Future settings can be added here
  // language: 'en',
  // fontSize: 'medium',
  // etc.
};

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all settings exist
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to parse settings from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
}

export function updateSettings(newSettings) {
  try {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    return updatedSettings;
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    return getSettings();
  }
}

export function getSetting(key) {
  const settings = getSettings();
  const value = settings[key];

  // Special handling for darkMode - if no explicit setting exists, use system preference
  if (key === 'darkMode' && value === undefined) {
    return getSystemThemePreference();
  }

  return value;
}

export function setSetting(key, value) {
  return updateSettings({ [key]: value });
}
