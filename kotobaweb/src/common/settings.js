// Utility for managing application settings in localStorage

const SETTINGS_KEY = 'kotoba-settings';

const DEFAULT_SETTINGS = {
  darkMode: false,
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
  return settings[key];
}

export function setSetting(key, value) {
  return updateSettings({ [key]: value });
}
