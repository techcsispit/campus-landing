// Navigation drawer & menu
const hamburger = document.querySelector(".hamburger");
const drawer = document.getElementById("nav-drawer");
const overlay = document.querySelector(".drawer-overlay");

function openDrawer() {
  if (!drawer || !overlay) return;
  drawer.classList.add("open");
  drawer.removeAttribute("hidden");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  if (hamburger) hamburger.setAttribute("aria-expanded", "true");
  const first = drawer.querySelector("a");
  if (first) setTimeout(() => first.focus(), 20);
  document.addEventListener("keydown", escDrawer);
}

function closeDrawer() {
  if (!drawer || !overlay) return;
  drawer.classList.remove("open");
  drawer.setAttribute("hidden", "");
  drawer.setAttribute("aria-modal", "false");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  if (hamburger) hamburger.setAttribute("aria-expanded", "false");
  document.removeEventListener("keydown", escDrawer);
}

function escDrawer(e) {
  if (e.key === "Escape") closeDrawer();
}

if (hamburger && drawer && overlay) {
  hamburger.addEventListener("click", () => {
    const isOpen = drawer.classList.contains("open");
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener("click", closeDrawer);

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
}

// Theme toggle
const themeToggle = document.querySelector(".theme-toggle");

// localStorage can throw (Safari with cookies blocked, some privacy modes,
// sandboxed iframes). Never let that stop the rest of the script.
const storage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }
};

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  storage.set("theme", theme);
  if (themeToggle) {
    themeToggle.innerHTML = isDark ? "☾" : "☀";
    themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }
}

const savedTheme = storage.get("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
setTheme(initialTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  });
}

// Events (runs only if event elements exist)
const list = document.getElementById("event-list");
const nextEventContainer = document.getElementById("next-event");

