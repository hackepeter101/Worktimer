/**
 * Theme Manager - Immediate theme application to prevent FOUC
 * This script runs synchronously before page render to apply saved theme
 */

(function() {
  'use strict';
  
  // LocalStorage keys (must match themes.js)
  const LS_SELECTED_THEME = 'worktimer:selectedTheme';
  const LS_LOCAL_THEMES = 'worktimer:localThemes';
  const LS_THEME_CACHE = 'worktimer:themeCache';
  
  /**
   * Apply theme variables immediately to prevent FOUC
   * This runs synchronously before page renders
   */
  function applyThemeImmediate() {
    try {
      // Get saved theme ID
      const savedThemeId = localStorage.getItem(LS_SELECTED_THEME);
      
      if (savedThemeId) {
        // First, try to get from cache (fastest)
        const cacheJson = localStorage.getItem(LS_THEME_CACHE);
        if (cacheJson) {
          const cache = JSON.parse(cacheJson);
          if (cache.id === savedThemeId && cache.variables) {
            applyVariables(cache.variables);
            return;
          }
        }
        
        // Try to get theme from localStorage (for custom themes)
        const localThemesJson = localStorage.getItem(LS_LOCAL_THEMES);
        const localThemes = localThemesJson ? JSON.parse(localThemesJson) : {};
        
        // Check if it's a local theme
        if (localThemes[savedThemeId]) {
          const theme = localThemes[savedThemeId];
          applyVariables(theme.variables);
          return;
        }
        
        // If it's a built-in theme and we don't have it cached,
        // we'll apply default and let the full system load it properly
      }
      
      // Apply default theme if no saved theme or if it's a built-in theme without cache
      applyDefaultTheme();
      
    } catch (error) {
      console.warn('Failed to apply immediate theme:', error);
      applyDefaultTheme();
    }
  }
  
  /**
   * Apply CSS variables to document root
   */
  function applyVariables(variables) {
    if (!variables || typeof variables !== 'object') return;
    
    const root = document.documentElement;
    
    for (const [varName, varValue] of Object.entries(variables)) {
      if (varValue) {
        root.style.setProperty(varName, varValue);
      }
    }
    
    // Also apply to body for immediate visual effect (if body exists)
    if (document.body) {
      if (variables['--bg']) {
        document.body.style.backgroundColor = variables['--bg'];
      }
      if (variables['--fg'] || variables['--text']) {
        document.body.style.color = variables['--fg'] || variables['--text'];
      }
    }
  }
  
  /**
   * Apply unique default "Worktimer" theme
   * This is a distinctive branded theme that serves as the app's identity
   */
  function applyDefaultTheme() {
    // Unique "Worktimer" theme - a pleasant blue-gray with teal accents
    const defaultTheme = {
      '--bg': '#1a1d29',
      '--fg': '#e8eaed',
      '--text': '#e8eaed',
      '--muted': '#9aa0a6',
      '--card': '#252834',
      '--accent': '#4fc3f7',
      '--accent-2': '#29b6f6',
      '--danger': '#ef5350',
      '--color-bg': '#1a1d29',
      '--color-text': '#e8eaed',
      '--color-muted': '#9aa0a6',
      '--color-surface': '#252834',
      '--color-accent': '#4fc3f7'
    };
    
    applyVariables(defaultTheme);
  }
  
  // Run immediately
  applyThemeImmediate();
})();
