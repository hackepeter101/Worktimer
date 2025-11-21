# Copilot Instructions for Worktimer

## Project Overview

Worktimer is a beautiful countdown timer web application for tracking your workday with customizable themes. It's a single-page application (SPA) built with vanilla JavaScript, HTML, and CSS - **no build system, no frameworks, no bundlers**.

### Key Features
- Work time tracking with countdown timers
- Progress visualization
- Flexible work schedule rules
- Break management
- Web push notifications for break reminders
- Comprehensive theme system with 15+ built-in themes and custom theme creation

## Architecture

### Technology Stack
- **Frontend**: Pure vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: LocalStorage for all data persistence
- **Service Worker**: For background notifications
- **External Libraries**: 
  - Pickr color picker (loaded from CDN)
  - No npm dependencies

### File Structure
```
/
├── index.html           # Main application page
├── script.js            # Main application logic
├── styles.css           # Main stylesheet
├── themes.js            # Theme system core logic
├── themeEditor.js       # Theme editor UI controller
├── themes.json          # Built-in theme definitions
├── sw.js                # Service worker for notifications
├── pickr-custom.css     # Custom styles for Pickr color picker
├── favicon.svg          # Application icon
├── welcome.md           # Welcome screen content
├── src/
│   ├── markdownParser.js   # Simple markdown parser
│   └── themeManager.js     # Theme management utilities
└── icons/               # Icon assets
```

## Development Guidelines

### Code Style

1. **JavaScript**:
   - Use ES6+ features (arrow functions, template literals, destructuring, etc.)
   - Use strict mode (`"use strict"`)
   - Prefer `const` over `let`, avoid `var`
   - Use shorthand selectors: `$()` for `querySelector`, `$$()` for `querySelectorAll`
   - Follow existing naming conventions:
     - `camelCase` for variables and functions
     - `UPPER_SNAKE_CASE` for constants
     - Prefix localStorage keys with descriptive namespace (e.g., `worktimer:`, `workday.`)

2. **HTML**:
   - Use semantic HTML5 elements
   - Include proper ARIA attributes for accessibility
   - Use SVG sprites for icons (defined in `index.html`)

3. **CSS**:
   - Use CSS custom properties (variables) for theming
   - Follow existing class naming patterns (kebab-case)
   - Organize styles logically (layout, components, utilities)

### LocalStorage Keys

The application uses several localStorage keys for persistence:

**Theme System**:
- `worktimer:selectedTheme` - Currently selected theme ID
- `worktimer:localThemes` - Custom theme definitions (JSON object)

**Core Application**:
- `workday.rules.v1` - Work schedule rules
- `workday.layout.v1` - Display layout preference ('big-total' | 'big-break')
- `workday.theme.v2` - Legacy theme setting (being phased out)
- `workday.themeStore.v2` - Legacy theme storage (being phased out)
- `workday.notifications.v1` - Notification preferences

### Theme System

The theme system is a core feature with specific conventions:

**Theme Structure**:
```javascript
{
  id: "theme-id",           // Unique identifier (kebab-case)
  name: "Theme Name",       // Display name
  builtIn: true,            // Whether it's a built-in theme
  variables: {              // CSS custom properties
    "--bg": "#000000",      // Background color
    "--fg": "#ffffff",      // Foreground/text color
    "--text": "#ffffff",    // Text color (alias)
    "--muted": "#888888",   // Muted/secondary text
    "--card": "#1a1a1a",    // Card/surface background
    "--accent": "#00ff00",  // Primary accent color
    "--accent-2": "#00cc00",// Secondary accent color
    "--danger": "#ff0000",  // Error/danger color
    // Color aliases for consistency:
    "--color-bg": "#000000",
    "--color-text": "#ffffff",
    "--color-muted": "#888888",
    "--color-surface": "#1a1a1a",
    "--color-accent": "#00ff00"
  }
}
```

**Theme Management**:
- Built-in themes are defined in `themes.json`
- Custom themes are stored in localStorage under `worktimer:localThemes`
- The `ThemeSystem` global object provides the theme API
- Never modify built-in themes; they are read-only
- Always include both base variable names and `--color-*` aliases for compatibility

### Notifications

The notification system uses the Service Worker API:
- Requires explicit user opt-in (never auto-request permissions)
- Configurable reminder times (1-30 minutes before breaks)
- All notification logic is local; no external push service
- Service worker is registered in `sw.js`

