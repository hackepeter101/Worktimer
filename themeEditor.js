/**
 * Theme Editor UI Controller
 * Manages the theme editor modal and user interactions
 */

let editingThemeId = null;
let previewedTheme = null;
let colorPickers = {}; // Store Pickr instances

/**
 * Initialize theme selector dropdown
 */
function initThemeSelector() {
  const selector = document.getElementById('themeSelector');
  if (!selector) {
    console.error('Theme selector not found');
    return;
  }
  
  // Populate with all themes
  updateThemeSelector();
  
  // Add change event listener
  selector.addEventListener('change', (e) => {
    const themeId = e.target.value;
    if (themeId) {
      window.ThemeSystem.applyTheme(themeId);
      updateThemeList();
    }
  });
}

/**
 * Update theme selector dropdown with all available themes
 */
function updateThemeSelector() {
  const selector = document.getElementById('themeSelector');
  if (!selector) return;
  
  const allThemes = window.ThemeSystem.getAllThemes();
  const currentThemeId = window.ThemeSystem.getCurrentThemeId();
  
  // Clear and repopulate
  selector.innerHTML = '';
  
  allThemes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = theme.name;
    if (theme.id === currentThemeId) {
      option.selected = true;
    }
    selector.appendChild(option);
  });
}

/**
 * Initialize theme editor
 */
function initThemeEditor() {
  const editorBtn = document.getElementById('themeEditorBtn');
  const overlay = document.getElementById('themeEditorOverlay');
  const closeBtn = document.getElementById('closeThemeEditor');
  const form = document.getElementById('themeEditorForm');
  const previewBtn = document.getElementById('previewThemeBtn');
  const cancelBtn = document.getElementById('cancelThemeBtn');
  
  if (!editorBtn || !overlay) {
    console.error('Theme editor elements not found');
    return;
  }
  
  // Open editor
  editorBtn.addEventListener('click', () => {
    openThemeEditor();
  });
  
  // Close editor
  closeBtn?.addEventListener('click', () => {
    closeThemeEditor();
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeThemeEditor();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      closeThemeEditor();
    }
  });
  
  // Form submission
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTheme();
  });
  
  // Preview button
  previewBtn?.addEventListener('click', () => {
    previewTheme();
  });
  
  // Cancel button
  cancelBtn?.addEventListener('click', () => {
    resetForm();
    editingThemeId = null;
    updateFormTitle();
  });
  
  // Initialize Pickr color pickers
  initPickrColorPickers();
}

/**
 * Initialize Pickr color pickers with custom theme styling
 */
function initPickrColorPickers() {
  const colorFields = [
    { id: 'bgColor', textId: 'bgColorText', default: '#323437', label: 'Background' },
    { id: 'fgColor', textId: 'fgColorText', default: '#d1d0c5', label: 'Text' },
    { id: 'accentColor', textId: 'accentColorText', default: '#e2b714', label: 'Accent' },
    { id: 'accent2Color', textId: 'accent2ColorText', default: '#e2b714', label: 'Accent 2' },
    { id: 'mutedColor', textId: 'mutedColorText', default: '#646669', label: 'Muted' }
  ];
  
  colorFields.forEach(field => {
    const container = document.getElementById(field.id);
    const textInput = document.getElementById(field.textId);
    
    if (!container || !textInput) return;
    
    // Create Pickr instance
    const pickr = Pickr.create({
      el: container,
      theme: 'monolith',
      default: field.default,
      comparison: false,
      swatches: [
        '#323437', '#d1d0c5', '#e2b714', '#646669', // Default theme colors
        '#ffffff', '#000000', // Basic
        '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', // Modern palette
        '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'  // Slate palette
      ],
      components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
          hex: true,
          rgba: false,
          hsla: false,
          hsva: false,
          cmyk: false,
          input: true,
          clear: false,
          save: true
        }
      }
    });
    
    // Update text input when color changes
    pickr.on('change', (color) => {
      const hexColor = color.toHEXA().toString();
      textInput.value = hexColor.toUpperCase();
    });
    
    // Save color when user clicks save button in picker
    pickr.on('save', (color) => {
      if (color) {
        const hexColor = color.toHEXA().toString();
        textInput.value = hexColor.toUpperCase();
      }
      pickr.hide();
    });
    
    // Update picker when text input changes
    textInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        pickr.setColor(value);
      }
    });
    
    // Store the instance
    colorPickers[field.id] = pickr;
  });
}

