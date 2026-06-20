window.addEventListener("error", (e) => {
  console.error("Global error:", e.message);
});

const STORAGE_KEY = "sr_journal_v1";
let nextDayTimerInterval = null;
let lastRenderedDay = null;

const milestones = [
  { days: 3, label: "3 days — momentum" },
  { days: 7, label: "7 days — first week" },
  { days: 14, label: "14 days — two weeks" },
  { days: 30, label: "30 days — one month" },
  { days: 60, label: "60 days — strong base" },
  { days: 90, label: "90 days — major milestone" },
  { days: 120, label: "120 days — habits locked in" },
  { days: 150, label: "150 days — no more excuses" },
  { days: 180, label: "180 days — mind & body aligned" },
  { days: 210, label: "210 days — consistency wins" },
  { days: 240, label: "240 days — identity shift" },
  { days: 270, label: "270 days — lead by example" },
  { days: 300, label: "300 days — built different" },
  { days: 330, label: "330 days — unstoppable" },
  { days: 365, label: "365 days — legend status" },
];

const galleryStages = [
  { days: 3, label: "Momentum", file: "stage-1.jpg" },
  { days: 7, label: "First Week", file: "stage-1.jpg" },
  { days: 14, label: "Building", file: "stage-2.jpg" },
  { days: 30, label: "Steady", file: "stage-3.jpg" },
  { days: 60, label: "Focused", file: "stage-4.jpg" },
  { days: 90, label: "Major Milestone", file: "stage-90.jpg" },
  { days: 120, label: "Discipline", file: "stage-120.jpg" },
  { days: 150, label: "Warrior", file: "stage-150.jpg" },
  { days: 180, label: "Aligned", file: "stage-180.jpg" },
  { days: 210, label: "Consistency Wins", file: "stage-210.jpg" },
  { days: 240, label: "Identity Shift", file: "stage-240.jpg" },
  { days: 270, label: "Leader", file: "stage-270.jpg" },
  { days: 300, label: "Built Different", file: "stage-300.jpg" },
  { days: 330, label: "Unstoppable", file: "stage-330.jpg" },
  { days: 365, label: "Legend", file: "stage-365.jpg" },
];

