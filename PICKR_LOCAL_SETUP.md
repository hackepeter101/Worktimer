# Local Pickr Installation and Theme Customization Guide

This guide explains how to install Pickr (the color picker library) locally and customize its theme for the Worktimer application.

## What is Pickr?

Pickr is a modern color picker library by [@simonwep](https://github.com/Simonwep/pickr) used in Worktimer's Theme Editor for selecting colors when creating or editing custom themes.

Currently, Worktimer loads Pickr from a CDN (Content Delivery Network), but you may want to install it locally for:
- Offline functionality
- Better performance
- Custom theme styling
- Version control

## Files Needed for Local Pickr Installation

To install Pickr locally, you need the following files from the [@simonwep/pickr](https://www.npmjs.com/package/@simonwep/pickr) package:

### 1. JavaScript Files

You need **one** of these JavaScript files (choose based on your needs):

- **`pickr.min.js`** - Minified version (recommended for production)
  - Location: `node_modules/@simonwep/pickr/dist/pickr.min.js`
  - Size: ~25KB (gzipped)
  
- **`pickr.js`** - Full version (for debugging)
  - Location: `node_modules/@simonwep/pickr/dist/pickr.js`
  - Size: ~80KB

- **`pickr.es5.min.js`** - ES5 compatible version (for older browsers)
  - Location: `node_modules/@simonwep/pickr/dist/pickr.es5.min.js`

### 2. CSS Theme Files

Pickr comes with several built-in themes. You need **one** of these CSS files:

- **`monolith.min.css`** - Currently used by Worktimer
  - Location: `node_modules/@simonwep/pickr/dist/themes/monolith.min.css`
  - A modern, minimalist theme
  
- **`nano.min.css`** - Compact theme
  - Location: `node_modules/@simonwep/pickr/dist/themes/nano.min.css`
  - Smallest footprint
  
- **`classic.min.css`** - Traditional theme
  - Location: `node_modules/@simonwep/pickr/dist/themes/classic.min.css`
  - Classic color picker appearance

## Step-by-Step Installation Guide

### Option 1: Using NPM (Recommended)

1. **Install Pickr via NPM:**
   ```bash
   npm install @simonwep/pickr
   ```

2. **Create a `lib` directory in your project:**
   ```bash
   mkdir -p lib/pickr/themes
   ```

3. **Copy the necessary files:**
   ```bash
   # Copy JavaScript file
   cp node_modules/@simonwep/pickr/dist/pickr.min.js lib/pickr/
   
   # Copy CSS theme file (monolith theme)
   cp node_modules/@simonwep/pickr/dist/themes/monolith.min.css lib/pickr/themes/
   ```

4. **Update `index.html` to use local files:**

   Replace these CDN lines:
   ```html
   <link rel="stylesheet" href="https://unpkg.com/@simonwep/pickr@1.8.2/dist/themes/monolith.min.css"/>
   ...
   <script src="https://unpkg.com/@simonwep/pickr@1.8.2/dist/pickr.min.js"></script>
   ```

   With local references:
   ```html
   <link rel="stylesheet" href="lib/pickr/themes/monolith.min.css"/>
   ...
   <script src="lib/pickr/pickr.min.js"></script>
   ```

### Option 2: Manual Download

1. **Download Pickr from GitHub:**
   - Visit: https://github.com/Simonwep/pickr/releases
   - Download the latest release (currently v1.8.2)

2. **Extract the files:**
   - Extract `dist/pickr.min.js`
   - Extract `dist/themes/monolith.min.css`

3. **Place in your project:**
   ```
   Worktimer/
   ├── lib/
   │   └── pickr/
   │       ├── pickr.min.js
   │       └── themes/
   │           └── monolith.min.css
   ├── index.html
   └── ...
   ```

4. **Update `index.html`** as shown in Option 1, step 4.

## Customizing the Pickr Theme

### Understanding Pickr Themes

Pickr themes are pure CSS files that style the color picker interface. You can customize them by:

1. Modifying an existing theme
2. Creating a new theme from scratch
3. Overriding specific CSS variables

### Method 1: Modify Existing Theme

1. **Copy the theme file:**
   ```bash
   cp lib/pickr/themes/monolith.min.css lib/pickr/themes/custom-monolith.css
   ```

2. **Unminify for easier editing** (you can use an online tool or prettier):
   ```bash
   # Using prettier (if installed)
   npx prettier --write lib/pickr/themes/custom-monolith.css
   ```

3. **Edit the CSS file** to match your Worktimer theme:

   Key CSS classes and variables to customize:
   ```css
   /* Main container */
   .pcr-app {
     background: var(--bg);
     color: var(--fg);
     border-radius: 8px;
     box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
   }
   
   /* Color preview button */
   .pcr-button {
     border: 2px solid var(--muted);
     border-radius: 4px;
   }
   
   /* Swatches */
   .pcr-swatches > button {
     border-radius: 4px;
   }
   
   /* Save button */
   .pcr-save {
     background: var(--accent);
     color: var(--bg);
   }
   
   /* Input fields */
   .pcr-result {
     background: var(--card);
     color: var(--fg);
     border: 1px solid var(--muted);
   }
   ```

4. **Update `index.html` to use your custom theme:**
   ```html
   <link rel="stylesheet" href="lib/pickr/themes/custom-monolith.css"/>
   ```

### Method 2: Override with Custom CSS

Instead of modifying the theme file, you can add CSS overrides in your `styles.css`:

```css
/* Pickr Theme Customization */
.pcr-app {
  background: var(--card) !important;
  color: var(--fg) !important;
  border: 1px solid var(--muted) !important;
}

.pcr-app .pcr-interaction .pcr-result {
  background: var(--bg) !important;
  color: var(--fg) !important;
  border: 1px solid var(--muted) !important;
}

.pcr-app .pcr-interaction .pcr-save {
  background: var(--accent) !important;
  color: var(--bg) !important;
}

.pcr-app .pcr-interaction .pcr-save:hover {
  background: var(--accent-2) !important;
}

.pcr-app .pcr-swatches > button {
  border: 2px solid transparent !important;
}

.pcr-app .pcr-swatches > button:hover {
  border-color: var(--accent) !important;
}
```

### Method 3: Create a New Theme

1. **Create a new CSS file:**
   ```bash
   touch lib/pickr/themes/worktimer-theme.css
   ```

2. **Start with the base structure** (you can reference the monolith theme):
   ```css
   /* Worktimer Custom Pickr Theme */
   
   .pickr {
     position: relative;
     overflow: visible;
   }
   
   .pcr-app {
     /* Main container styles */
     position: fixed;
     display: flex;
     flex-direction: column;
     z-index: 10000;
     border-radius: 8px;
     background: var(--card);
     color: var(--fg);
     box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
     width: 280px;
     max-width: calc(100vw - 20px);
     padding: 16px;
   }
   
   /* Color selection area */
   .pcr-selection {
     /* Add your styles */
   }
   
   /* Hue slider */
   .pcr-hue {
     /* Add your styles */
   }
   
   /* Swatches */
   .pcr-swatches {
     /* Add your styles */
   }
   
   /* Interaction buttons */
   .pcr-interaction {
     /* Add your styles */
   }
   ```

3. **Reference Pickr's source** for complete structure:
   - View the monolith theme source: https://github.com/Simonwep/pickr/blob/master/src/scss/themes/monolith.scss
   - You can also inspect the compiled CSS in your browser's DevTools

## Recommended File Structure

After local installation, your project structure should look like this:

```
Worktimer/
├── lib/                          # Third-party libraries
│   └── pickr/
│       ├── pickr.min.js          # Pickr JavaScript
│       └── themes/
│           ├── monolith.min.css  # Original theme
│           └── custom.css        # Your custom theme (optional)
├── src/
│   ├── markdownParser.js
│   └── themeManager.js
├── icons/
├── index.html                    # Update to reference local files
├── script.js
├── styles.css                    # Add Pickr CSS overrides here (optional)
├── themes.js
├── themeEditor.js
├── themes.json
└── README.md
```

## Testing Your Local Installation

1. **Open `index.html` in a browser** (or serve via local server)

2. **Test the theme editor:**
   - Click the "editor" button in the footer
   - Click on any color picker
   - Verify the Pickr color picker appears and functions correctly

3. **Check for console errors:**
   - Open browser DevTools (F12)
   - Look for any 404 errors or missing file warnings

4. **Verify theme customization:**
   - If you customized the theme, check that colors match your Worktimer theme
   - Test in both light and dark Worktimer themes

## Advanced Customization

### Synchronize Pickr with Active Worktimer Theme

To make Pickr automatically adapt to the active Worktimer theme, you can update `themeEditor.js`:

```javascript
// Add this function to themeEditor.js
function updatePickrTheme() {
  const root = document.documentElement;
  const currentBg = getComputedStyle(root).getPropertyValue('--bg').trim();
  const currentFg = getComputedStyle(root).getPropertyValue('--fg').trim();
  const currentAccent = getComputedStyle(root).getPropertyValue('--accent').trim();
  
  // Apply styles to all Pickr instances
  document.querySelectorAll('.pcr-app').forEach(app => {
    app.style.background = currentBg;
    app.style.color = currentFg;
    app.style.borderColor = currentFg + '33'; // 20% opacity
  });
}

// Call this when theme changes
window.addEventListener('themeChanged', updatePickrTheme);
```

### Using Different Themes for Different Elements

You can load multiple Pickr themes and apply them selectively:

```html
<!-- In index.html -->
<link rel="stylesheet" href="lib/pickr/themes/monolith.min.css" id="pickr-theme-monolith"/>
<link rel="stylesheet" href="lib/pickr/themes/nano.min.css" id="pickr-theme-nano" disabled/>
```

```javascript
// Switch between themes
function switchPickrTheme(themeName) {
  document.getElementById('pickr-theme-monolith').disabled = (themeName !== 'monolith');
  document.getElementById('pickr-theme-nano').disabled = (themeName !== 'nano');
}
```

## Troubleshooting

### Pickr doesn't appear
- Check browser console for errors
- Verify file paths are correct
- Ensure `pickr.min.js` loads before `themeEditor.js`

### Colors don't match Worktimer theme
- Add CSS overrides in `styles.css` using `!important`
- Check CSS variable names match between themes
- Verify CSS is loaded after Pickr's theme CSS

### File size concerns
- Use minified versions (`.min.js` and `.min.css`)
- Consider enabling gzip compression on your server
- Total size: ~30KB for both files (gzipped)

## Additional Resources

- **Pickr GitHub Repository:** https://github.com/Simonwep/pickr
- **Pickr Documentation:** https://github.com/Simonwep/pickr#getting-started
- **NPM Package:** https://www.npmjs.com/package/@simonwep/pickr
- **Live Demo:** https://simonwep.github.io/pickr/

## Summary

**Minimum files needed for local Pickr installation:**
1. `lib/pickr/pickr.min.js` (~25KB)
2. `lib/pickr/themes/monolith.min.css` (~5KB)

**To customize the theme:**
1. Override CSS in `styles.css`, OR
2. Create a custom CSS theme file, OR
3. Modify the existing theme file directly

Total additional space required: ~30KB (minified and gzipped)