/**
 * Open theme editor modal
 */
function openThemeEditor() {
  const overlay = document.getElementById('themeEditorOverlay');
  if (!overlay) return;
  
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  
  // Populate theme list
  updateThemeList();
  
  // Focus on theme name input
  setTimeout(() => {
    document.getElementById('themeName')?.focus();
  }, 100);
}

/**
 * Close theme editor modal
 */
function closeThemeEditor() {
  const overlay = document.getElementById('themeEditorOverlay');
  if (!overlay) return;
  
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  
  // Reset form and state
  resetForm();
  editingThemeId = null;
  
  // If a theme was previewed, reapply the saved theme
  if (previewedTheme) {
    const currentThemeId = window.ThemeSystem.getCurrentThemeId();
    if (currentThemeId) {
      window.ThemeSystem.applyTheme(currentThemeId);
    }
    previewedTheme = null;
  }
}

/**
 * Update theme list in the editor
 */
function updateThemeList() {
  const themeList = document.getElementById('themeList');
  if (!themeList) return;
  
  const allThemes = window.ThemeSystem.getAllThemes();
  const currentThemeId = window.ThemeSystem.getCurrentThemeId();
  
  themeList.innerHTML = '';
  
  allThemes.forEach(theme => {
    const item = document.createElement('div');
    item.className = 'theme-item';
    if (theme.id === currentThemeId) {
      item.classList.add('active');
    }
    
    // Create color swatches
    const colors = [];
    if (theme.variables) {
      if (theme.variables['--bg']) colors.push(theme.variables['--bg']);
      if (theme.variables['--accent']) colors.push(theme.variables['--accent']);
      if (theme.variables['--accent-2']) colors.push(theme.variables['--accent-2']);
    }
    
    const swatchesHtml = colors.map(color => 
      `<div class="theme-color-swatch" style="background-color: ${color}"></div>`
    ).join('');
    
    const badge = theme.builtIn ? '<span class="theme-item-badge">built-in</span>' : '';
    
    item.innerHTML = `
      <div class="theme-item-info">
        <div class="theme-item-name">${escapeHtml(theme.name)}${badge}</div>
        <div class="theme-item-colors">${swatchesHtml}</div>
      </div>
      <div class="theme-item-actions">
        ${!theme.builtIn ? `
          <button type="button" class="icon-btn edit-theme-btn" data-theme-id="${theme.id}" title="Edit">
            <svg width="16" height="16"><use href="#icon-sliders"></use></svg>
          </button>
          <button type="button" class="icon-btn delete-theme-btn" data-theme-id="${theme.id}" title="Delete">
            <svg width="16" height="16"><use href="#icon-trash"></use></svg>
          </button>
        ` : ''}
      </div>
    `;
    
    // Click to apply theme
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.icon-btn')) {
        window.ThemeSystem.applyTheme(theme.id);
        updateThemeList();
        updateThemeSelector();
      }
    });
    
    themeList.appendChild(item);
  });
  
  // Add event listeners for edit/delete buttons
  themeList.querySelectorAll('.edit-theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeId = btn.dataset.themeId;
      editTheme(themeId);
    });
  });
  
  themeList.querySelectorAll('.delete-theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeId = btn.dataset.themeId;
      deleteTheme(themeId);
    });
  });
}

/**
 * Edit an existing theme
 */
function editTheme(themeId) {
  const theme = window.ThemeSystem.getThemeById(themeId);
  if (!theme || theme.builtIn) return;
  
  editingThemeId = themeId;
  
  // Populate form
  document.getElementById('themeName').value = theme.name || '';
  
  if (theme.variables) {
    setColorInput('bgColor', theme.variables['--bg'] || '#323437');
    setColorInput('fgColor', theme.variables['--fg'] || '#d1d0c5');
    setColorInput('accentColor', theme.variables['--accent'] || '#e2b714');
    setColorInput('accent2Color', theme.variables['--accent-2'] || '#e2b714');
    setColorInput('mutedColor', theme.variables['--muted'] || '#646669');
  }
  
  updateFormTitle();
}

