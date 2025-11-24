/**
 * Worktimer Theme System
 * Manages built-in and local custom themes with localStorage persistence
 * 
 * LocalStorage Keys:
 * - worktimer:selectedTheme - Currently selected theme ID
 * - worktimer:localThemes - Object mapping theme ID to theme definition
 */

// LocalStorage keys
const LS_SELECTED_THEME = 'worktimer:selectedTheme';
const LS_LOCAL_THEMES = 'worktimer:localThemes';

// Development mode flag
const IS_DEV = false; // Set to true for development
const log = (...args) => {
  if (IS_DEV) console.log(...args);
};
const logError = (...args) => console.error(...args); // Always log errors

// State
let builtInThemes = [];
let localThemes = {};
let currentThemeId = null;

/**
 * Load built-in themes from themes.json
 * @returns {Promise<Array>} Array of built-in theme objects
 */
async function loadBuiltInThemes() {
  try {
    const response = await fetch('./themes.json');
    if (!response.ok) {
      throw new Error(`Failed to load themes.json: ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.themes || !Array.isArray(data.themes)) {
      throw new Error('Invalid themes.json format');
    }
    
    builtInThemes = data.themes.map(theme => ({
      ...theme,
      builtIn: true
    }));
    
    log(`Loaded ${builtInThemes.length} built-in themes`);
    return builtInThemes;
  } catch (error) {
    logError('Failed to load built-in themes:', error);
    // Fallback theme - unique Worktimer default
    builtInThemes = [
      {
        id: 'worktimer',
        name: 'Worktimer',
        builtIn: true,
        variables: {
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
        }
      }
    ];
    return builtInThemes;
  }
}

/**
 * Get built-in themes
 * @returns {Array} Array of built-in theme objects
 */
function getBuiltInThemes() {
  return builtInThemes;
}

/**
 * Load local themes from localStorage
 * @returns {Object} Object mapping theme ID to theme definition
 */
function loadLocalThemes() {
  try {
    const stored = localStorage.getItem(LS_LOCAL_THEMES);
    localThemes = stored ? JSON.parse(stored) : {};
    log(`Loaded ${Object.keys(localThemes).length} local themes`);
    return localThemes;
  } catch (error) {
    logError('Failed to load local themes:', error);
    localThemes = {};
    return {};
  }
}

/**
 * Get local themes
 * @returns {Object} Object mapping theme ID to theme definition
 */
function getLocalThemes() {
  return localThemes;
}

/**
 * Get all themes (built-in + local)
 * @returns {Array} Array of all theme objects
 */
function getAllThemes() {
  const localThemeArray = Object.values(localThemes);
  return [...builtInThemes, ...localThemeArray];
}

/**
 * Get a theme by ID
 * @param {string} themeId - Theme ID
 * @returns {Object|null} Theme object or null if not found
 */
function getThemeById(themeId) {
  // Check built-in themes first
  const builtIn = builtInThemes.find(t => t.id === themeId);
  if (builtIn) return builtIn;
  
  // Check local themes
  return localThemes[themeId] || null;
}

/**
 * Save a local theme to localStorage
 * @param {string} name - Theme name
 * @param {Object} theme - Theme definition with variables
 * @returns {string} The theme ID
 */
function saveLocalTheme(name, theme) {
  // Generate ID from name
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Check if ID conflicts with built-in theme
  if (builtInThemes.find(t => t.id === id)) {
    throw new Error(`Theme name conflicts with built-in theme. Please choose a different name.`);
  }
  
  // Create theme object
  const themeObj = {
    id,
    name,
    builtIn: false,
    variables: theme.variables || {},
    ...theme
  };
  
  // Save to local themes
  localThemes[id] = themeObj;
  
  // Persist to localStorage
  try {
    localStorage.setItem(LS_LOCAL_THEMES, JSON.stringify(localThemes));
    log(`Saved local theme: ${name} (${id})`);
  } catch (error) {
    logError('Failed to save local theme:', error);
    throw error;
  }
  
  return id;
}

/**
 * Delete a local theme
 * @param {string} themeId - Theme ID to delete
 * @returns {boolean} True if deleted successfully
 */
function deleteLocalTheme(themeId) {
  // Check if it's a built-in theme
  if (builtInThemes.find(t => t.id === themeId)) {
    throw new Error('Cannot delete built-in themes');
  }
  
  if (!localThemes[themeId]) {
    return false;
  }
  
  delete localThemes[themeId];
  
  // Persist to localStorage
  try {
    localStorage.setItem(LS_LOCAL_THEMES, JSON.stringify(localThemes));
    log(`Deleted local theme: ${themeId}`);
    
    // If this was the current theme, switch to first available
    if (currentThemeId === themeId) {
      const firstTheme = builtInThemes[0]?.id;
      if (firstTheme) {
        applyTheme(firstTheme);
      }
    }
  } catch (error) {
    logError('Failed to delete local theme:', error);
    return false;
  }
  
  return true;
}

/**
 * Apply a theme by setting CSS variables
 * @param {string|Object} themeOrId - Theme ID or theme object
 * @returns {boolean} True if applied successfully
 */
function applyTheme(themeOrId) {
  let theme;
  
  // Handle both ID and object
  if (typeof themeOrId === 'string') {
    theme = getThemeById(themeOrId);
    if (!theme) {
      logError(`Theme '${themeOrId}' not found`);
      return false;
    }
  } else {
    theme = themeOrId;
  }
  
  const root = document.documentElement;
  
  // Apply CSS variables
  if (theme.variables && typeof theme.variables === 'object') {
    for (const [varName, varValue] of Object.entries(theme.variables)) {
      root.style.setProperty(varName, varValue);
    }
  }
  
  // Update body background and color for immediate effect
  if (theme.variables) {
    if (theme.variables['--bg']) {
      document.body.style.backgroundColor = theme.variables['--bg'];
    }
    if (theme.variables['--fg'] || theme.variables['--text']) {
      document.body.style.color = theme.variables['--fg'] || theme.variables['--text'];
    }
  }
  
  // Store current theme
  currentThemeId = theme.id;
  
  // Persist to localStorage
  try {
    localStorage.setItem(LS_SELECTED_THEME, theme.id);
    // Cache the theme variables for instant loading on next page load
    localStorage.setItem('worktimer:themeCache', JSON.stringify({
      id: theme.id,
      variables: theme.variables
    }));
  } catch (error) {
    logError('Failed to save theme selection:', error);
  }
  
  log(`Applied theme: ${theme.name} (${theme.id})`);
  return true;
}

/**
 * Get the currently selected theme ID
 * @returns {string|null} Theme ID or null
 */
function getCurrentThemeId() {
  return currentThemeId;
}

/**
 * Initialize the theme system
 * Loads themes and applies the saved theme or default
 * @returns {Promise<void>}
 */
async function initThemeSystem() {
  // Load themes
  await loadBuiltInThemes();
  loadLocalThemes();
  
  // Get saved theme or use first built-in theme as default
  let themeToApply = null;
  
  try {
    const savedThemeId = localStorage.getItem(LS_SELECTED_THEME);
    if (savedThemeId) {
      themeToApply = getThemeById(savedThemeId);
    }
  } catch (error) {
    logError('Failed to load saved theme:', error);
  }
  
  // Fallback to first built-in theme
  if (!themeToApply && builtInThemes.length > 0) {
    themeToApply = builtInThemes[0];
  }
  
  if (themeToApply) {
    applyTheme(themeToApply);
  }
}

// Export public API
window.ThemeSystem = {
  // Theme management
  getBuiltInThemes,
  getLocalThemes,
  getAllThemes,
  getThemeById,
  saveLocalTheme,
  deleteLocalTheme,
  
  // Theme application
  applyTheme,
  getCurrentThemeId,
  
  // Initialization
  initThemeSystem
};
