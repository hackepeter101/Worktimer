/**
 * Lightweight Theme Manager for Worktimer
 * Loads themes from themes.json and applies them via CSS variables
 */

const THEME_STORAGE_KEY = 'worktimer_theme';
const THEMES_JSON_PATH = './themes.json';

// Built-in fallback themes in case themes.json cannot be loaded
const FALLBACK_THEMES = [
  {
    id: "light",
    name: "Light",
    variables: {
      "--bg": "#f5f5f5",
      "--text": "#2c2e31",
      "--accent": "#0066cc",
      "--accent-2": "#0052a3",
      "--muted": "#6c757d"
    }
  },
  {
    id: "dark",
    name: "Dark",
    variables: {
      "--bg": "#1a1a1a",
      "--text": "#e0e0e0",
      "--accent": "#4a9eff",
      "--accent-2": "#357abd",
      "--muted": "#888888"
    }
  }
];

// Internal state
let themes = [];
let currentThemeId = null;

/**
 * Load themes from themes.json file
 * Falls back to built-in themes if fetch fails
 * @returns {Promise<Array>} Array of theme objects
 */
async function loadThemes() {
  try {
    const response = await fetch(THEMES_JSON_PATH);
    
    if (!response.ok) {
      throw new Error(`Failed to load themes: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.themes || !Array.isArray(data.themes)) {
      throw new Error('Invalid themes.json format: missing themes array');
    }
    
    themes = data.themes;
    console.log(`Loaded ${themes.length} themes from themes.json`);
    return themes;
    
  } catch (error) {
    console.warn('Failed to load themes.json, using fallback themes:', error.message);
    themes = FALLBACK_THEMES;
    return themes;
  }
}

/**
 * Get all available themes
 * @returns {Array} Array of theme objects
 */
function getAvailableThemes() {
  return themes;
}

/**
 * Apply a theme by setting CSS variables on the :root element
 * @param {string} themeId - The ID of the theme to apply
 * @returns {boolean} True if theme was applied successfully
 */
function applyTheme(themeId) {
  // Find the theme
  const theme = themes.find(t => t.id === themeId);
  
  if (!theme) {
    console.warn(`Theme '${themeId}' not found. Available themes:`, themes.map(t => t.id).join(', '));
    return false;
  }
  
  // Get the root element
  const root = document.documentElement;
  
  // Apply each CSS variable
  if (theme.variables && typeof theme.variables === 'object') {
    for (const [varName, varValue] of Object.entries(theme.variables)) {
      root.style.setProperty(varName, varValue);
    }
  }
  
  // Store the current theme
  currentThemeId = themeId;
  
  // Persist to localStorage
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error.message);
  }
  
  console.log(`Applied theme: ${theme.name} (${themeId})`);
  return true;
}

/**
 * Get the currently selected theme ID from localStorage
 * @returns {string|null} Theme ID or null if not set
 */
function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error.message);
    return null;
  }
}

/**
 * Initialize a theme selector UI element
 * @param {string|HTMLElement} selectElementOrId - Either a selector string or an HTMLElement
 */
function initThemeSelector(selectElementOrId) {
  // Get the element
  let selectElement;
  if (typeof selectElementOrId === 'string') {
    selectElement = document.querySelector(selectElementOrId);
  } else if (selectElementOrId instanceof HTMLElement) {
    selectElement = selectElementOrId;
  } else {
    console.error('Invalid selector element provided to initThemeSelector');
    return;
  }
  
  if (!selectElement) {
    console.error('Theme selector element not found');
    return;
  }
  
  // Clear existing options
  selectElement.innerHTML = '';
  
  // Add options for each theme
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    
    // Select the current theme
    if (theme.id === currentThemeId) {
      option.selected = true;
    }
    
    selectElement.appendChild(option);
  });
  
  // Add change event listener
  selectElement.addEventListener('change', (event) => {
    const selectedThemeId = event.target.value;
    applyTheme(selectedThemeId);
  });
  
  console.log('Theme selector initialized');
}

/**
 * Initialize the theme system
 * Loads themes and applies the saved theme or defaults to the first theme
 * @returns {Promise<void>}
 */
async function init() {
  // Load themes
  await loadThemes();
  
  // Get saved theme or use first theme as default
  const savedTheme = getSavedTheme();
  const themeToApply = savedTheme && themes.find(t => t.id === savedTheme) 
    ? savedTheme 
    : themes[0]?.id;
  
  if (themeToApply) {
    applyTheme(themeToApply);
  } else {
    console.warn('No themes available');
  }
}

// Export the public API
window.themeManager = {
  loadThemes,
  applyTheme,
  getAvailableThemes,
  initThemeSelector,
  init
};
