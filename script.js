(() => {
  "use strict";

  /* ===== Shortcuts ===== */
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  /* ===== LocalStorage Keys ===== */
  const LS_KEY_RULES = "workday.rules.v1";
  const LS_KEY_LAYOUT = "workday.layout.v1"; // 'big-total' | 'big-break'
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
  const escapeAttr = (s = "") => escapeHtml(s).replace(/"/g, "&quot;");

  const parseHM = (hm) => {
    if (!hm || typeof hm !== 'string') return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
    if (!m) return null;
    const h = +m[1],
      mi = +m[2];
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    return { h, mi };
  };
  const midnightOf = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /* ===== Layout ===== */
  const loadLayout = () => {
    try {
      return localStorage.getItem(LS_KEY_LAYOUT) || "big-total";
    } catch (e) {
      console.error("[Layout] Failed to load layout:", e);
      return "big-total";
    }
  };
  const saveLayout = (l) => {
    try {
      localStorage.setItem(LS_KEY_LAYOUT, l);
    } catch (e) {
      console.error("[Layout] Failed to save layout:", e);
    }
  };

  /* ===== THEME SYSTEM v2 (no presets, per-theme Bing, edit) ===== */
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
    try {
      localStorage.setItem(THEME_STORE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error("[Theme] Failed to save theme store:", e);
    }
  }
  let themeStore = loadThemeStore();

  // Fallback-Theme
  if (!themeStore.themes || themeStore.themes.length === 0) {
    themeStore.themes = [
      {
        key: "default",
        name: "Theme #1",
        palette: {
          bg: "#0b0c0f",
          fg: "#e9eef4",
          muted: "#a7b0bf",
          card: "#14161b",
          accent: "#6ea8fe",
          "accent-2": "#b17aff",
          danger: "#ff6b6b",
        },
        bgDaily: false,
      },
    ];
    saveThemeStore(themeStore);
    saveTheme("default");
  }

  function loadTheme() {
    try {
      const stored = localStorage.getItem(LS_KEY_THEME);
      if (stored) return stored;
      return themeStore.themes[0]?.key || null;
    } catch (e) {
      console.error("[Theme] Failed to load theme:", e);
      return themeStore.themes[0]?.key || null;
    }
  }
  function saveTheme(key) {
    try {
      if (key) localStorage.setItem(LS_KEY_THEME, key);
    } catch (e) {
      console.error("[Theme] Failed to save theme:", e);
    }
  }
  function getThemeByKey(key) {
    return themeStore.themes.find((t) => t.key === key) || null;
  }

  function getDayOfYear(d) {
    const a = midnightOf(d),
      b = new Date(d.getFullYear(), 0, 1);
    return Math.floor((a - b) / 86400000) + 1;
  }

  /* === CORS-sichere Bing-Abfrage === */
  // ---- CORS-freundliche Proxys (keine Keys) ----
  const CORS_PROXIES = [
    // Liefert den Body direkt (Text) mit permissiven CORS
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    // Liefert JSON: { contents: "..." }  (falls /raw im Edgecase zickt)
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    // Einfacher CORS-Proxy mit plain body
    (u) => `https://cors.isomorphic-git.org/${u}`,
    // Alternative Proxy
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  // Cache für Bing-Bilder (key: market+date, value: {url, timestamp})
  const BING_CACHE_KEY = "workday.bingImageCache";
  const BING_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 Stunden

  function getCachedBingImage(market, date = new Date()) {
    try {
      const cache = JSON.parse(localStorage.getItem(BING_CACHE_KEY) || "{}");
      const dateKey = midnightOf(date).getTime();
      const key = `${market}_${dateKey}`;
      const entry = cache[key];
      
      if (entry && entry.url && entry.timestamp) {
        const age = Date.now() - entry.timestamp;
        if (age < BING_CACHE_DURATION) {
          console.log("[BING] Using cached image", entry.url);
          return entry.url;
        }
      }
    } catch (e) {
      console.warn("[BING] Cache read error:", e);
    }
    return null;
  }

  function setCachedBingImage(market, url, date = new Date()) {
    try {
      const cache = JSON.parse(localStorage.getItem(BING_CACHE_KEY) || "{}");
      const dateKey = midnightOf(date).getTime();
      const key = `${market}_${dateKey}`;
      
      // Validate inputs
      if (!market || !url) {
        console.warn("[BING] Invalid cache inputs");
        return;
      }
      
      cache[key] = {
        url,
        timestamp: Date.now()
      };
      
      // Cleanup old entries (älter als 7 Tage)
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      Object.keys(cache).forEach(k => {
        if (cache[k] && cache[k].timestamp < cutoff) {
          delete cache[k];
        }
      });
      
      localStorage.setItem(BING_CACHE_KEY, JSON.stringify(cache));
      console.log("[BING] Cached image for", key);
    } catch (e) {
      console.warn("[BING] Cache write error:", e);
    }
  }

  // Timeout-Helper mit AbortController für bessere Cleanup
  function fetchWithTimeout(url, opts = {}, ms = 6000) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const t = setTimeout(() => {
        controller.abort();
        reject(new Error("timeout"));
      }, ms);
      
      fetch(url, { ...opts, signal }).then(
        (r) => {
          clearTimeout(t);
          resolve(r);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  /**
   * Retry-Helper mit exponentialem Backoff
   */
  async function retryWithBackoff(fn, retries = 2, initialDelay = 500) {
    let lastError = null;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (i === retries) throw e;
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`[RETRY] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    // This should never be reached, but adding for safety
    throw lastError || new Error('Retry failed');
  }

  /**
   * Validiert ob eine Bild-URL tatsächlich geladen werden kann
   */
  function preloadImage(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = '';
        reject(new Error('Image preload timeout'));
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });
  }

  /**
   * Robust: Holt das Bing Image of the Day (JSON) und gibt eine absolute Bild-URL zurück.
   * Versucht: Cache → direkt → AllOrigins /raw → AllOrigins /get → cors.isomorphic-git → corsproxy.io
   * Mit Retry-Logik und Caching für bessere Stabilität
   */
  async function fetchBingImage(mkt) {
    const market = mkt || "de-DE";
    
    // 1. Prüfe Cache zuerst
    const cached = getCachedBingImage(market);
    if (cached) return cached;
    
    const base = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${encodeURIComponent(
      market
    )}`;

    // Kandidaten: direkt + Proxys in Reihenfolge
    const candidates = [
      { url: base, type: "direct", timeout: 5000 },
      ...CORS_PROXIES.map((fn, idx) => ({ 
        url: fn(base), 
        type: "proxy", 
        timeout: 7000 + (idx * 1000) // Längere Timeouts für Proxys
      })),
    ];

    let lastError = null;

    for (const c of candidates) {
      try {
        // Verwende Retry-Logik für jede Quelle
        const imageUrl = await retryWithBackoff(async () => {
          console.log(`[BING] Trying ${c.type}: ${c.url.substring(0, 60)}...`);
          
          const res = await fetchWithTimeout(
            c.url,
            { cache: "no-store", credentials: "omit", mode: "cors" },
            c.timeout
          );
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          // AllOrigins /get liefert JSON { contents: "..." }, /raw liefert direkt den Body
          let text = await res.text();
          if (!text || text.trim() === '') {
            throw new Error('Empty response');
          }
          
          if (c.url.includes("/get?url=")) {
            const wrapper = JSON.parse(text);
            text = wrapper.contents;
          }

          const data = JSON.parse(text);
          const img = data?.images?.[0];
          
          if (!img) {
            throw new Error('No image data in response');
          }
          
          const path =
            img?.url ||
            (img?.urlbase ? `${img.urlbase}_1920x1080.jpg` : null);
          
          if (!path) {
            throw new Error('No image path found');
          }
          
          const fullUrl = path.startsWith('http') ? path : "https://www.bing.com" + path;
          
          // Validiere dass das Bild tatsächlich geladen werden kann
          try {
            await preloadImage(fullUrl, 3000);
            console.log(`[BING] Success with ${c.type}:`, fullUrl);
            return fullUrl;
          } catch (preloadErr) {
            console.warn(`[BING] Image preload failed for ${fullUrl}:`, preloadErr.message);
            throw new Error(`Image validation failed: ${preloadErr.message}`);
          }
        }, 1, 300); // 1 retry mit kurzem Delay
        
        // Bei Erfolg: cachen und zurückgeben
        if (imageUrl) {
          setCachedBingImage(market, imageUrl);
          return imageUrl;
        }
      } catch (e) {
        lastError = e;
        console.warn("[BING] Failed with", c.type, "->", e?.message || e);
        // try next
      }
    }
    
    console.error("[BING] All sources failed. Last error:", lastError);
    return null;
  }

  // Auswahl aus eigener Liste
  function selectDailyBg(theme, now = new Date()) {
    const list = Array.isArray(theme.bgImages)
      ? theme.bgImages.filter(Boolean)
      : [];
    if (theme.bgDaily && list.length > 0) {
      const mode = theme.bgMode || "dayOfYear";
      let idx = 0;
      if (mode === "random") {
        const seedKey = "workday.bgSeed";
        let seed = Number(localStorage.getItem(seedKey));
        if (!Number.isFinite(seed)) {
          seed = Math.floor(Math.random() * 1e6);
          try {
            localStorage.setItem(seedKey, String(seed));
          } catch (e) {
            console.warn("[Theme] Failed to save seed:", e);
          }
        }
        const dayKey =
          Math.floor(midnightOf(now).getTime() / 86400000) ^ seed;
        idx =
          Math.abs((dayKey * 9301 + 49297) % 233280) % list.length | 0;
      } else if (mode === "cycle") {
        const dayIndex = Math.floor(midnightOf(now).getTime() / 86400000);
        idx = ((dayIndex % list.length) + list.length) % list.length;
      } else {
        const dayOfYear = getDayOfYear(now);
        idx = ((dayOfYear - 1) % list.length + list.length) % list.length;
      }
      // Ensure idx is within bounds
      idx = Math.max(0, Math.min(idx, list.length - 1));
      return list[idx];
    }
    return theme.bgImage || null;
  }

  /**
   * Calculate average brightness of an image
   * Returns a value between 0 (dark) and 255 (bright)
   */
  function getImageBrightness(imageUrl) {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        resolve(128); // Default to mid-brightness
        return;
      }
      
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      const timeout = setTimeout(() => {
        img.src = '';
        console.warn("[Brightness] Timeout analyzing image");
        resolve(128); // Default to mid-brightness on timeout
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            console.warn("[Brightness] Failed to get canvas context");
            resolve(128);
            return;
          }
          
          // Use smaller dimensions for faster processing
          const maxDim = 50;
          const scale = Math.min(maxDim / img.width, maxDim / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalBrightness = 0;
          
          // Calculate brightness using relative luminance formula
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Using perceived brightness formula
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            totalBrightness += brightness;
          }
          
          const avgBrightness = totalBrightness / (data.length / 4);
          resolve(avgBrightness);
        } catch (error) {
          console.warn("[Brightness] Error analyzing image:", error);
          resolve(128); // Default to mid-brightness on error
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn("[Brightness] Failed to load image for analysis");
        resolve(128); // Default to mid-brightness on error
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Adjust text colors based on background brightness
   * @param {number} brightness - Average brightness (0-255)
   */
  function adjustTextColors(brightness) {
    const root = document.documentElement;
    
    // Threshold for determining if background is light or dark
    // Using 140 as threshold (slightly above middle to favor dark text)
    const isLightBackground = brightness > 140;
    
    if (isLightBackground) {
      // Dark text on light background
      root.style.setProperty("--fg", "#0b0c0f");
      root.style.setProperty("--muted", "#4a5568");
      root.style.setProperty("--card", "rgba(255, 255, 255, 0.85)");
      document.body.style.color = "#0b0c0f";
    } else {
      // Light text on dark background
      root.style.setProperty("--fg", "#e9eef4");
      root.style.setProperty("--muted", "#a7b0bf");
      root.style.setProperty("--card", "#14161b");
      document.body.style.color = "#e9eef4";
    }
  }

  // applyTheme (async wegen Bing)
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

    // NEU/bleibt: Bing oder eigene Liste
    let url = null;
    if (theme.source === "bing") {
      url = await fetchBingImage(theme.bingMarket || "de-DE");
    } else {
      url = selectDailyBg(theme, now);
    }
    body.style.backgroundImage = url ? `url("${url}")` : "";
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat = "no-repeat";
    
    // Auto-adjust text color based on background image brightness
    if (url && (theme.source === "bing" || theme.bgDaily || theme.bgImage)) {
      try {
        const brightness = await getImageBrightness(url);
        adjustTextColors(brightness);
      } catch (error) {
        console.warn("[Theme] Failed to adjust text colors:", error);
      }
    }
  }

  let dailyBgTimer = null;
  function scheduleDailyBgRefresh() {
    if (dailyBgTimer) {
      clearTimeout(dailyBgTimer);
      dailyBgTimer = null;
    }
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const ms = next - now + 1000;
    dailyBgTimer = setTimeout(() => {
      dailyBgTimer = null;
      applyTheme(loadTheme(), new Date());
      scheduleDailyBgRefresh();
    }, ms);
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
          <span class="theme-chip swatch" style="background: linear-gradient(90deg, ${c1}, ${c2});"></span>
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
        applyTheme(t.key);
        updateThemeSelection();
      });
      // Bearbeiten
      const editBtn = chip.querySelector(".edit-theme");
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          startEditTheme(t.key);
        });
      }
      // Löschen
      const delBtn = chip.querySelector(".del-theme");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteCustomTheme(t.key);
        });
      }

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
    $$(".theme-chip", themeGrid).forEach((chip) => {
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
      ? `${base}-${crypto.randomUUID().slice(0, 6)}`
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
        bg: input.bg ?? "#0b0c0f",
        fg: input.fg ?? "#e9eef4",
        muted: input.muted ?? "#a7b0bf",
        card: input.card ?? "#14161b",
        accent: input.accent ?? "#6ea8fe",
        "accent-2": input.accent2 ?? "#b17aff",
        danger: input.danger ?? "#ff6b6b",
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
    applyTheme(theme.key);
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
          applyTheme(fallback);
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
    if (loadTheme() === key) applyTheme(key);
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
    await applyTheme(current.key);
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

  /* ===== Settings Overlay ===== */
  const overlay = $("#overlay");
  const openSettings = () => {
    overlay?.classList.add("show");
    overlay?.setAttribute("aria-hidden", "false");
  };
  const closeSettings = () => {
    overlay?.classList.remove("show");
    overlay?.setAttribute("aria-hidden", "true");
  };
  $("#openSettingsBtn")?.addEventListener("click", openSettings);
  $("#closePanel")?.addEventListener("click", closeSettings);
  overlay?.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("show"))
      closeSettings();
  });

  /* ===== Rules (load/save/default) ===== */
  const defaultRules = [
    {
      id: crypto.randomUUID(),
      name: "Standard",
      days: "Mo,Di,Mi,Do,Fr",
      start: "09:00",
      end: "17:00",
      breaks: [{ id: crypto.randomUUID(), start: "12:30", end: "13:00" }],
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
    try {
      localStorage.setItem(LS_KEY_RULES, JSON.stringify(r));
    } catch (e) {
      console.error("[Rules] Failed to save rules:", e);
    }
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
            <label>Von
              <input class="inp-break-start input" type="time" value="${escapeAttr(
                s
              )}" />
            </label>
          </div>
          <div class="col-5">
            <label>Bis
              <input class="inp-break-end input" type="time" value="${escapeAttr(
                e
              )}" />
            </label>
          </div>
          <div class="col-2" style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn icon del-break" title="Entfernen" aria-label="Pause entfernen">
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
              <button type="button" class="shortcut" data-days="Sa,So">Sa–So</button>
              <button type="button" class="shortcut" data-days="Mo,Di,Mi,Do,Fr,Sa,So">Alle</button>
              <button type="button" class="shortcut" data-days="">Keine</button>
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
                rule.name || "Ohne Titel"
              )}</span>
            </div>
            <button class="btn danger btn-delete" title="Regel löschen" type="button">
              <svg aria-hidden="true" width="18" height="18"><use href="#icon-trash"></use></svg>
              Löschen
            </button>
          </div>

          <div class="card-grid">
            <div class="col-4">
              <label>Name
                <input class="inp-name input" type="text" value="${escapeAttr(
                  rule.name
                )}" placeholder="z. B. Büro" />
              </label>
            </div>

            <div class="col-8">
              <label>Wochentage
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
              <label>Ende
                <input class="inp-end input" type="time" value="${escapeAttr(
                  rule.end
                )}" />
              </label>
            </div>

            <div class="col-12">
              <label>Pausen
                <div class="breaks">
                  ${breaksRows}
                  <div>
                    <button type="button" class="btn add-break">
                      <svg aria-hidden="true" width="18" height="18"><use href="#icon-plus"></use></svg>
                      Pause hinzufügen
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
        const titleEl = $(".title", card);
        if (titleEl) titleEl.textContent = rule.name || "Ohne Titel";
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
        const id = crypto.randomUUID();
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
      id: crypto.randomUUID(),
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
    }, 100);
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
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function nextPauseTarget(state, now) {
    const segs = state.segments || [];
    if (state.mode === "break") {
      return { target: state.end, label: "Pause-Ende" };
    }
    const ref = state.type === "upcoming" ? state.start : now;
    const nb = segs.find((s) => s.type === "break" && s.start > ref);
    if (nb) return { target: nb.start, label: "Pause" };
    return { target: state.windowEnd, label: "Feierabend" };
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
      if (
        (stateMem.lastType === "upcoming" && st.type === "during") ||
        (stateMem.lastType === "during" && st.type !== "during")
      ) {
        fireConfetti(120);
      }
      stateMem.lastType = st.type;
      stateMem.lastRuleId = st.rule?.id || null;
      stateMem.lastMode = st.mode || null;
    }

    if (st.type === "during" || st.type === "upcoming") {
      // totals
      const totalRemain = st.windowEnd - now;
      const totalLabel = `Gesamt bis Ende: ${toHM(st.windowEnd)} (${
        st.rule?.name || "Arbeit"
      })`;

      // part (pause/feierabend)
      const np = nextPauseTarget(st, now);
      const partRemain = np.target - now;
      const partLabel = `Bis ${np.label}: ${toHM(np.target)} (${
        st.rule?.name || "Arbeit"
      })`;

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
      const pct = total > 0 ? Math.max(0, Math.min(100, (done / total) * 100)) : 0;

      if (progressBar) progressBar.style.width = pct.toFixed(2) + "%";
      if (progressEl) progressEl.setAttribute("aria-valuenow", pct.toFixed(0));
      if (progressStart) progressStart.textContent = toHM(st.windowStart);
      if (progressEnd) progressEnd.textContent = toHM(st.windowEnd);

      // break style
      if (progressEl) progressEl.classList.toggle("is-break", st.mode === "break");
      if (progressBar) progressBar.classList.toggle("is-break", st.mode === "break");
    } else {
      if (countdownBig) countdownBig.textContent = "–:–";
      if (labelBig) labelBig.textContent = "Keine aktive/kommende Regel";
      if (countdownSmall) countdownSmall.textContent = "–:–";
      if (labelSmall) labelSmall.textContent = "—";
      if (progressBar) progressBar.style.width = "0%";
      if (progressEl) progressEl.setAttribute("aria-valuenow", "0");
      if (progressStart) progressStart.textContent = "–:–";
      if (progressEnd) progressEnd.textContent = "–:–";
      if (progressEl) progressEl.classList.remove("is-break");
      if (progressBar) progressBar.classList.remove("is-break");
    }

    const pn = $("#progressNow");
    if (pn) pn.textContent = "Jetzt";
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

  /* ===== Confetti (lightweight) ===== */
  const confettiCanvas = document.getElementById("confettiCanvas");
  const ctx = confettiCanvas?.getContext?.("2d") || null;
  let confettiRAF = null;
  let confettiParticles = [];

  function resizeCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  function makeParticle() {
    const colors = [
      "#FFD166",
      "#06D6A0",
      "#118AB2",
      "#EF476F",
      getComputedStyle(document.body)
        .getPropertyValue("--accent")
        .trim() || "#6ea8fe",
      getComputedStyle(document.body)
        .getPropertyValue("--accent-2")
        .trim() || "#b17aff",
    ];
    const w = confettiCanvas?.width || window.innerWidth || 0;
    return {
      x: Math.random() * w,
      y: -10,
      r: 2 + Math.random() * 4,
      s: 0.8 + Math.random() * 1.6,
      a: Math.random() * Math.PI * 2,
      v: 0.5 + Math.random() * 0.8,
      c: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * 360,
      rotSpd: (Math.random() - 0.5) * 6,
    };
  }

  function stepConfetti() {
    if (!ctx || !confettiCanvas) {
      confettiParticles = [];
      if (confettiRAF !== null) {
        cancelAnimationFrame(confettiRAF);
        confettiRAF = null;
      }
      return;
    }
    const w = confettiCanvas.width,
      h = confettiCanvas.height;
    ctx.clearRect(0, 0, w, h);
    confettiParticles.forEach((p) => {
      p.y += p.s + 0.4;
      p.x += Math.cos(p.a) * 0.8;
      p.a += 0.04;
      p.rot += p.rotSpd;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();
    });
    confettiParticles = confettiParticles.filter((p) => p.y < h + 10);
    if (confettiParticles.length > 0) {
      confettiRAF = requestAnimationFrame(stepConfetti);
    } else {
      if (confettiRAF !== null) {
        cancelAnimationFrame(confettiRAF);
      }
      confettiRAF = null;
      ctx.clearRect(0, 0, w, h);
    }
  }

  function fireConfetti(amount = 100, durationMs = 1500) {
    if (!ctx || !confettiCanvas) return;
    const start = performance.now();
    const spawn = () => {
      const now = performance.now();
      if (now - start < durationMs) {
        const batch = Math.max(8, (amount / 10) | 0);
        for (let i = 0; i < batch; i++)
          confettiParticles.push(makeParticle());
        if (!confettiRAF)
          confettiRAF = requestAnimationFrame(stepConfetti);
        setTimeout(spawn, 80);
      }
    };
    spawn();
    if (!confettiRAF) confettiRAF = requestAnimationFrame(stepConfetti);
  }

  /* ===== Init ===== */
  (async () => {
    await applyTheme(loadTheme()); // wichtig: async (Bing)
    renderThemeListUI();
    scheduleDailyBgRefresh();

    renderRules();
    initLayoutRadios();
    if (!localStorage.getItem(LS_KEY_LAYOUT)) saveLayout("big-total");

    tick();
    setInterval(tick, 1000);
  })();
})();
