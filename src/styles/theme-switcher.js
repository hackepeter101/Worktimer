/**
 * Theme Switcher Module
 * Loads and applies themes from themes.json
 */

(function() {
  'use strict';

  const THEME_STORAGE_KEY = 'worktimer.selectedTheme.v3';
  let themes = [];
  let currentThemeId = null;

  /**
   * Load themes from themes.json
   */
  async function loadThemes() {
    try {
      const response = await fetch('src/styles/themes.json');
      if (!response.ok) {
        throw new Error('Failed to load themes.json');
      }
      const data = await response.json();
      themes = data.themes || [];
      return themes;
    } catch (error) {
      console.error('Error loading themes:', error);
      // Fallback to default theme
      themes = [{
        id: 'dark',
        name: 'Dark',
        tokens: {
          '--color-bg': '#0b0c0f',
          '--color-surface': '#14161b',
          '--color-text': '#e9eef4',
          '--color-accent': '#6ea8fe',
          '--color-muted': '#a7b0bf'
        }
      }];
      return themes;
    }
  }

  /**
   * Validate theme object
   */
  function validateTheme(theme) {
    if (!theme || !theme.id || !theme.name || !theme.tokens) {
      return false;
    }
    const requiredTokens = ['--color-bg', '--color-surface', '--color-text', '--color-accent', '--color-muted'];
    return requiredTokens.every(token => theme.tokens[token]);
  }

  /**
   * Apply theme to document
   */
  function applyTheme(themeId) {
    const theme = themes.find(t => t.id === themeId);
    
    if (!theme) {
      console.warn(`Theme "${themeId}" not found`);
      return false;
    }

    if (!validateTheme(theme)) {
      console.error(`Theme "${themeId}" is invalid`);
      return false;
    }

    const root = document.documentElement;
    const body = document.body;

    // Apply all tokens to :root
    Object.entries(theme.tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Also apply background and text color to body for consistency
    body.style.backgroundColor = theme.tokens['--color-bg'] || '';
    body.style.color = theme.tokens['--color-text'] || '';

    // Set data attribute for potential CSS targeting
    body.setAttribute('data-theme', themeId);

    currentThemeId = themeId;
    return true;
  }

  /**
   * Set theme and persist to localStorage
   */
  function setTheme(themeId) {
    if (!themeId) {
      console.warn('No theme ID provided');
      return false;
    }

    const success = applyTheme(themeId);
    if (success) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    }
    return success;
  }

  /**
   * Get current theme ID
   */
  function getCurrentTheme() {
    return currentThemeId;
  }

  /**
   * Get all available themes
   */
  function getThemes() {
    return [...themes];
  }

  /**
   * Cycle to next theme
   */
  function cycleTheme() {
    if (themes.length === 0) return false;
    
    const currentIndex = themes.findIndex(t => t.id === currentThemeId);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    return setTheme(nextTheme.id);
  }

  /**
   * Initialize theme system
   */
  async function init() {
    await loadThemes();

    // Load saved theme or use first theme as default
    let savedThemeId = null;
    try {
      savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to read theme from localStorage:', error);
    }

    const defaultThemeId = savedThemeId || themes[0]?.id || 'dark';
    setTheme(defaultThemeId);

    return true;
  }

  // Export API
  window.ThemeSwitcher = {
    init,
    setTheme,
    cycleTheme,
    getCurrentTheme,
    getThemes,
    loadThemes
  };

})();
