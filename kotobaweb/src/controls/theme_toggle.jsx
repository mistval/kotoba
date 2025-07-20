import React from 'react';
import { useTheme } from '../common/theme_context';

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="btn btn-link text-light p-2"
      onClick={toggleTheme}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        border: 'none',
        background: 'transparent',
        fontSize: '1.1rem',
        cursor: 'pointer',
        color: 'rgba(255, 255, 255, 0.75)',
        transition: 'color 0.2s ease',
        borderRadius: '0.25rem',
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = 'rgba(255, 255, 255, 0.75)';
      }}
    >
      {isDarkMode ? (
        <i className="fas fa-sun" />
      ) : (
        <i className="fas fa-moon" />
      )}
    </button>
  );
}

export default ThemeToggle;