function stageByStreak(days) {
  if (days >= 365) return { stage: 365, name: "Legend (365)" };
  if (days >= 330) return { stage: 330, name: "Unstoppable (330+)" };
  if (days >= 300) return { stage: 300, name: "Built Different (300+)" };
  if (days >= 270) return { stage: 270, name: "Leader (270+)" };
  if (days >= 240) return { stage: 240, name: "Identity Shift (240+)" };
  if (days >= 210) return { stage: 210, name: "Consistency Wins (210+)" };
  if (days >= 180) return { stage: 180, name: "Aligned (180+)" };
  if (days >= 150) return { stage: 150, name: "Warrior (150+)" };
  if (days >= 120) return { stage: 120, name: "Discipline (120+)" };
  if (days >= 90) return { stage: 90, name: "Major Milestone (90+)" };
  if (days >= 60) return { stage: 5, name: "Focused (60+)" };
  if (days >= 30) return { stage: 4, name: "Steady (30+)" };
  if (days >= 14) return { stage: 3, name: "Building (14+)" };
  if (days >= 7) return { stage: 2, name: "First Week (7+)" };
  if (days >= 3) return { stage: 1, name: "Momentum (3+)" };
  return { stage: 1, name: "Starting (0+)" };
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.entries || !Array.isArray(parsed.entries)) parsed.entries = [];
    return parsed;
  } catch {
    return { entries: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sortEntriesDesc(entries) {
  return [...entries].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

function diffDaysInclusive(fromISO, toISO) {
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
}

function computeStreak(entries) {
  if (!entries.length) return { current: 0, best: 0 };

  const dayMap = new Map();

  // Keep only the latest entry per day
  for (const e of entries) {
    const prev = dayMap.get(e.date);
    if (!prev || (e.updatedAt || 0) >= (prev.updatedAt || 0)) {
      dayMap.set(e.date, e);
    }
  }

  const dates = [...dayMap.keys()].sort();
  if (!dates.length) return { current: 0, best: 0 };

  const firstDate = dates[0];
  const today = todayISO();

  // Current streak:
  // Count consecutive days up to today unless a slip is encountered.
  let current = 0;
  let cursor = new Date(today + "T00:00:00");
  const lowerBound = new Date(firstDate + "T00:00:00");

  while (cursor >= lowerBound) {
    const iso = isoFromDate(cursor);
    const entry = dayMap.get(iso);

    if (entry?.dayType === "slip") break;

    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak:
  // Count longest run from first logged date to today, reset on slip.
  let best = 0;
  let run = 0;
  let scan = new Date(firstDate + "T00:00:00");
  const end = new Date(today + "T00:00:00");

  while (scan <= end) {
    const iso = isoFromDate(scan);
    const entry = dayMap.get(iso);

    if (entry?.dayType === "slip") {
      run = 0;
    } else {
      run++;
      if (run > best) best = run;
    }

    scan.setDate(scan.getDate() + 1);
  }

  return { current, best };
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function getNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

function updateNextDayTimer() {
  const timerEl = document.getElementById("nextDayTimer");
  const hintEl = document.getElementById("timerDateHint");
  if (!timerEl || !hintEl) return;

  const now = new Date();
  const nextMidnight = getNextMidnight();
  const diff = nextMidnight - now;

  timerEl.textContent = formatCountdown(diff);

  const tomorrow = new Date(nextMidnight);
  hintEl.textContent = `Resets at ${isoFromDate(tomorrow)} 00:00`;

  // Critical fix: rerender once the actual day changes
  const currentDay = todayISO();
  if (lastRenderedDay !== currentDay) {
    lastRenderedDay = currentDay;
    syncDateInputToToday();
    render();
  }
}

function startNextDayTimer() {
  if (nextDayTimerInterval) {
    clearInterval(nextDayTimerInterval);
  }

  lastRenderedDay = todayISO();
  updateNextDayTimer();
  nextDayTimerInterval = setInterval(updateNextDayTimer, 1000);
}

function setActiveTab(name) {
  document.querySelectorAll("[data-tab-btn]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tabBtn === name);
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const isActive = panel.dataset.tabPanel === name;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function renderMilestones(current) {
  const mWrap = document.getElementById("milestonesList");
  if (!mWrap) return;

  mWrap.innerHTML = "";

  for (const m of milestones) {
    const done = current >= m.days;
    const div = document.createElement("div");
    div.className = `mstone ${done ? "done" : ""}`;
    div.innerHTML = `
      <strong>${escapeHtml(m.label)}</strong>
      <span>${done ? "Unlocked" : `${m.days - current} days to go`}</span>
    `;
    mWrap.appendChild(div);
  }
}

function renderGallery(current) {
  const wrap = document.getElementById("stageGallery");
  if (!wrap) return;

  wrap.innerHTML = "";

  for (const item of galleryStages) {
    const unlocked = current >= item.days;
    const remaining = Math.max(0, item.days - current);

    const card = document.createElement("article");
    card.className = `stageTile ${unlocked ? "is-unlocked" : "is-locked"}`;

    card.innerHTML = `
      <div class="stageTile__imageWrap">
        <img
          class="stageTile__image"
          src="./assets/${item.file}"
          alt="${escapeHtml(item.label)} stage image"
          data-fallback="./assets/stage-placeholder.jpg"
        />
        ${unlocked ? "" : `<div class="stageTile__lock" aria-label="Locked">🔒</div>`}
      </div>

      <div class="stageTile__body">
        <div class="stageTile__top">
          <strong>${item.days} days</strong>
          <span class="pill ${unlocked ? "pill--done" : "pill--locked"}">
            ${unlocked ? "Unlocked" : "Locked"}
          </span>
        </div>
        <div class="stageTile__label">${escapeHtml(item.label)}</div>
        <div class="stageTile__hint muted">
          ${unlocked ? "Available now" : `${remaining} days to unlock`}
        </div>
      </div>
    `;

    const img = card.querySelector("img");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = img.dataset.fallback || "./assets/stage-placeholder.jpg";
      };
    }

    wrap.appendChild(card);
  }
}

function renderFeed(entries) {
  const searchEl = document.getElementById("search");
  const filterEl = document.getElementById("filterType");
  const feed = document.getElementById("feed");
  if (!searchEl || !filterEl || !feed) return;

  const q = searchEl.value.trim().toLowerCase();
  const filter = filterEl.value;

  feed.innerHTML = "";

  const filtered = sortEntriesDesc(entries).filter((e) => {
    const matchesText =
      !q ||
      (e.headline || "").toLowerCase().includes(q) ||
      (e.facts || "").toLowerCase().includes(q) ||
      (e.analysis || "").toLowerCase().includes(q) ||
      (e.action || "").toLowerCase().includes(q);

    const matchesType = filter === "all" ? true : e.dayType === filter;
    return matchesText && matchesType;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No entries yet. Write your first log above.";
    feed.appendChild(empty);
    return;
  }

  for (const e of filtered) {
    const el = document.createElement("div");
    el.className = "entry";

    const badgeClass = e.dayType || "clean";
    const title = e.headline?.trim() || "(No headline)";
    const meta = `${e.date} • Energy ${e.energy}/10 • Mood ${e.mood}/10`;

    const bodyParts = [
      e.facts ? `<div><strong>Facts:</strong> ${escapeHtml(e.facts)}</div>` : "",
      e.analysis ? `<div><strong>Analysis:</strong> ${escapeHtml(e.analysis)}</div>` : "",
      e.action ? `<div><strong>Next:</strong> ${escapeHtml(e.action)}</div>` : "",
    ]
      .filter(Boolean)
      .join("");

    el.innerHTML = `
      <div class="entry__top">
        <div>
          <p class="entry__title">${escapeHtml(title)}</p>
          <div class="entry__meta">${escapeHtml(meta)}</div>
        </div>
        <span class="badge ${badgeClass}">${escapeHtml(e.dayType)}</span>
      </div>

      <div class="entry__body">${bodyParts || "<span class='muted'>No notes.</span>"}</div>

      <div class="entry__actions">
        <button class="linkBtn" data-edit="${e.id}">Edit</button>
        <button class="linkBtn" data-del="${e.id}">Delete</button>
      </div>
    `;

    feed.appendChild(el);
  }

  feed.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = loadState();
      const entries = state.entries || [];
      const id = btn.getAttribute("data-del");
      const next = entries.filter((x) => x.id !== id);
      saveState({ entries: next });
      render();
    });
  });

  feed.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = loadState();
      const entries = state.entries || [];
      const id = btn.getAttribute("data-edit");
      const item = entries.find((x) => x.id === id);
      if (!item) return;

      document.getElementById("date").value = item.date;
      document.getElementById("dayType").value = item.dayType;
      document.getElementById("energy").value = item.energy;
      document.getElementById("mood").value = item.mood;
      document.getElementById("headline").value = item.headline || "";
      document.getElementById("facts").value = item.facts || "";
      document.getElementById("analysis").value = item.analysis || "";
      document.getElementById("action").value = item.action || "";

      const form = document.getElementById("entryForm");
      form.dataset.editingId = id;

      setActiveTab("journal");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function render() {
  const state = loadState();
  const entries = state.entries || [];
  const { current, best } = computeStreak(entries);

  const streakEl = document.getElementById("streakDays");
  const bestEl = document.getElementById("bestDays");
  const totalEl = document.getElementById("totalEntries");
  const stageLabelEl = document.getElementById("stageLabel");
  const heroImg = document.getElementById("stageImage");

  if (streakEl) streakEl.textContent = String(current);
  if (bestEl) bestEl.textContent = String(best);
  if (totalEl) totalEl.textContent = String(entries.length);

  const stageInfo = stageByStreak(current);
  if (stageLabelEl) stageLabelEl.textContent = `Stage: ${stageInfo.name}`;

  if (heroImg) {
    heroImg.src = `./assets/stage-${stageInfo.stage}.jpg`;
    heroImg.onerror = () => {
      heroImg.onerror = null;
      heroImg.src = "./assets/stage-placeholder.jpg";
    };
  }

  renderMilestones(current);
  renderGallery(current);
  renderFeed(entries);
}

function upsertEntry(newEntry) {
  const state = loadState();
  const entries = state.entries || [];
  const i = entries.findIndex((e) => e.id === newEntry.id);

  if (i >= 0) entries[i] = newEntry;
  else entries.push(newEntry);

  saveState({ entries });
}

function uuid() {
  return crypto?.randomUUID?.() || ("id-" + Math.random().toString(16).slice(2));
}

function isEditing() {
  const form = document.getElementById("entryForm");
  return !!form?.dataset?.editingId;
}

function syncDateInputToToday() {
  const dateEl = document.getElementById("date");
  if (!dateEl) return;
  if (isEditing()) return;

  const today = todayISO();
  if (dateEl.value !== today) {
    dateEl.value = today;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const heroImg = document.getElementById("stageImage");
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("imageModalImg");

  if (heroImg && modal && modalImg) {
    heroImg.addEventListener("click", () => {
      modalImg.src = heroImg.src;
      modal.classList.remove("hidden");
    });

    modal.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  syncDateInputToToday();
  setActiveTab("overview");
  render();
  startNextDayTimer();

  document.querySelectorAll("[data-tab-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tabBtn);
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateNextDayTimer();
      syncDateInputToToday();
      render();
    }
  });

  document.getElementById("date")?.addEventListener("focus", syncDateInputToToday);
  document.getElementById("date")?.addEventListener("click", syncDateInputToToday);

  document.getElementById("entryForm")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;

    const date = document.getElementById("date").value;
    const dayType = document.getElementById("dayType").value;
    const energy = Number(document.getElementById("energy").value);
    const mood = Number(document.getElementById("mood").value);
    const headline = document.getElementById("headline").value.trim();
    const facts = document.getElementById("facts").value.trim();
    const analysis = document.getElementById("analysis").value.trim();
    const action = document.getElementById("action").value.trim();

    const editingId = form.dataset.editingId;
    const id = editingId || uuid();

    upsertEntry({
      id,
      date,
      dayType,
      energy,
      mood,
      headline,
      facts,
      analysis,
      action,
      updatedAt: Date.now(),
    });

    delete form.dataset.editingId;

    syncDateInputToToday();
    document.getElementById("dayType").value = "clean";
    document.getElementById("energy").value = "6";
    document.getElementById("mood").value = "6";
    document.getElementById("headline").value = "";
    document.getElementById("facts").value = "";
    document.getElementById("analysis").value = "";
    document.getElementById("action").value = "";

    setActiveTab("overview");
    render();
  });

  document.getElementById("btnQuickNote")?.addEventListener("click", () => {
    const headline = prompt("Quick note headline:");
    if (!headline) return;

    const dateEl = document.getElementById("date");
    const date = isEditing() ? dateEl.value : todayISO();

    upsertEntry({
      id: uuid(),
      date,
      dayType: "clean",
      energy: 6,
      mood: 6,
      headline: headline.trim(),
      facts: "",
      analysis: "",
      action: "",
      updatedAt: Date.now(),
    });

    setActiveTab("overview");
    render();
  });

  document.getElementById("search")?.addEventListener("input", render);
  document.getElementById("filterType")?.addEventListener("change", render);

  document.getElementById("btnExport")?.addEventListener("click", () => {
    const state = loadState();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retention-journal-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btnImport")?.addEventListener("click", () => {
    document.getElementById("fileImport")?.click();
  });

  document.getElementById("fileImport")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error("Invalid file format");
      }

      saveState({ entries: parsed.entries });
      render();
      ev.target.value = "";
    } catch (e) {
      alert("Import failed: " + (e?.message || "unknown error"));
    }
  });

  document.getElementById("btnReset")?.addEventListener("click", () => {
    const ok = confirm("Reset all local data? This cannot be undone.");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    syncDateInputToToday();
    render();
  });
});
