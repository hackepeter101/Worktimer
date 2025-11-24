(() => {
  "use strict";

  /* ===== Development/Debug Mode ===== */
  const IS_DEV = false; // Set to true for development
  const log = (...args) => {
    if (IS_DEV) console.log(...args);
  };
  const logError = (...args) => console.error(...args); // Always log errors
  
  /* ===== Utility Functions ===== */
  // UUID generation with fallback for older browsers
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return generateUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  /* ===== LocalStorage Keys ===== */
  const LS_KEY_RULES = "workday.rules.v1";
  const LS_KEY_LAYOUT = "workday.layout.v1"; // 'big-total' | 'big-break'
  const LS_KEY_NOTIFICATIONS = "workday.notifications.v1";
  
  // Legacy theme keys - kept for backwards compatibility
  const THEME_STORE_KEY = "workday.themeStore.v2";
  const LS_KEY_THEME = "workday.theme.v2";

  /* ===== Days ===== */
  const dayAbbr = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const weekdayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  /* ===== Helpers ===== */
  const pad = (n) => String(n).padStart(2, "0");
  const toHM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  const escapeHtml = (s = "") =>
    s.replace(/[&<>"']/g, (c) => escapeMap[c]);

  
  // Validate CSS color values to prevent XSS
  const sanitizeColor = (color, fallback = '#000000') => {
    if (!color || typeof color !== 'string') return fallback;
    const trimmed = color.trim();
    
    // Strict validation for hex colors (most common)
    if (/^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{8}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Strict validation for rgb/rgba
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) {
      return trimmed;
    }
    
    // Strict validation for hsl/hsla
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) {
      return trimmed;
    }
    
    // Allow only safe named colors (whitelist)
    const safeNamedColors = ['transparent', 'black', 'white', 'red', 'green', 'blue', 
                             'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'];
    if (safeNamedColors.includes(trimmed.toLowerCase())) {
      return trimmed.toLowerCase();
    }
    
    return fallback;
  };

  const parseHM = (hm) => {
    if (!hm || typeof hm !== 'string') return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    if (h < 0 || h > 23 || mi < 0 || mi > 59 || isNaN(h) || isNaN(mi)) return null;
    return { h, mi };
  };
  const midnightOf = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /* ===== Layout ===== */
  const loadLayout = () =>
    localStorage.getItem(LS_KEY_LAYOUT) || "big-total";
  const saveLayout = (l) => localStorage.setItem(LS_KEY_LAYOUT, l);

  /* ===== Time Constants ===== */
  const MS_PER_SECOND = 1000;
  const MS_PER_MINUTE = 60 * MS_PER_SECOND;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  
  /* ===== UI Update Constants ===== */
  const TICK_INTERVAL_MS = 1000; // Update UI every second
  const FOCUS_DELAY_MS = 100; // Delay before focusing elements
  const SCROLL_DELAY_MS = 100; // Delay before scrolling to element
  
  /* ===== Notification System Constants ===== */
  const NOTIFICATION_COOLDOWN_MS = 60000; // 1 minute cooldown between notifications
  const MAX_SCHEDULED_NOTIFICATIONS = 10; // Maximum number of scheduled notifications to track
  const NOTIFICATION_REMINDER_WINDOW_MS = 30000; // 30-second window to catch reminder time
  
  /* ===== Notification System ===== */
  const NotificationSystem = {
    _settings: null,
    _lastNotificationTime: 0,
    _scheduledNotifications: new Set(),

    loadSettings() {
      try {
        const stored = localStorage.getItem(LS_KEY_NOTIFICATIONS);
        this._settings = stored ? JSON.parse(stored) : {
          enabled: false,
          breakReminders: true,
          reminderMinutes: 5,
          permissionAsked: false
        };
        return this._settings;
      } catch {
        return {
          enabled: false,
          breakReminders: true,
          reminderMinutes: 5,
          permissionAsked: false
        };
      }
    },

    saveSettings(settings) {
      this._settings = settings;
      localStorage.setItem(LS_KEY_NOTIFICATIONS, JSON.stringify(settings));
    },

    async registerServiceWorker() {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      
      try {
        // Use relative path with proper scope to prevent path traversal
        // Scope is restricted to current directory
        const registration = await navigator.serviceWorker.register('./sw.js', {
          scope: './'
        });
        log('Service worker registered successfully');
        return true;
      } catch (error) {
        logError('Service worker registration failed:', error);
        return false;
      }
    },

    async requestPermission() {
      if (!('Notification' in window)) {
        return false;
      }

      const settings = this.loadSettings();
      
      // Check if permission already granted
      if (Notification.permission === 'granted') {
        settings.enabled = true;
        settings.permissionAsked = true;
        this.saveSettings(settings);
        return true;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      settings.permissionAsked = true;
      
      if (permission === 'granted') {
        settings.enabled = true;
        this.saveSettings(settings);
        await this.registerServiceWorker();
        return true;
      } else {
        settings.enabled = false;
        this.saveSettings(settings);
        return false;
      }
    },

    isEnabled() {
      const settings = this.loadSettings();
      return settings.enabled && Notification.permission === 'granted';
    },

    async showNotification(title, options = {}) {
      if (!this.isEnabled()) return;

      // Cooldown check to prevent spam
      const now = Date.now();
      if (now - this._lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
        return;
      }
      this._lastNotificationTime = now;

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          vibrate: [200, 100, 200],
          tag: 'break-reminder',
          requireInteraction: false,
          ...options
        });
      } catch (error) {
        logError('Failed to show notification:', error);
      }
    },

    checkBreakReminder(state, now) {
      if (!this.isEnabled()) return;
      
      const settings = this.loadSettings();
      if (!settings.breakReminders) return;

      // Only check during work time
      if (state.type !== 'during' || state.mode !== 'work') return;

      const segs = state.segments || [];
      const nextBreak = segs.find(s => s.type === 'break' && s.start > now);
      
      if (!nextBreak) return;

      const timeToBreak = nextBreak.start - now;
      const reminderMs = settings.reminderMinutes * MS_PER_MINUTE;
      
      // Show notification if we're within the reminder window
      if (timeToBreak <= reminderMs && timeToBreak > (reminderMs - NOTIFICATION_REMINDER_WINDOW_MS)) {
        const breakKey = `${nextBreak.start.getTime()}`;
        
        // Prevent duplicate notifications for the same break
        if (this._scheduledNotifications.has(breakKey)) return;
        this._scheduledNotifications.add(breakKey);
        
        // Clean up old scheduled notifications
        if (this._scheduledNotifications.size > MAX_SCHEDULED_NOTIFICATIONS) {
          const oldest = Array.from(this._scheduledNotifications)[0];
          this._scheduledNotifications.delete(oldest);
        }

        const breakTime = toHM(nextBreak.start);
        const minutesUntil = Math.ceil(timeToBreak / MS_PER_MINUTE);
        
        this.showNotification('Break Reminder', {
          body: `Your break starts in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''} at ${breakTime}`,
          tag: `break-${breakKey}`
        });
      }
    },

    disable() {
      const settings = this.loadSettings();
      settings.enabled = false;
      this.saveSettings(settings);
      this._scheduledNotifications.clear();
    }
  };

  /* ===== THEME SYSTEM v2 (legacy - replaced by ThemeSystem in themes.js) ===== */
  // Note: This legacy code is kept for backwards compatibility with old localStorage data
  // The new theme system is in themes.js and is preferred
  function loadThemeStore() {
    try {
      return (
        JSON.parse(localStorage.getItem(THEME_STORE_KEY)) || {
          themes: [],
        }
      );
    } catch {
      return { themes: [] };
    }
  }
  function saveThemeStore(store) {
    localStorage.setItem(THEME_STORE_KEY, JSON.stringify(store));
  }
  let themeStore = loadThemeStore();

  // Fallback-Theme
  if (!themeStore.themes || themeStore.themes.length === 0) {
    themeStore.themes = [
      {
        key: "default",
        name: "monkeytype",
        palette: {
          bg: "#323437",
          fg: "#d1d0c5",
          muted: "#646669",
          card: "#2c2e31",
          accent: "#e2b714",
          "accent-2": "#e2b714",
          danger: "#ca4754",
        },
        bgDaily: false,
      },
    ];
    saveThemeStore(themeStore);
    saveTheme("default");
  }

  function loadTheme() {
    return (
      localStorage.getItem(LS_KEY_THEME) ||
      themeStore.themes[0]?.key ||
      null
    );
  }
  function saveTheme(key) {
    if (key) localStorage.setItem(LS_KEY_THEME, key);
  }
  function getThemeByKey(key) {
    return themeStore.themes.find((t) => t.key === key) || null;
  }

  // applyTheme
  // applyTheme
  async function applyTheme(key = loadTheme(), now = new Date()) {
    const theme = key ? getThemeByKey(key) : null;
    if (!theme) return;

    const root = document.documentElement;
    const body = document.body;
    const p = theme.palette || {};

    const set = (k, v) =>
      v != null
        ? root.style.setProperty(`--${k}`, v)
        : root.style.removeProperty(`--${k}`);
    set("bg", p.bg);
    set("fg", p.fg);
    set("muted", p.muted);
    set("card", p.card);
    set("accent", p.accent);
    set("accent-2", p["accent-2"]);
    set("danger", p.danger);

    body.style.backgroundColor = p.bg || "";
    body.style.color = p.fg || "";
  }

  const themeGrid = document.getElementById("themeGrid");

  // Auto-Name: "Theme #N"
  function nextThemeName() {
    const nums = themeStore.themes
      .map((t) => {
        const m = /^Theme\s*#?\s*(\d+)$/i.exec(t.name || "");
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n) => Number.isFinite(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `Theme #${next}`;
  }
  let themeNameAutofilled = false;
  function fillDefaultThemeName(force = false) {
    const el = document.getElementById("themeName");
    if (!el) return;
    if (force || el.value.trim() === "" || themeNameAutofilled) {
      el.value = nextThemeName();
      themeNameAutofilled = true;
    }
  }
  $("#themeName")?.addEventListener("input", () => {
    themeNameAutofilled = false;
  });

  function renderThemeChips() {
    if (!themeGrid) return;
    themeGrid.innerHTML = "";
    const current = loadTheme();
    for (const t of themeStore.themes) {
      const chip = document.createElement("div");
      chip.className = "theme-chip";
      chip.dataset.theme = t.key;
      chip.dataset.selected = t.key === current ? "true" : "false";
      chip.setAttribute("aria-pressed", chip.dataset.selected);

      const c1 = t.palette?.accent || "#666";
      const c2 = t.palette?.["accent-2"] || "#999";
      const srcLabel =
        t.source === "bing" ? "bing" : t.bgDaily ? "daily" : "static";

      chip.innerHTML = `
          <span class="swatch" style="background: linear-gradient(90deg, ${c1}, ${c2});"></span>
          <span>${escapeHtml(t.name)}</span>
          <span style="margin-left:8px;opacity:.65;">(${srcLabel})</span>
          <button type="button" class="edit-theme" title="Theme bearbeiten" style="margin-left:10px;background:transparent;border:0;color:inherit;opacity:.9;">✎</button>
          <button type="button" class="del-theme"  title="Theme löschen"    style="margin-left:4px;background:transparent;border:0;color:inherit;opacity:.8;">✕</button>
        `;

      // Aktivieren
      chip.addEventListener("click", (e) => {
        const target = e.target;
        if (
          target &&
          target.closest &&
          (target.closest(".del-theme") || target.closest(".edit-theme"))
        )
          return;
        saveTheme(t.key);
        applyTheme(t.key).catch(() => {
          // Silent error - app continues to work
        });
        updateThemeSelection();
      });
      // Bearbeiten
      chip
        .querySelector(".edit-theme")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          startEditTheme(t.key);
        });
      // Löschen
      chip.querySelector(".del-theme")?.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCustomTheme(t.key);
      });

      themeGrid.appendChild(chip);
    }
    if (themeStore.themes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "theme-empty";
      empty.textContent = "Noch kein Theme. Füge eines hinzu.";
      themeGrid.appendChild(empty);
    }
  }
  function updateThemeSelection() {
    const current = loadTheme();
    const chips = $$(".theme-chip", themeGrid);
    if (!chips || chips.length === 0) return;
    
    chips.forEach((chip) => {
      if (!chip.dataset) return;
      const sel = chip.dataset.theme === current;
      chip.dataset.selected = sel ? "true" : "false";
      chip.setAttribute("aria-pressed", sel ? "true" : "false");
    });
  }

  function addCustomTheme(input) {
    const base = (input.key || input.name || "theme")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");
    const unique = themeStore.themes.some((t) => t.key === base);
    const key = unique
      ? `${base}-${generateUUID().slice(0, 6)}`
      : base;

    let bgImages = [];
    if (Array.isArray(input.bgImages))
      bgImages = input.bgImages.filter(Boolean);
    else if (typeof input.bgImagesStr === "string")
      bgImages = input.bgImagesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else if (
      typeof input.bgImage === "string" &&
      input.bgImage.includes(",")
    )
      bgImages = input.bgImage
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const theme = {
      key,
      name: input.name || nextThemeName(),
      palette: {
        bg: input.bg ?? "#323437",
        fg: input.fg ?? "#d1d0c5",
        muted: input.muted ?? "#646669",
        card: input.card ?? "#2c2e31",
        accent: input.accent ?? "#e2b714",
        "accent-2": input.accent2 ?? "#e2b714",
        danger: input.danger ?? "#ca4754",
      },
      source: input.source || null, // 'bing' | null
      bingMarket: input.bingMarket || null,

      bgImage:
        input.bgImage && !input.bgImage.includes(",")
          ? input.bgImage
          : null,
      bgImages,
      bgDaily: input.bgDaily ?? bgImages.length > 1,
      bgMode: input.bgMode || "dayOfYear",
    };

    if (!theme.bgImage && theme.bgImages.length > 0)
      theme.bgImage = theme.bgImages[0];

    themeStore.themes.push(theme);
    saveThemeStore(themeStore);
    saveTheme(theme.key);
    applyTheme(theme.key).catch(() => {
      // Silent error - app continues to work
    });
    renderThemeChips();
    updateThemeSelection();

    // Nächsten Defaultnamen setzen
    fillDefaultThemeName(true);
  }
  function deleteCustomTheme(key) {
    const idx = themeStore.themes.findIndex((t) => t.key === key);
    if (idx > -1) {
      themeStore.themes.splice(idx, 1);
      saveThemeStore(themeStore);
      if (loadTheme() === key) {
        const fallback = themeStore.themes[0]?.key || null;
        if (fallback) {
          saveTheme(fallback);
          applyTheme(fallback).catch(() => {
            // Silent error - app continues to work
          });
        } else {
          localStorage.removeItem(LS_KEY_THEME);
        }
      }
      renderThemeChips();
      updateThemeSelection();
      fillDefaultThemeName(true);
    }
  }

  // ===== Theme edit =====
  let editingKey = null;

  function startEditTheme(key) {
    const t = getThemeByKey(key);
    if (!t) return;
    editingKey = key;

    const nameEl = $("#themeName");
    const acc1El = $("#accentColor");
    const acc2El = $("#accent2Color");
    const bgColEl = $("#bgColor");
    const bgStrEl = $("#bgImage");
    const useBingEl = $("#useBingDaily");
    const marketSel = $("#bingMarket");
    const optBox = $("#bingOptions");

    if (nameEl) nameEl.value = t.name || "";
    if (acc1El) acc1El.value = t.palette?.accent || "#6ea8fe";
    if (acc2El) acc2El.value = t.palette?.["accent-2"] || "#b17aff";
    if (bgColEl) bgColEl.value = t.palette?.bg || "#0b0c0f";

    const imgs =
      t.bgImages && t.bgImages.length
        ? t.bgImages.join(", ")
        : t.bgImage || "";
    if (bgStrEl) bgStrEl.value = imgs;

    const isBing = t.source === "bing";
    if (useBingEl) useBingEl.checked = isBing;
    if (optBox) optBox.style.display = isBing ? "" : "none";
    if (marketSel && t.bingMarket) marketSel.value = t.bingMarket;

    const addBtn = $("#addThemeBtn");
    const cancel = $("#cancelEditBtn");
    if (addBtn) {
      addBtn.textContent = "Theme speichern";
      addBtn.dataset.mode = "edit";
    }
    if (cancel) cancel.style.display = "";
  }

  function finishEditMode() {
    const addBtn = $("#addThemeBtn");
    const cancel = $("#cancelEditBtn");
    if (addBtn) {
      addBtn.textContent = "Theme hinzufügen";
      addBtn.dataset.mode = "";
    }
    if (cancel) cancel.style.display = "none";
    editingKey = null;
  }

  function updateTheme(key, input) {
    const t = getThemeByKey(key);
    if (!t) return;

    t.name = input.name || t.name;
    t.palette = t.palette || {};
    if (input.bg) t.palette.bg = input.bg;
    if (input.accent) t.palette.accent = input.accent;
    if (input.accent2) t.palette["accent-2"] = input.accent2;

    if (input.source === "bing") {
      t.source = "bing";
      t.bingMarket = input.bingMarket || t.bingMarket || "de-DE";
      t.bgImage = null;
      t.bgImages = [];
      t.bgDaily = true;
    } else {
      t.source = null;
      t.bingMarket = null;
      let bgImages = [];
      if (Array.isArray(input.bgImages))
        bgImages = input.bgImages.filter(Boolean);
      else if (typeof input.bgImagesStr === "string")
        bgImages = input.bgImagesStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      t.bgImages = bgImages;
      t.bgImage =
        !bgImages.length && input.bgImage
          ? input.bgImage
          : bgImages[0] || null;
      t.bgDaily = bgImages.length > 1;
    }

    saveThemeStore(themeStore);
    renderThemeChips();
    updateThemeSelection();
    if (loadTheme() === key) {
      applyTheme(key).catch(() => {
        // Silent error - app continues to work
      });
    }
    finishEditMode();
  }

  // UI: Bing-Optionen togglen (anzeigen/verbergen)
  $("#useBingDaily")?.addEventListener("change", (e) => {
    const on = e.target.checked;
    const box = $("#bingOptions");
    if (box) box.style.display = on ? "" : "none";
  });

  // Jetzt aktualisieren (Bing neu holen, falls Theme auf Bing steht)
  $("#refreshBing")?.addEventListener("click", async () => {
    const current = getThemeByKey(loadTheme());
    if (!current || current.source !== "bing") return;
    // Non-blocking refresh - errors are handled silently
    applyTheme(current.key).catch(() => {
      // Silent error - app continues to work
    });
  });

  // Add/Save Theme Button
  $("#addThemeBtn")?.addEventListener("click", async () => {
    const addBtn = $("#addThemeBtn");
    const mode = addBtn?.dataset.mode || "";

    const nameEl = $("#themeName");
    const nameRaw = nameEl ? nameEl.value.trim() : "";
    const name = nameRaw || nextThemeName();

    const accent = $("#accentColor")?.value;
    const accent2 = $("#accent2Color")?.value;
    const bgCol = $("#bgColor")?.value;
    const bgStrEl = $("#bgImage");
    const bgStr = bgStrEl ? bgStrEl.value.trim() : "";

    const useBing = $("#useBingDaily")?.checked;
    const bingMkt = $("#bingMarket")?.value || "de-DE";

    if (mode === "edit" && editingKey) {
      updateTheme(editingKey, {
        name,
        accent,
        accent2,
        bg: bgCol || undefined,
        source: useBing ? "bing" : null,
        bingMarket: useBing ? bingMkt : null,
        bgImagesStr: useBing ? "" : bgStr,
        bgDaily: !useBing,
        bgMode: "dayOfYear",
      });
    } else {
      if (useBing) {
        addCustomTheme({
          name,
          accent,
          accent2,
          bg: bgCol || undefined,
          source: "bing",
          bingMarket: bingMkt,
          bgDaily: true,
          bgMode: "dayOfYear",
        });
      } else {
        addCustomTheme({
          name,
          accent,
          accent2,
          bg: bgCol || undefined,
          bgImagesStr: bgStr,
          bgDaily: true,
          bgMode: "dayOfYear",
        });
      }
    }
  });

  // Abbrechen
  $("#cancelEditBtn")?.addEventListener("click", () => {
    finishEditMode();
    // Felder zurücksetzen
    fillDefaultThemeName(true);
    const bgStrEl = $("#bgImage");
    if (bgStrEl) bgStrEl.value = "";
    const cb = $("#useBingDaily");
    const box = $("#bingOptions");
    if (cb) cb.checked = false;
    if (box) box.style.display = "none";
  });

  function renderThemeListUI() {
    renderThemeChips();
    updateThemeSelection();
    fillDefaultThemeName(true);
  }

  /* ===== Settings Overlay (Simplified) ===== */
  const overlay = $("#overlay");
  const settingsContent = $("#settingsContent");
  
  const openSettings = (content) => {
    if (settingsContent) settingsContent.innerHTML = content;
    overlay?.classList.add("show");
    overlay?.setAttribute("aria-hidden", "false");
  };
  const closeSettings = () => {
    // Save any unsaved changes before closing
    saveCurrentRuleFromEditor();
    currentlyEditingRuleId = null; // Clear the tracking
    // Blur any focused element inside the overlay before hiding
    const activeElement = document.activeElement;
    if (activeElement && overlay?.contains(activeElement)) {
      activeElement.blur();
    }
    
    overlay?.classList.remove("show");
    overlay?.setAttribute("aria-hidden", "true");
  };
  
  // Layout Settings
  $("#layoutBtn")?.addEventListener("click", () => {
    const current = loadLayout();
    const content = `
      <div class="simple-option">
        <div class="simple-option-label">display mode</div>
        <div class="simple-option-buttons">
          <button class="simple-btn ${current === 'big-total' ? 'active' : ''}" data-layout="big-total">total</button>
          <button class="simple-btn ${current === 'big-break' ? 'active' : ''}" data-layout="big-break">break</button>
        </div>
      </div>
    `;
    openSettings(content);
    
    // Add event listeners
    $$('.simple-btn[data-layout]', settingsContent).forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.dataset.layout;
        saveLayout(layout);
        tick();
        updateLayoutLabel();
        $$('.simple-btn[data-layout]', settingsContent).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });
  
  // Theme Settings
  $("#themeBtn")?.addEventListener("click", () => {
    const allThemes = window.ThemeSystem?.getAllThemes() || [];
    const currentThemeId = window.ThemeSystem?.getCurrentThemeId();
    
    // Create theme preview cards
    const themeCards = allThemes.map(theme => {
      const isActive = theme.id === currentThemeId;
      const badge = theme.builtIn ? '<span class="theme-preview-badge">built-in</span>' : '';
      
      // Sanitize colors to prevent XSS injection
      const bgColor = sanitizeColor(theme.variables?.['--bg'], '#323437');
      const accentColor = sanitizeColor(theme.variables?.['--accent'], '#e2b714');
      const accent2Color = sanitizeColor(theme.variables?.['--accent-2'], accentColor);
      const textColor = sanitizeColor(theme.variables?.['--fg'] || theme.variables?.['--text'], '#d1d0c5');
      
      return `
        <div class="theme-preview-card ${isActive ? 'active' : ''}" data-theme-id="${escapeAttr(theme.id)}">
          <div class="theme-preview-colors" style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor} 60%, ${accentColor} 60%, ${accentColor} 80%, ${accent2Color} 80%);">
            <div class="theme-preview-text" style="color: ${textColor};">Aa</div>
          </div>
          <div class="theme-preview-info">
            <div class="theme-preview-name">${escapeHtml(theme.name)}${badge}</div>
          </div>
        </div>
      `;
    }).join('');
    
    const content = `
      <div class="simple-option">
        <div class="simple-option-label">select theme</div>
        <div class="theme-preview-grid">
          ${themeCards}
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(100, 102, 105, 0.15);">
          <button class="simple-btn active" id="openThemeEditor">
            <svg width="16" height="16"><use href="#icon-sliders"></use></svg>
            create or edit themes
          </button>
        </div>
      </div>
    `;
    openSettings(content);
    
    // Add event listeners for theme selection
    $$('.theme-preview-card', settingsContent).forEach(card => {
      card.addEventListener('click', () => {
        const themeId = card.dataset.themeId;
        if (window.ThemeSystem) {
          window.ThemeSystem.applyTheme(themeId);
          updateThemeLabel();
          // Update active state
          $$('.theme-preview-card', settingsContent).forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        }
      });
    });
    
    // Add event listener for theme editor button
    $("#openThemeEditor", settingsContent)?.addEventListener('click', () => {
      closeSettings();
      // Small delay to allow settings panel to close before opening theme editor
      const MODAL_TRANSITION_DELAY = 100;
      setTimeout(() => {
        document.getElementById('themeEditorBtn')?.click();
      }, MODAL_TRANSITION_DELAY);
    });
  });
  
  // Rules Settings
  $("#rulesBtn")?.addEventListener("click", () => {
    // Save any unsaved changes before switching views
    saveCurrentRuleFromEditor();
    currentlyEditingRuleId = null; // Clear the tracking
    
    const rulesList = rules.map(r => {
      return `
        <div class="rule-item-simple" data-id="${escapeAttr(r.id)}">
          <div class="rule-item-info">
            <div class="rule-item-name">${escapeHtml(r.name || 'Untitled')}</div>
            <div class="rule-item-details">${escapeHtml(r.days)} • ${escapeHtml(r.start)} - ${escapeHtml(r.end)}</div>
          </div>
          <div class="rule-item-actions">
            <button class="icon-btn edit-rule" title="Edit">
              <svg width="16" height="16"><use href="#icon-sliders"></use></svg>
            </button>
            <button class="icon-btn delete-rule" title="Delete">
              <svg width="16" height="16"><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    const content = `
      <div class="simple-option">
        <div class="simple-option-label">work rules</div>
        <div class="rules-list-simple">
          ${rulesList}
          <button class="simple-btn" id="addRuleSimple">+ add rule</button>
        </div>
      </div>
    `;
    openSettings(content);
    
    // Add event listeners for delete
    $$('.delete-rule', settingsContent).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleId = e.target.closest('.rule-item-simple').dataset.id;
        rules = rules.filter(r => r.id !== ruleId);
        saveRules(rules);
        // Refresh the rules view
        $("#rulesBtn").click();
      });
    });
    
    // Add event listeners for edit (opens full editor)
    $$('.edit-rule', settingsContent).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleId = e.target.closest('.rule-item-simple').dataset.id;
        openFullRulesEditor(ruleId);
      });
    });
    
    // Add rule button
    $("#addRuleSimple", settingsContent)?.addEventListener('click', () => {
      const newRule = {
        id: generateUUID(),
        name: "New Rule",
        days: "Mo,Di,Mi,Do,Fr",
        start: "09:00",
        end: "17:00",
        breaks: [],
      };
      rules.push(newRule);
      saveRules(rules);
      openFullRulesEditor(newRule.id);
    });
  });
  
  // Notifications Settings
  $("#notificationsBtn")?.addEventListener("click", () => {
    const settings = NotificationSystem.loadSettings();
    const permissionStatus = Notification?.permission || 'default';
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    let statusMessage = '';
    let actionButtons = '';
    
    if (!isSupported) {
      statusMessage = '<div class="notification-status warning">Your browser does not support notifications.</div>';
    } else if (permissionStatus === 'granted') {
      statusMessage = `<div class="notification-status ${settings.enabled ? 'success' : ''}">Notifications are ${settings.enabled ? 'enabled' : 'disabled'}.</div>`;
      actionButtons = settings.enabled 
        ? '<button class="simple-btn" id="disableNotifications">Disable Notifications</button>'
        : '<button class="simple-btn active" id="enableNotifications">Enable Notifications</button>';
    } else if (permissionStatus === 'denied') {
      statusMessage = '<div class="notification-status error">Notifications are blocked. Please enable them in your browser settings.</div>';
    } else {
      statusMessage = '<div class="notification-status">Enable notifications to receive break reminders.</div>';
      actionButtons = '<button class="simple-btn active" id="enableNotifications">Enable Notifications</button>';
    }
    
    const content = `
      <div class="simple-option">
        <div class="simple-option-label">break reminders</div>
        ${statusMessage}
        ${settings.enabled && permissionStatus === 'granted' ? `
          <div style="margin-top: 16px;">
            <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <input type="checkbox" id="breakRemindersToggle" ${settings.breakReminders ? 'checked' : ''} 
                     style="width: 18px; height: 18px; cursor: pointer;">
              <span>Remind me before breaks</span>
            </label>
            <label style="display: block; margin-bottom: 8px;">
              <span style="display: block; margin-bottom: 4px;">Reminder time (minutes before break):</span>
              <input type="number" id="reminderMinutes" class="simple-input" 
                     value="${settings.reminderMinutes || 5}" 
                     min="1" max="30" 
                     style="width: 100px;">
            </label>
          </div>
        ` : ''}
        <div class="simple-option-buttons" style="margin-top: 16px;">
          ${actionButtons}
        </div>
      </div>
    `;
    openSettings(content);
    
    // Enable notifications button
    $("#enableNotifications", settingsContent)?.addEventListener('click', async () => {
      const granted = await NotificationSystem.requestPermission();
      if (granted) {
        // Refresh the settings UI to show the new state
        $("#notificationsBtn")?.click();
      }
    });
    
    // Disable notifications button
    $("#disableNotifications", settingsContent)?.addEventListener('click', () => {
      NotificationSystem.disable();
      $("#notificationsBtn")?.click(); // Refresh UI
    });
    
    // Break reminders toggle
    $("#breakRemindersToggle", settingsContent)?.addEventListener('change', (e) => {
      settings.breakReminders = e.target.checked;
      NotificationSystem.saveSettings(settings);
    });
    
    // Reminder minutes input
    $("#reminderMinutes", settingsContent)?.addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 1 && value <= 30) {
        settings.reminderMinutes = value;
        NotificationSystem.saveSettings(settings);
      } else {
        e.target.value = settings.reminderMinutes;
      }
    });
  });
  
  $("#closePanel")?.addEventListener("click", closeSettings);
  overlay?.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("show"))
      closeSettings();
  });
  
  // Update footer labels
  function updateLayoutLabel() {
    const layout = loadLayout();
    const label = layout === 'big-total' ? 'total' : 'break';
    const el = $("#layoutLabel");
    if (el) {
      el.textContent = label;
    }
  }
  
  function updateThemeLabel() {
    const currentThemeId = window.ThemeSystem?.getCurrentThemeId();
    if (!currentThemeId) return;
    
    const theme = window.ThemeSystem?.getThemeById(currentThemeId);
    const el = $("#themeLabel");
    if (el && theme && theme.name) {
      el.textContent = theme.name.toLowerCase();
    }
  }
  
  // Expose updateThemeLabel to global scope so it can be called from index.html
  window.updateThemeLabel = updateThemeLabel;
  
  // Track currently editing rule
  let currentlyEditingRuleId = null;
  
  // Save the current rule editor state
  function saveCurrentRuleFromEditor() {
    if (!currentlyEditingRuleId) return;
    
    const rule = rules.find(r => r.id === currentlyEditingRuleId);
    if (!rule) return;
    
    // Check if we're in the rule editor by looking for the editor elements
    const ruleNameEl = $("#ruleName", settingsContent);
    const ruleStartEl = $("#ruleStart", settingsContent);
    const ruleEndEl = $("#ruleEnd", settingsContent);
    
    // Only save if editor elements exist (we're in the editor view)
    if (!ruleNameEl || !ruleStartEl || !ruleEndEl) return;
    
    // Save the current values
    rule.name = ruleNameEl.value;
    rule.start = ruleStartEl.value;
    rule.end = ruleEndEl.value;
    
    // Update days from active day toggles
    const activeDays = $$('.day-toggle.active', settingsContent).map(b => b.dataset.day);
    rule.days = activeDays.join(',');
    
    // Update breaks
    const breakElems = $$('.break-edit', settingsContent);
    rule.breaks = breakElems.map(elem => {
      const id = elem.dataset.id;
      const start = elem.querySelector('.break-start')?.value || '';
      const end = elem.querySelector('.break-end')?.value || '';
      return { id, start, end };
    });
    
    saveRules(rules);
  }
  
  // Full rules editor (simplified inline form)
  function openFullRulesEditor(ruleId) {
    // Save any unsaved changes from the current editor before opening/refreshing
    if (currentlyEditingRuleId) {
      saveCurrentRuleFromEditor();
    }
    
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    // Track the currently editing rule
    currentlyEditingRuleId = ruleId;
    
    const breaksHtml = (rule.breaks || []).map(b => `
      <div class="break-edit" data-id="${escapeAttr(b.id)}">
        <input type="time" class="simple-input break-start" value="${escapeAttr(b.start)}" />
        <span>to</span>
        <input type="time" class="simple-input break-end" value="${escapeAttr(b.end)}" />
        <button class="icon-btn delete-break" title="Remove">
          <svg width="16" height="16"><use href="#icon-trash"></use></svg>
        </button>
      </div>
    `).join('');
    
    const daysArr = normalizeDaysString(rule.days);
    const dayButtons = weekdayOrder.map(d => {
      const active = daysArr.includes(d);
      return `<button class="simple-btn day-toggle ${active ? 'active' : ''}" data-day="${d}">${d}</button>`;
    }).join('');
    
    const content = `
      <div class="rule-editor">
        <div class="simple-option">
          <div class="simple-option-label">rule name</div>
          <input type="text" class="simple-input" id="ruleName" value="${escapeAttr(rule.name)}" />
        </div>
        
        <div class="simple-option">
          <div class="simple-option-label">days</div>
          <div class="simple-option-buttons">
            ${dayButtons}
          </div>
        </div>
        
        <div class="simple-option">
          <div class="simple-option-label">work time</div>
          <div class="time-inputs">
            <input type="time" class="simple-input" id="ruleStart" value="${escapeAttr(rule.start)}" />
            <span>to</span>
            <input type="time" class="simple-input" id="ruleEnd" value="${escapeAttr(rule.end)}" />
          </div>
        </div>
        
        <div class="simple-option">
          <div class="simple-option-label">breaks</div>
          <div class="breaks-list" id="breaksList">
            ${breaksHtml}
            <button class="simple-btn" id="addBreak">+ add break</button>
          </div>
        </div>
        
        <div class="editor-actions">
          <button class="simple-btn active" id="saveRule">save</button>
          <button class="simple-btn" id="cancelRule">cancel</button>
        </div>
      </div>
    `;
    
    openSettings(content);
    
    // Save rule button
    $("#saveRule", settingsContent)?.addEventListener('click', () => {
      rule.name = $("#ruleName", settingsContent)?.value || rule.name;
      rule.start = $("#ruleStart", settingsContent)?.value || rule.start;
      rule.end = $("#ruleEnd", settingsContent)?.value || rule.end;
      
      // Update breaks
      const breakElems = $$('.break-edit', settingsContent);
      rule.breaks = breakElems.map(elem => {
        const id = elem.dataset.id;
        const start = elem.querySelector('.break-start')?.value;
        const end = elem.querySelector('.break-end')?.value;
        return { id, start, end };
      });
      
      saveRules(rules);
      currentlyEditingRuleId = null; // Clear the tracking
      $("#rulesBtn")?.click(); // Go back to rules list
    });
    
    // Cancel button
    $("#cancelRule", settingsContent)?.addEventListener('click', () => {
      currentlyEditingRuleId = null; // Clear the tracking
      $("#rulesBtn")?.click(); // Go back to rules list
    });
    
    // Day toggles
    $$('.day-toggle', settingsContent).forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const activeDays = $$('.day-toggle.active', settingsContent).map(b => b.dataset.day);
        rule.days = activeDays.join(',');
      });
    });
    
    // Add break button
    $("#addBreak", settingsContent)?.addEventListener('click', () => {
      const newBreak = { id: generateUUID(), start: "12:30", end: "13:00" };
      rule.breaks = rule.breaks || [];
      rule.breaks.push(newBreak);
      openFullRulesEditor(ruleId); // Refresh the editor
    });
    
    // Delete break buttons
    $$('.delete-break', settingsContent).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const breakId = e.target.closest('.break-edit').dataset.id;
        rule.breaks = rule.breaks.filter(b => b.id !== breakId);
        openFullRulesEditor(ruleId); // Refresh the editor
      });
    });
  }

  /* ===== Rules (load/save/default) ===== */
  const defaultRules = [
    {
      id: generateUUID(),
      name: "Default",
      days: "Mo,Di,Mi,Do,Fr",
      start: "09:00",
      end: "17:00",
      breaks: [{ id: generateUUID(), start: "12:30", end: "13:00" }],
    },
  ];
  function loadRules() {
    try {
      const r =
        JSON.parse(localStorage.getItem(LS_KEY_RULES)) || defaultRules;
      r.forEach((rule) => {
        if (!Array.isArray(rule.breaks)) rule.breaks = [];
      });
      return r;
    } catch {
      return defaultRules;
    }
  }
  function saveRules(r) {
    localStorage.setItem(LS_KEY_RULES, JSON.stringify(r));
  }
  let rules = loadRules();

  /* ===== Days helpers for rules ===== */
  const normalizeDaysString = (str) =>
    (str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const daysSetFromRule = (rule) =>
    new Set(normalizeDaysString(rule.days));
  const daysStringFromSet = (set) =>
    weekdayOrder.filter((d) => set.has(d)).join(",");

  /* ===== Breaks / Segments ===== */
  const normalizeBreaks = (breaks, startDate, endDate) => {
    const res = [];
    const S = +startDate,
      E = +endDate;
    for (const b of breaks || []) {
      const sHM = parseHM(b.start),
        eHM = parseHM(b.end);
      if (!sHM || !eHM) continue;
      const s = new Date(startDate);
      s.setHours(sHM.h, sHM.mi, 0, 0);
      const e = new Date(startDate);
      e.setHours(eHM.h, eHM.mi, 0, 0);
      if (e <= s) continue;
      const cs = Math.max(+s, S),
        ce = Math.min(+e, E);
      if (ce - cs > 0)
        res.push({ start: new Date(cs), end: new Date(ce) });
    }
    res.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const seg of res) {
      if (!merged.length || seg.start > merged[merged.length - 1].end) {
        merged.push({ ...seg });
      } else {
        const last = merged[merged.length - 1];
        if (seg.end > last.end) last.end = seg.end;
      }
    }
    return merged;
  };

  const buildSegments = (rule, baseDate) => {
    const sHM = parseHM(rule.start),
      eHM = parseHM(rule.end);
    if (!sHM || !eHM)
      return { windowStart: null, windowEnd: null, segments: [] };
    const start = new Date(baseDate);
    start.setHours(sHM.h, sHM.mi, 0, 0);
    const end = new Date(baseDate);
    end.setHours(eHM.h, eHM.mi, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // overnight
    const br = normalizeBreaks(rule.breaks, start, end);
    const segs = [];
    let cursor = new Date(start);
    for (const b of br) {
      if (b.start > cursor)
        segs.push({
          type: "work",
          start: new Date(cursor),
          end: new Date(b.start),
        });
      segs.push({
        type: "break",
        start: new Date(b.start),
        end: new Date(b.end),
      });
      cursor = new Date(b.end);
    }
    if (cursor < end)
      segs.push({
        type: "work",
        start: new Date(cursor),
        end: new Date(end),
      });
    return { windowStart: start, windowEnd: end, segments: segs };
  };

  /* ===== Render Rules UI ===== */
  const rulesList = $("#rulesList");

  function breakRowHtml(id, s = "12:30", e = "13:00") {
    return `
        <div class="break-row" data-id="${escapeAttr(id)}">
          <div class="col-5">
            <label>From
              <input class="inp-break-start input" type="time" value="${escapeAttr(
                s
              )}" />
            </label>
          </div>
          <div class="col-5">
            <label>To
              <input class="inp-break-end input" type="time" value="${escapeAttr(
                e
              )}" />
            </label>
          </div>
          <div class="col-2" style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn icon del-break" title="Remove" aria-label="Remove break">
              <svg aria-hidden="true" width="18" height="18"><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </div>
      `;
  }

  function renderRules() {
    const container = rulesList;
    if (!container) return;
    container.innerHTML = "";

    rules.forEach((rule) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.id = rule.id;

      const dayChips = weekdayOrder
        .map(
          (d) =>
            `<button type="button" class="day-chip" data-day="${d}" aria-pressed="false">${d}</button>`
        )
        .join("");

      const daysHTML = `
          <div class="days-wrap">
            <div class="days-shortcuts">
              <button type="button" class="shortcut" data-days="Mo,Di,Mi,Do,Fr">Mo–Fr</button>
              <button type="button" class="shortcut" data-days="Sa,So">Sa–Su</button>
              <button type="button" class="shortcut" data-days="Mo,Di,Mi,Do,Fr,Sa,So">All</button>
              <button type="button" class="shortcut" data-days="">None</button>
            </div>
            <div class="days-grid">${dayChips}</div>
          </div>
        `;

      const breaksRows = (rule.breaks || [])
        .map((b) => breakRowHtml(b.id, b.start, b.end))
        .join("");

      card.innerHTML = `
          <div class="card-head">
            <div class="icon" style="display:inline-flex;align-items:center;gap:8px;">
              <svg aria-hidden="true" width="18" height="18"><use href="#icon-clock-simple"></use></svg>
              <span class="title">${escapeHtml(
                rule.name || "Untitled"
              )}</span>
            </div>
            <button class="btn danger btn-delete" title="Delete Rule" type="button">
              <svg aria-hidden="true" width="18" height="18"><use href="#icon-trash"></use></svg>
              Delete
            </button>
          </div>

          <div class="card-grid">
            <div class="col-4">
              <label>Name
                <input class="inp-name input" type="text" value="${escapeAttr(
                  rule.name
                )}" placeholder="e.g. Office" />
              </label>
            </div>

            <div class="col-8">
              <label>Weekdays
                ${daysHTML}
              </label>
            </div>

            <div class="col-2">
              <label>Start
                <input class="inp-start input" type="time" value="${escapeAttr(
                  rule.start
                )}" />
              </label>
            </div>
            <div class="col-2">
              <label>End
                <input class="inp-end input" type="time" value="${escapeAttr(
                  rule.end
                )}" />
              </label>
            </div>

            <div class="col-12">
              <label>Breaks
                <div class="breaks">
                  ${breaksRows}
                  <div>
                    <button type="button" class="btn add-break">
                      <svg aria-hidden="true" width="18" height="18"><use href="#icon-plus"></use></svg>
                      Add Break
                    </button>
                  </div>
                </div>
              </label>
            </div>
          </div>
        `;

      container.appendChild(card);

      // Events
      $(".btn-delete", card)?.addEventListener("click", () => {
        rules = rules.filter((r) => r.id !== rule.id);
        saveRules(rules);
        renderRules();
      });

      $(".inp-name", card)?.addEventListener("input", (e) => {
        rule.name = e.target.value;
        saveRules(rules);
        $(".title", card).textContent = rule.name || "Ohne Titel";
      });

      $(".inp-start", card)?.addEventListener("change", (e) => {
        rule.start = e.target.value || "09:00";
        saveRules(rules);
      });

      $(".inp-end", card)?.addEventListener("change", (e) => {
        rule.end = e.target.value || "17:00";
        saveRules(rules);
      });

      // Day chips
      const selected = daysSetFromRule(rule);
      $$(".day-chip", card).forEach((btn) => {
        const d = btn.dataset.day;
        const on = selected.has(d);
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");

        btn.addEventListener("click", () => {
          const nowOn = btn.classList.toggle("on");
          btn.setAttribute("aria-pressed", nowOn ? "true" : "false");
          if (nowOn) selected.add(d);
          else selected.delete(d);
          rule.days = daysStringFromSet(selected);
          saveRules(rules);
        });
      });

      // Shortcuts
      $$(".shortcut", card).forEach((sc) => {
        sc.addEventListener("click", () => {
          const days = (sc.dataset.days || "").split(",").filter(Boolean);
          const set = new Set(days);
          $$(".day-chip", card).forEach((btn) => {
            const on = set.has(btn.dataset.day);
            btn.classList.toggle("on", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
          });
          rule.days = daysStringFromSet(set);
          saveRules(rules);
        });
      });

      // Breaks
      $(".add-break", card)?.addEventListener("click", () => {
        const id = generateUUID();
        rule.breaks = rule.breaks || [];
        rule.breaks.push({ id, start: "12:30", end: "13:00" });
        saveRules(rules);
        renderRules();
        const row = rulesList.querySelector(
          `.break-row[data-id="${id}"]`
        );
        row?.querySelector(".inp-break-start")?.focus();
      });

      $$(".break-row", card).forEach((row) => {
        const bid = row.dataset.id;
        $(".del-break", row)?.addEventListener("click", () => {
          rule.breaks = (rule.breaks || []).filter((b) => b.id !== bid);
          saveRules(rules);
          renderRules();
        });
        $(".inp-break-start", row)?.addEventListener("change", (e) => {
          const b = (rule.breaks || []).find((x) => x.id === bid);
          if (!b) return;
          b.start = e.target.value || b.start;
          saveRules(rules);
        });
        $(".inp-break-end", row)?.addEventListener("change", (e) => {
          const b = (rule.breaks || []).find((x) => x.id === bid);
          if (!b) return;
          b.end = e.target.value || b.end;
          saveRules(rules);
        });
      });
    });
  }

  // Add Rule (UI-Button)
  function addRule() {
    const newRule = {
      id: generateUUID(),
      name: "Neue Regel",
      days: "Mo,Di,Mi,Do,Fr",
      start: "09:00",
      end: "17:00",
      breaks: [],
    };
    rules.push(newRule);
    saveRules(rules);
    renderRules();
    if (!overlay?.classList.contains("show")) openSettings();
    setTimeout(() => {
      const card = $("#rulesList")?.querySelector(
        `.card[data-id="${newRule.id}"]`
      );
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.querySelector(".inp-name")?.focus();
    }, SCROLL_DELAY_MS);
  }
  $("#addRuleBtn2")?.addEventListener("click", addRule);

  /* ===== Countdown / Progress ===== */
  const countdownBig = $("#countdownBig");
  const countdownSmall = $("#countdownSmall");
  const labelBig = $("#labelBig");
  const labelSmall = $("#labelSmall");
  const progressEl = $("#progress");
  const progressBar = $("#progressBar");
  const progressStart = $("#progressStart");
  const progressEnd = $("#progressEnd");
  
  // Cache for DOM query results to avoid repeated lookups
  const domCache = {
    countdownBig,
    countdownSmall,
    labelBig,
    labelSmall,
    progressEl,
    progressBar,
    progressStart,
    progressEnd
  };

  const normalizeDays = (str) =>
    (str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  function findActiveOrNext(now = new Date()) {
    const today = midnightOf(now);
    const dayStr = dayAbbr[now.getDay()];
    const candidates = [];

    for (const r of rules) {
      const days = normalizeDays(r.days);
      const built = buildSegments(r, today);
      if (!built.windowStart) continue;
      if (days.includes(dayStr) || now < built.windowStart) {
        candidates.push({ rule: r, ...built });
      }
    }

    // during
    for (const c of candidates) {
      const seg = c.segments.find((s) => now >= s.start && now <= s.end);
      if (seg) {
        return {
          type: "during",
          mode: seg.type,
          rule: c.rule,
          start: seg.start,
          end: seg.end,
          segments: c.segments,
          windowStart: c.windowStart,
          windowEnd: c.windowEnd,
        };
      }
    }

    // next today
    const nextToday = candidates
      .flatMap((c) =>
        c.segments
          .filter((s) => s.start > now)
          .map((s) => ({ seg: s, c }))
      )
      .sort((a, b) => a.seg.start - b.seg.start)[0];

    if (nextToday) {
      const { c, seg } = nextToday;
      return {
        type: "upcoming",
        mode: seg.type,
        rule: c.rule,
        start: seg.start,
        end: seg.end,
        segments: c.segments,
        windowStart: c.windowStart,
        windowEnd: c.windowEnd,
      };
    }

    // next days
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const day = dayAbbr[d.getDay()];
      const futureRules = rules.filter((r) =>
        normalizeDays(r.days).includes(day)
      );
      const allSegs = futureRules
        .flatMap((r) => {
          const b = buildSegments(r, d);
          return b.segments.map((s) => ({
            rule: r,
            seg: s,
            windowStart: b.windowStart,
            windowEnd: b.windowEnd,
          }));
        })
        .sort((a, b) => a.seg.start - b.seg.start);

      if (allSegs[0]) {
        const f = allSegs[0];
        return {
          type: "upcoming",
          mode: f.seg.type,
          rule: f.rule,
          start: f.seg.start,
          end: f.seg.end,
          segments: buildSegments(f.rule, d).segments,
          windowStart: f.windowStart,
          windowEnd: f.windowEnd,
        };
      }
    }

    return { type: "none" };
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / MS_PER_SECOND));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function nextPauseTarget(state, now) {
    const segs = state.segments || [];
    if (state.mode === "break") {
      return { target: state.end, label: "Break End" };
    }
    const ref = state.type === "upcoming" ? state.start : now;
    const nb = segs.find((s) => s.type === "break" && s.start > ref);
    if (nb) return { target: nb.start, label: "Break" };
    return { target: state.windowEnd, label: "End of Work" };
  }

  const stateMem = { lastType: "none", lastRuleId: null, lastMode: null };

  function tick() {
    const now = new Date();
    const layout = loadLayout(); // 'big-total'|'big-break'
    const st = findActiveOrNext(now);

    // Confetti on transitions
    if (
      st.type !== stateMem.lastType ||
      st.rule?.id !== stateMem.lastRuleId ||
      st.mode !== stateMem.lastMode
    ) {
      stateMem.lastType = st.type;
      stateMem.lastRuleId = st.rule?.id || null;
      stateMem.lastMode = st.mode || null;
    }

    if (st.type === "during" || st.type === "upcoming") {
      // totals
      const totalRemain = st.windowEnd - now;
      const totalLabel = `Total until End: ${toHM(st.windowEnd)} (${
        st.rule.name || "Work"
      })`;

      // part (pause/feierabend)
      const np = nextPauseTarget(st, now);
      const partRemain = np.target - now;
      const partLabel = `Until ${np.label}: ${toHM(np.target)} (${
        st.rule.name || "Work"
      })`;

      // Update UI using cached DOM elements
      const { countdownBig, countdownSmall, labelBig, labelSmall, 
              progressBar, progressEl, progressStart, progressEnd } = domCache;

      if (layout === "big-total") {
        if (countdownBig)
          countdownBig.textContent = formatDuration(totalRemain);
        if (labelBig) labelBig.textContent = totalLabel;
        if (countdownSmall)
          countdownSmall.textContent = formatDuration(partRemain);
        if (labelSmall) labelSmall.textContent = partLabel;
      } else {
        if (countdownBig)
          countdownBig.textContent = formatDuration(partRemain);
        if (labelBig) labelBig.textContent = partLabel;
        if (countdownSmall)
          countdownSmall.textContent = formatDuration(totalRemain);
        if (labelSmall) labelSmall.textContent = totalLabel;
      }

      // progress
      const total = st.windowEnd - st.windowStart;
      const done = now - st.windowStart;
      const pct = Math.max(0, Math.min(100, (done / total) * 100));

      if (progressBar) progressBar.style.width = pct.toFixed(2) + "%";
      if (progressEl) progressEl.setAttribute("aria-valuenow", pct.toFixed(0));
      if (progressStart) progressStart.textContent = toHM(st.windowStart);
      if (progressEnd) progressEnd.textContent = toHM(st.windowEnd);

      // break style
      const isBreak = st.mode === "break";
      if (progressEl) progressEl.classList.toggle("is-break", isBreak);
      if (progressBar) progressBar.classList.toggle("is-break", isBreak);
      
      // Check for break reminders
      NotificationSystem.checkBreakReminder(st, now);
    } else {
      const { countdownBig, countdownSmall, labelBig, labelSmall, 
              progressBar, progressEl, progressStart, progressEnd } = domCache;
              
      if (countdownBig) countdownBig.textContent = "–:–";
      if (labelBig) labelBig.textContent = "Keine aktive/kommende Regel";
      if (countdownSmall) countdownSmall.textContent = "–:–";
      if (labelSmall) labelSmall.textContent = "—";
      if (progressBar) progressBar.style.width = "0%";
      if (progressEl) {
        progressEl.setAttribute("aria-valuenow", "0");
        progressEl.classList.remove("is-break");
      }
      if (progressStart) progressStart.textContent = "–:–";
      if (progressEnd) progressEnd.textContent = "–:–";
      if (progressBar) progressBar.classList.remove("is-break");
    }

    const pn = $("#progressNow");
    if (pn) pn.textContent = "Now";
  }

  /* ===== Layout Radios ===== */
  function initLayoutRadios() {
    const current = loadLayout();
    const r = document.querySelector(
      `input[name="layout"][value="${current}"]`
    );
    if (r) r.checked = true;
    $$('input[name="layout"]').forEach((el) => {
      el.addEventListener("change", (e) => {
        saveLayout(e.target.value);
        tick(); // sofort neu zeichnen
      });
    });
  }

  /* ===== Welcome Popup ===== */
  const LS_KEY_WELCOME_SHOWN = "workday.welcomeShown.v1";
  const welcomeOverlay = $("#welcomeOverlay");
  const welcomeContent = $("#welcomeContent");
  const closeWelcomeBtn = $("#closeWelcome");

  async function loadWelcomeContent() {
    try {
      const response = await fetch('welcome.md');
      if (!response.ok) {
        throw new Error(`Failed to load welcome.md: ${response.status}`);
      }
      const markdown = await response.text();
      
      // Parse markdown using local parser
      if (window.markdownParser && typeof window.markdownParser.parse === 'function') {
        const html = window.markdownParser.parse(markdown);
        return html;
      } else {
        // Fallback if parser fails to load
        return `<pre>${escapeHtml(markdown)}</pre>`;
      }
    } catch (error) {
      logError('Failed to load welcome content:', error);
      return `
        <h1>Welcome to Workday Countdown! 🎉</h1>
        <p>Thank you for using Workday Countdown - your personal work timer assistant.</p>
        <p>Configure your work schedule using the "rules" button below to get started!</p>
      `;
    }
  }

  function showWelcomePopup() {
    welcomeOverlay?.classList.add("show");
    welcomeOverlay?.setAttribute("aria-hidden", "false");
  }

  function closeWelcomePopup() {
    // Blur any focused element inside the overlay before hiding
    const activeElement = document.activeElement;
    if (activeElement && welcomeOverlay?.contains(activeElement)) {
      activeElement.blur();
    }
    
    welcomeOverlay?.classList.remove("show");
    welcomeOverlay?.setAttribute("aria-hidden", "true");
    // Mark as shown so it doesn't appear again
    localStorage.setItem(LS_KEY_WELCOME_SHOWN, "true");
  }

  // Close button event
  closeWelcomeBtn?.addEventListener("click", closeWelcomePopup);

  // Close on overlay click
  welcomeOverlay?.addEventListener("mousedown", (e) => {
    if (e.target === welcomeOverlay) closeWelcomePopup();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && welcomeOverlay?.classList.contains("show")) {
      closeWelcomePopup();
    }
  });

  async function checkFirstTimeUser() {
    const hasSeenWelcome = localStorage.getItem(LS_KEY_WELCOME_SHOWN);
    
    if (!hasSeenWelcome) {
      // Load and display welcome content
      const content = await loadWelcomeContent();
      if (welcomeContent) {
        welcomeContent.innerHTML = content;
      }
      showWelcomePopup();
    }
  }

  /* ===== Init ===== */
  (async () => {
    // Start timer immediately - don't wait for theme/images
    tick();
    setInterval(tick, TICK_INTERVAL_MS);
    
    // Theme is now handled by ThemeSystem in index.html
    // Update footer labels
    updateLayoutLabel();
    // Theme label will be updated by ThemeSystem after it initializes
    
    if (!localStorage.getItem(LS_KEY_LAYOUT)) saveLayout("big-total");

    // Register service worker if notifications are enabled
    if (NotificationSystem.isEnabled()) {
      await NotificationSystem.registerServiceWorker();
    }

    // Check if this is the first time user and show welcome popup
    await checkFirstTimeUser();
  })();
})();