/**
 * Delete a theme
 */
function deleteTheme(themeId) {
  if (!confirm('Are you sure you want to delete this theme?')) {
    return;
  }
  
  try {
    window.ThemeSystem.deleteLocalTheme(themeId);
    updateThemeList();
    updateThemeSelector();
  } catch (error) {
    alert(error.message);
  }
}

/**
 * Preview theme without saving
 */
function previewTheme() {
  const themeData = getFormData();
  if (!themeData) return;
  
  const previewThemeObj = {
    id: 'preview',
    name: 'Preview',
    variables: themeData.variables
  };
  
  window.ThemeSystem.applyTheme(previewThemeObj);
  previewedTheme = previewThemeObj;
}

/**
 * Save theme
 */
function saveTheme() {
  const themeData = getFormData();
  if (!themeData) return;
  
  try {
    // If editing, delete the old theme first
    if (editingThemeId) {
      window.ThemeSystem.deleteLocalTheme(editingThemeId);
    }
    
    // Save the theme
    const themeId = window.ThemeSystem.saveLocalTheme(themeData.name, {
      variables: themeData.variables
    });
    
    // Apply the theme
    window.ThemeSystem.applyTheme(themeId);
    
    // Update UI
    updateThemeList();
    updateThemeSelector();
    
    // Reset form
    resetForm();
    editingThemeId = null;
    previewedTheme = null;
    updateFormTitle();
    
    // Show success message (optional)
    console.log(`Theme "${themeData.name}" saved successfully!`);
    
  } catch (error) {
    alert(error.message);
  }
}

/**
 * Get form data
 */
function getFormData() {
  const name = document.getElementById('themeName')?.value.trim();
  
  if (!name) {
    alert('Please enter a theme name');
    return null;
  }
  
  // Get colors from text inputs (which are synced with Pickr)
  const bgColor = document.getElementById('bgColorText')?.value;
  const fgColor = document.getElementById('fgColorText')?.value;
  const accentColor = document.getElementById('accentColorText')?.value;
  const accent2Color = document.getElementById('accent2ColorText')?.value;
  const mutedColor = document.getElementById('mutedColorText')?.value;
  
  return {
    name,
    variables: {
      '--bg': bgColor,
      '--fg': fgColor,
      '--text': fgColor,
      '--muted': mutedColor,
      '--card': adjustBrightness(bgColor, 10),
      '--accent': accentColor,
      '--accent-2': accent2Color,
      '--danger': '#ca4754',
      '--color-bg': bgColor,
      '--color-text': fgColor,
      '--color-muted': mutedColor,
      '--color-surface': adjustBrightness(bgColor, 10),
      '--color-accent': accentColor
    }
  };
}

/**
 * Reset form to default values
 */
function resetForm() {
  document.getElementById('themeName').value = '';
  setColorInput('bgColor', '#323437');
  setColorInput('fgColor', '#d1d0c5');
  setColorInput('accentColor', '#e2b714');
  setColorInput('accent2Color', '#e2b714');
  setColorInput('mutedColor', '#646669');
}

/**
 * Set color input value (both Pickr and text)
 */
function setColorInput(colorId, value) {
  const textInput = document.getElementById(colorId + 'Text');
  const pickr = colorPickers[colorId];
  
  if (textInput) textInput.value = value;
  if (pickr) pickr.setColor(value);
}

/**
 * Update form title based on editing state
 */
function updateFormTitle() {
  const title = document.getElementById('themeFormTitle');
  if (!title) return;
  
  if (editingThemeId) {
    title.textContent = 'edit theme';
  } else {
    title.textContent = 'create new theme';
  }
}

/**
 * Adjust brightness of a hex color
 */
function adjustBrightness(hex, percent) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  // Convert back to hex
  const rr = Math.round(r).toString(16).padStart(2, '0');
  const gg = Math.round(g).toString(16).padStart(2, '0');
  const bb = Math.round(b).toString(16).padStart(2, '0');
  
  return `#${rr}${gg}${bb}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
