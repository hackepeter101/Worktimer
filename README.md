# Worktimer

A minimalist countdown timer for tracking work hours with built-in break management.

## Features

- **Centered Timer Display**: Large, easy-to-read countdown timer
- **Multiple Themes**: Choose from 6 built-in themes with more customization options
- **Break Management**: Define custom break schedules
- **Rule-Based Schedules**: Set different work hours for different days
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Settings**: All preferences saved in browser localStorage

## Theming & Design Tokens

Worktimer uses a modern design token system for consistent theming and easy customization.

### Design Token System

All design values are centralized in `src/styles/tokens.css`:

- **Color Tokens**: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-muted`
- **Spacing Tokens**: `--spacing-xs` through `--spacing-3xl` (4px to 48px)
- **Font Size Tokens**: `--font-size-xs` through `--font-size-4xl`
- **Border Radius**: Set to `0` for rectangular, minimalist design
- **Transitions**: All animations limited to ≤200ms for performance and accessibility

### Built-in Themes

Six themes are available by default (defined in `src/styles/themes.json`):

1. **Light** - Clean, bright theme for daytime use
2. **Dark** - Default dark theme with blue accents
3. **Mono** - Monochrome black and white theme
4. **Ocean** - Cool blue tones inspired by the sea
5. **Forest** - Natural green tones
6. **Warm** - Warm orange and brown tones

### Using Themes

**Switching Themes:**
- Click the "Theme" button in the header to cycle through available themes
- Your selection is automatically saved and persists across sessions

**Programmatic Usage:**
```javascript
// Initialize theme system
await ThemeSwitcher.init();

// Set a specific theme
ThemeSwitcher.setTheme('ocean');

// Cycle to next theme
ThemeSwitcher.cycleTheme();

// Get current theme
const currentTheme = ThemeSwitcher.getCurrentTheme();

// Get all available themes
const allThemes = ThemeSwitcher.getThemes();
```

### Creating Custom Themes

Add new themes by editing `src/styles/themes.json`:

```json
{
  "id": "custom",
  "name": "My Custom Theme",
  "tokens": {
    "--color-bg": "#1a1a1a",
    "--color-surface": "#2d2d2d",
    "--color-text": "#e0e0e0",
    "--color-accent": "#ff6b6b",
    "--color-muted": "#999999"
  }
}
```

All themes must include the five required color tokens. The theme switcher validates themes before applying them.

### Accessibility

- **Contrast**: All themes maintain WCAG AA contrast ratios (minimum 4.5:1)
- **Animations**: Limited to 200ms to respect `prefers-reduced-motion`
- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Readers**: Proper ARIA labels and semantic HTML

### Design Principles

- **Rectangular Shapes**: All UI elements use rectangular borders (border-radius: 0) for a clean, minimal aesthetic
- **SVG Icons**: All icons are optimized inline SVGs, no raster images
- **Performance**: Fast theme switching with minimal reflows
- **No Breaking Changes**: Legacy theme variables are maintained for backward compatibility

## Usage

Simply open `index.html` in a modern web browser. No build step required.

### Controls

- **Theme Button**: Cycle through available themes
- **Settings**: Configure work schedules, breaks, and rules
- **Start/Pause/Stop**: Control the countdown timer

## Browser Support

Works in all modern browsers that support:
- CSS Custom Properties (CSS Variables)
- ES6+ JavaScript
- LocalStorage API
- Fetch API

## License

MIT License - feel free to use and modify as needed.
