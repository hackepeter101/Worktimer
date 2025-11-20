# Worktimer

A beautiful countdown timer for tracking your workday with customizable themes.

## Features

- **Work Time Tracking**: Displays countdown timers for your total workday and next break
- **Progress Visualization**: Visual progress bar showing your workday completion
- **Flexible Rules**: Configure different work schedules for different days of the week
- **Break Management**: Add multiple breaks to your work schedule
- **Break Reminders**: Get web push notifications to remind you when breaks are coming (opt-in)
- **Theme System**: Choose from built-in themes or create your own custom themes

## Break Reminders (Web Push Notifications)

Worktimer can send you browser notifications to remind you when your breaks are approaching, so you never miss a scheduled break.

### How to Enable Notifications

1. Click the **"notifications"** button (bell icon) in the footer
2. Click **"Enable Notifications"** in the settings panel
3. Allow notifications when your browser prompts you
4. Configure your reminder preferences:
   - Toggle break reminders on/off
   - Set how many minutes before a break you want to be reminded (1-30 minutes, default is 5)

### Privacy & Permissions

- **No immediate permission prompt**: The app will NOT ask for notification permissions when you first open it
- **You're in control**: Notifications are completely optional and only enabled when you explicitly click "Enable Notifications"
- **Local only**: Notifications are generated locally in your browser - no external push service is used
- **Revoke anytime**: You can disable notifications at any time through the settings panel or your browser settings

### How It Works

- Once enabled, the app monitors your work schedule in the background
- When a break is approaching (based on your configured reminder time), you'll receive a notification
- Clicking the notification will bring you back to the app
- The app uses a service worker to manage notifications efficiently

## Theme System

Worktimer includes a powerful theme system that allows you to customize the appearance of the app.

### Built-in Themes

The app comes with three distinct built-in themes:

- **Light**: Clean, bright theme with light background
- **Dark**: Modern dark theme for reduced eye strain
- **High Contrast**: Maximum contrast theme for accessibility (WCAG AA compliant)

### Theme Editor

The Theme Editor allows you to create and manage custom themes:

1. Click the **"editor"** button next to the theme selector in the footer
2. In the Theme Editor modal, you can:
   - View all available themes (built-in and custom)
   - Create new themes by specifying:
     - Theme name
     - Background color
     - Text color
     - Accent color (used for countdowns and highlights)
     - Accent 2 color (used for gradients)
     - Muted color (used for secondary text)
   - Preview themes before saving
   - Edit existing custom themes
   - Delete custom themes

### Using Themes

**Select a theme:**
- Use the theme dropdown in the footer to select any available theme
- Your selection is automatically saved and will be applied when you return to the app

**Create a custom theme:**
1. Open the Theme Editor (click "editor" button)
2. Enter a name for your theme
3. Choose colors using the color pickers or by entering hex values
4. Click "Preview" to see how it looks (optional)
5. Click "Save Theme" to save your custom theme
6. Your theme is now available in the theme selector

**Edit a custom theme:**
1. Open the Theme Editor
2. Click the edit button (pencil icon) next to the theme you want to edit
3. Make your changes
4. Click "Save Theme"

**Delete a custom theme:**
1. Open the Theme Editor
2. Click the delete button (trash icon) next to the theme you want to delete
3. Confirm the deletion

### Technical Details

**LocalStorage Keys:**
- `worktimer:selectedTheme` - Stores the currently selected theme ID
- `worktimer:localThemes` - Stores custom theme definitions

**CSS Variables:**
Each theme defines the following CSS variables:
- `--bg` / `--color-bg`: Background color
- `--fg` / `--text` / `--color-text`: Text color
- `--muted` / `--color-muted`: Muted/secondary text color
- `--card` / `--color-surface`: Surface/card background color
- `--accent` / `--color-accent`: Primary accent color
- `--accent-2`: Secondary accent color
- `--danger`: Danger/error color

**Programmatic Theme Management:**

The theme system exposes a global `ThemeSystem` object with the following API:

```javascript
// Get all themes
const allThemes = window.ThemeSystem.getAllThemes();

// Get built-in themes only
const builtInThemes = window.ThemeSystem.getBuiltInThemes();

// Get custom themes only
const localThemes = window.ThemeSystem.getLocalThemes();

// Get a specific theme
const theme = window.ThemeSystem.getThemeById('dark');

// Apply a theme
window.ThemeSystem.applyTheme('ocean-blue');

// Save a custom theme
const themeId = window.ThemeSystem.saveLocalTheme('My Theme', {
  variables: {
    '--bg': '#000000',
    '--fg': '#ffffff',
    '--accent': '#00ff00',
    '--accent-2': '#00cc00',
    '--muted': '#888888'
  }
});

// Delete a custom theme
window.ThemeSystem.deleteLocalTheme('my-theme');

// Get current theme ID
const currentThemeId = window.ThemeSystem.getCurrentThemeId();
```

### Theme File Format

Built-in themes are defined in `themes.json`:

```json
{
  "themes": [
    {
      "id": "light",
      "name": "Light",
      "builtIn": true,
      "variables": {
        "--bg": "#ffffff",
        "--fg": "#1a1a1a",
        "--accent": "#2563eb",
        "--accent-2": "#1d4ed8",
        "--muted": "#666666"
      }
    }
  ]
}
```

Custom themes are stored in localStorage with the same format (without the `builtIn` flag).

## Development

The theme system consists of three main files:

- `themes.js`: Core theme management logic
- `themeEditor.js`: UI controller for the Theme Editor modal
- `themes.json`: Built-in theme definitions

## Browser Support

The app works in all modern browsers that support:
- CSS Custom Properties (CSS Variables)
- LocalStorage
- ES6+ JavaScript

## License

MIT