if (list) {
  let EVENTS = [];
  let currentTab = "upcoming"; // "upcoming" | "past" | "saved"
  let currentCategory = "All"; // "All" | "Workshop" | "Contest" | "Social"
  let searchQuery = "";

  const STORAGE_KEY = "campus_landing_saved_events";
  const searchInput = document.getElementById("event-search");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const savedBadge = document.getElementById("saved-badge");

  function getSavedEventIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveEventIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error("Failed to save bookmarks to localStorage", e);
    }
  }

  function getEventId(event) {
    return `${event.date}_${event.title}`;
  }

  function isEventSaved(event, savedIds) {
    const id = getEventId(event);
    return savedIds.includes(id) || savedIds.includes(event.title);
  }

  function updateSavedBadge() {
    if (!savedBadge) return;
    const savedIds = getSavedEventIds();
    const count = savedIds.length;
    savedBadge.textContent = count;
    savedBadge.setAttribute("aria-label", `${count} saved events`);
    if (count > 0) {
      savedBadge.removeAttribute("hidden");
    } else {
      savedBadge.setAttribute("hidden", "");
    }
  }

  function formatDate(event) {
    const d = new Date(`${event.date}T${event.time}`);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + ", " + event.time;
  }

  function downloadCalendarEvent(event) {
    const start = new Date(`${event.date}T${event.time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (v) => String(v).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const uid = `${event.date}-${event.time}-${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}@campus-landing`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Campus Landing//Events//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(event.title)}`,
      `LOCATION:${esc(event.place || event.location || "")}`,
      `DESCRIPTION:${esc(event.description || "")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function getGoogleCalendarUrl(event) {
    const start = new Date(`${event.date}T${event.time}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pad = (v) => String(v).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const text = encodeURIComponent(event.title);
    const dates = `${fmt(start)}/${fmt(end)}`;
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.place || event.location || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toggleClearButton() {
    if (!searchClearBtn || !searchInput) return;
    if (searchInput.value.length > 0) {
      searchClearBtn.removeAttribute("hidden");
    } else {
      searchClearBtn.setAttribute("hidden", "");
    }
  }

  function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll(".event-tab").forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    render();
  }

  function setCategory(category) {
    currentCategory = category;
    document.querySelectorAll(".filter").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === category);
    });
    render();
  }

  function toggleBookmark(event) {
    const id = getEventId(event);
    let savedIds = getSavedEventIds();
    const isSaved = isEventSaved(event, savedIds);

    if (isSaved) {
      savedIds = savedIds.filter((item) => item !== id && item !== event.title);
    } else {
      savedIds.push(id);
    }

    saveEventIds(savedIds);
    updateSavedBadge();

    if (currentTab === "saved") {
      render();
    } else {
      const card = Array.from(list.querySelectorAll(".event-card")).find(
        (c) => c.getAttribute("data-id") === id
      );
      if (card) {
        const btn = card.querySelector(".bookmark-btn");
        const newlySaved = !isSaved;
        btn.classList.toggle("bookmarked", newlySaved);
        btn.setAttribute("aria-pressed", newlySaved ? "true" : "false");
        btn.setAttribute("aria-label", newlySaved ? `Remove ${event.title} from saved events` : `Save ${event.title} to schedule`);
        btn.setAttribute("title", newlySaved ? "Remove from saved" : "Save event");
        const svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", newlySaved ? "currentColor" : "none");
      }
    }
  }

  function filterEvents() {
    const now = new Date();
    const savedIds = getSavedEventIds();
    const query = searchQuery.trim().toLowerCase();

    return EVENTS.filter((e) => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      const isPast = eventDate < now;
      const isSaved = isEventSaved(e, savedIds);

      // 1. Tab filter
      if (currentTab === "upcoming" && isPast) return false;
      if (currentTab === "past" && !isPast) return false;
      if (currentTab === "saved" && !isSaved) return false;

      // 2. Category filter
      if (currentCategory !== "All" && e.type !== currentCategory) return false;

      // 3. Search filter across title, place/venue, description, and type
      if (query) {
        const titleMatch = (e.title || "").toLowerCase().includes(query);
        const placeMatch = (e.place || e.location || "").toLowerCase().includes(query);
        const descMatch = (e.description || "").toLowerCase().includes(query);
        const typeMatch = (e.type || "").toLowerCase().includes(query);
        if (!titleMatch && !placeMatch && !descMatch && !typeMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`);
      const db = new Date(`${b.date}T${b.time}`);
      if (currentTab === "past") {
        return db - da; // most recent past first
      }
      return da - db; // chronological order for upcoming and saved
    });
  }

  function renderEmptyState() {
    const query = searchQuery.trim();
    const savedIds = getSavedEventIds();

    let icon = `<svg class="empty-state-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
    let title = "No events found";
    let desc = "No events match your current filters.";
    let actionBtn = "";

    if (currentTab === "saved" && savedIds.length === 0) {
      icon = `<svg class="empty-state-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      title = "No saved events yet";
      desc = "Click the bookmark icon on any event to build your personal schedule.";
      actionBtn = `<button class="empty-state-action" id="empty-browse-upcoming">Browse upcoming events</button>`;
    } else if (query) {
      title = `No events matching "${escapeHtml(query)}"`;
      desc = `We couldn't find any events matching your search in ${currentTab === "saved" ? "your saved events" : currentTab + " events"}.`;
      actionBtn = `<button class="empty-state-action" id="empty-clear-search">Clear search</button>`;
    } else if (currentCategory !== "All") {
      title = `No ${currentCategory.toLowerCase()} events`;
      desc = `There are currently no ${currentCategory.toLowerCase()} events in ${currentTab}.`;
      actionBtn = `<button class="empty-state-action" id="empty-reset-category">Show all ${currentTab} events</button>`;
    } else if (currentTab === "upcoming") {
      title = "No upcoming events";
      desc = "Check back soon for new announcements and schedules.";
    } else if (currentTab === "past") {
      title = "No past events";
      desc = "No past events recorded yet.";
    }

    list.innerHTML = `
      <div class="empty-state" role="status">
        ${icon}
        <h3>${title}</h3>
        <p>${desc}</p>
        ${actionBtn}
      </div>
    `;

    const clearSearchBtn = document.getElementById("empty-clear-search");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          searchQuery = "";
          toggleClearButton();
          render();
          searchInput.focus();
        }
      });
    }

    const browseUpcomingBtn = document.getElementById("empty-browse-upcoming");
    if (browseUpcomingBtn) {
      browseUpcomingBtn.addEventListener("click", () => {
        switchTab("upcoming");
      });
    }

    const resetCategoryBtn = document.getElementById("empty-reset-category");
    if (resetCategoryBtn) {
      resetCategoryBtn.addEventListener("click", () => {
        setCategory("All");
      });
    }
  }

  function render() {
    const filtered = filterEvents();
    const now = new Date();
    const savedIds = getSavedEventIds();

    // Toggle next-event visibility: only show on upcoming tab when no search query and category is All
    if (nextEventContainer) {
      if (currentTab === "upcoming" && !searchQuery.trim() && currentCategory === "All") {
        nextEventContainer.style.display = "";
      } else {
        nextEventContainer.style.display = "none";
      }
    }

    if (filtered.length === 0) {
      renderEmptyState();
      return;
    }

    list.innerHTML = "";
    filtered.forEach((e) => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      const past = eventDate < now;
      const isSaved = isEventSaved(e, savedIds);
      const card = document.createElement("article");
      card.className = "event-card" + (past ? " past" : "");
      card.setAttribute("data-id", getEventId(e));

      card.innerHTML = `
        <div class="event-header">
          <div class="event-title-group">
            <div class="event-badges">
              <span class="event-type-tag">${escapeHtml(e.type)}</span>
              ${past ? '<span class="event-status-tag">Past</span>' : ''}
            </div>
            <h3 class="event-title">${escapeHtml(e.title)}</h3>
          </div>
          <button type="button" class="bookmark-btn ${isSaved ? 'bookmarked' : ''}" 
                  aria-label="${isSaved ? 'Remove ' + escapeHtml(e.title) + ' from saved events' : 'Save ' + escapeHtml(e.title) + ' to schedule'}" 
                  aria-pressed="${isSaved ? 'true' : 'false'}"
                  title="${isSaved ? 'Remove from saved' : 'Save event'}">
            <svg class="bookmark-icon" width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
        <p class="event-meta">
          <span>${escapeHtml(formatDate(e))}</span>
          <span aria-hidden="true">·</span>
          <span>${escapeHtml(e.place || e.location || "")}</span>
        </p>
        <p class="event-desc">${escapeHtml(e.description || "")}</p>
        <div class="event-actions">
          <a href="${getGoogleCalendarUrl(e)}" target="_blank" rel="noopener noreferrer" class="calendar-btn gcal-btn" aria-label="Add ${escapeHtml(e.title)} to Google Calendar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Google Calendar
          </a>
          <button type="button" class="calendar-btn ics-btn add-calendar" aria-label="Download .ics file for ${escapeHtml(e.title)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Add to calendar (.ics)
          </button>
        </div>
      `;

      const bookmarkBtn = card.querySelector(".bookmark-btn");
      if (bookmarkBtn) {
        bookmarkBtn.setAttribute("aria-label", isSaved ? `Remove ${e.title} from saved events` : `Save ${e.title} to schedule`);
        bookmarkBtn.addEventListener("click", () => toggleBookmark(e));
      }

      const gcalBtn = card.querySelector(".gcal-btn");
      if (gcalBtn) {
        gcalBtn.setAttribute("aria-label", `Add ${e.title} to Google Calendar`);
      }

      const icsBtn = card.querySelector(".add-calendar");
      if (icsBtn) {
        icsBtn.setAttribute("aria-label", `Download .ics file for ${e.title}`);
        icsBtn.addEventListener("click", () => downloadCalendarEvent(e));
      }

      list.appendChild(card);
    });
  }

  function updateCountdown() {
    if (!nextEventContainer) return;
    const now = new Date();
    const next = EVENTS
      .map((ev) => ({ ev, d: new Date(`${ev.date}T${ev.time}`) }))
      .filter(({ d }) => d > now)
      .sort((a, b) => a.d - b.d)[0];

    if (!next) {
      nextEventContainer.innerHTML = '<h2 style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--text-muted);margin:0 0 6px;">Next event</h2><p style="margin:0;color:var(--text-secondary);">No upcoming events.</p>';
      return;
    }

    const ms = next.d - now;
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const d = new Date(`${next.ev.date}T${next.ev.time}`);
    const fmt = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + " · " + next.ev.time;

    nextEventContainer.innerHTML = '<h2 style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--text-muted);margin:0 0 10px;font-weight:600;">Next event</h2>' +
      `<h3 style="font-size:1.4rem;font-weight:600;letter-spacing:-0.03em;margin:0 0 8px;color:var(--text);">${escapeHtml(next.ev.title)}</h3>` +
      `<p style="margin:0 0 6px;color:var(--text-secondary);font-size:0.95rem;">${escapeHtml(fmt)} · ${escapeHtml(next.ev.place || next.ev.location || "")}</p>` +
      `<p style="margin:0 0 10px;color:var(--text-muted);font-size:0.9rem;">${escapeHtml(next.ev.type)}</p>` +
      `<p style="margin:0;font-size:0.85rem;color:var(--accent);font-weight:500;">In ${days} days, ${hours} hours</p>`;
  }

  // Tab click listeners
  document.querySelectorAll(".event-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Tab keyboard navigation
  const tabList = document.querySelector(".events-tabs");
  if (tabList) {
    const tabs = Array.from(tabList.querySelectorAll(".event-tab"));
    tabList.addEventListener("keydown", (e) => {
      const currentFocused = document.activeElement;
      const idx = tabs.indexOf(currentFocused);
      if (idx === -1) return;

      let newIdx = -1;
      if (e.key === "ArrowRight") {
        newIdx = (idx + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        newIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        newIdx = 0;
      } else if (e.key === "End") {
        newIdx = tabs.length - 1;
      }

      if (newIdx !== -1) {
        e.preventDefault();
        tabs[newIdx].focus();
        switchTab(tabs[newIdx].dataset.tab);
      }
    });
  }

  // Category filter buttons
  document.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCategory(btn.dataset.type);
    });
  });

  // Search input listeners
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      toggleClearButton();
      render();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        searchQuery = "";
        toggleClearButton();
        render();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchQuery = "";
        toggleClearButton();
        render();
        searchInput.focus();
      }
    });
  }

  // Fetch events data
  fetch("events.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load events");
      }
      return response.json();
    })
    .then((events) => {
      EVENTS = events;
      updateSavedBadge();
      render();
      updateCountdown();
    })
    .catch(() => {
      list.innerHTML = "<p>Events could not be loaded right now.</p>";
    });

  setInterval(updateCountdown, 60000);
}