### Adding Features

When adding new features:

1. **No Build Step**: All code must run directly in the browser
2. **No Dependencies**: Avoid adding npm packages or build tools
3. **Progressive Enhancement**: Features should degrade gracefully
4. **LocalStorage First**: Use localStorage for all data persistence
5. **Accessibility**: Include proper ARIA labels and semantic HTML
6. **Theme Support**: Ensure new UI uses CSS custom properties for colors

### Common Patterns

**DOM Manipulation**:
```javascript
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

const element = $("#myElement");
const elements = $$(".myClass");
```

**LocalStorage Utilities**:
```javascript
// Save
localStorage.setItem(key, JSON.stringify(data));

// Load
const data = JSON.parse(localStorage.getItem(key) || 'null');

// With fallback
const data = JSON.parse(localStorage.getItem(key) || '{}');
```

**Time Formatting**:
```javascript
const pad = (n) => String(n).padStart(2, "0");
const toHM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
```

**HTML Escaping**:
```javascript
const escapeHtml = (s = "") => 
  s.replace(/[&<>"']/g, (c) => escapeMap[c]);
```

## Testing

Currently, the application does not have automated tests. Testing is done manually:

1. Open `index.html` in a browser (or use a local server)
2. Test features interactively
3. Verify across different browsers (Chrome, Firefox, Safari)
4. Test theme switching and custom theme creation
5. Test notification permissions and delivery
6. Verify localStorage persistence (refresh page, check data retention)

**Test Checklist for Changes**:
- [ ] Theme switching works correctly
- [ ] Custom themes can be created, edited, and deleted
- [ ] Notifications can be enabled/disabled
- [ ] Work rules can be configured
- [ ] Layout toggle works
- [ ] Progress bar updates correctly
- [ ] Service worker registers successfully
- [ ] LocalStorage data persists across page reloads

## Browser Compatibility

Target modern browsers with support for:
- ES6+ JavaScript
- CSS Custom Properties
- LocalStorage API
- Service Worker API (for notifications)
- Fetch API

**Minimum Browser Versions**:
- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Security Considerations

- **No External Requests**: All data is local; no data sent to external servers
- **XSS Prevention**: Always escape user input before inserting into DOM
- **CSP**: Consider adding Content Security Policy headers if hosting
- **Notification Permissions**: Only request when user explicitly opts in

## Important Constraints

1. **No Build System**: Do not introduce webpack, Vite, or any bundler
2. **No Package Manager**: Do not add package.json or npm dependencies
3. **No Transpilation**: Code must be vanilla ES6+ that runs directly in browsers
4. **No Frameworks**: No React, Vue, Angular, or similar frameworks
5. **Keep It Simple**: Maintain the lightweight, fast-loading nature of the app

## Contributing Code

When modifying code:

1. **Preserve existing patterns**: Follow the established code style
2. **Update documentation**: If you change features, update README.md
3. **Test thoroughly**: Manually verify all affected functionality
4. **Consider themes**: Ensure new UI elements support theming
5. **Maintain accessibility**: Include ARIA labels and semantic markup
6. **No breaking changes**: Don't break existing localStorage data structures

## Known Patterns to Follow

- Icon usage: Use SVG sprites defined in `index.html`, reference via `<use href="#icon-name">`
- Modal dialogs: Use the `.overlay` and `.panel` classes
- Form inputs: Use `.simple-input`, `.simple-btn` classes
- Settings panels: Add content dynamically to `#settingsContent`
- Theme variables: Always define both `--var` and `--color-var` versions

## Quick Reference

**Global Objects**:
- `window.ThemeSystem` - Theme management API
- `window.markdownToHtml()` - Simple markdown parser

**Common Selectors**:
- `$("#elementId")` - Get element by ID
- `$$(".className")` - Get all elements by class
- `$("selector", parent)` - Query within parent element

**Day Abbreviations**:
```javascript
const dayAbbr = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];  // German
const weekdayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
```

## Debugging Tips

- Check browser console for errors
- Inspect localStorage in DevTools (Application tab)
- Check Service Worker registration in DevTools
- Use browser's notification settings to verify permissions
- Test with different themes to ensure CSS variable coverage
- Clear localStorage to test fresh installation: `localStorage.clear()`
