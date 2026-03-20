window.addEventListener("error", (e) => {
  console.error("Global error:", e.message);
});

const STORAGE_KEY = "sr_journal_v1";

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

const stageByStreak = (days) => {
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

  if (days >= 60) return { stage: 4, name: "Focused (60+)" };
  if (days >= 30) return { stage: 3, name: "Steady (30+)" };
  if (days >= 14) return { stage: 2, name: "Building (14+)" };
  return { stage: 1, name: "Starting (0+)" };
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.entries) parsed.entries = [];
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

  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.updatedAt || 0) - (b.updatedAt || 0);
  });

  const today = todayISO();

  // Latest entry for a given day wins
  const dayMap = new Map();
  for (const e of sorted) {
    dayMap.set(e.date, e);
  }

  const dates = [...dayMap.keys()].sort();

  // CURRENT STREAK:
  // Time-based. Count calendar days since the most recent slip.
  // If today is slip => 0.
  // If there has never been a slip => count from first recorded day to today.
  let lastSlipDate = null;
  for (const dt of dates) {
    const e = dayMap.get(dt);
    if (e.dayType === "slip") lastSlipDate = dt;
  }

  let current = 0;
  const todayEntry = dayMap.get(today);

  if (todayEntry?.dayType === "slip") {
    current = 0;
  } else if (lastSlipDate) {
    current = Math.max(0, diffDaysInclusive(lastSlipDate, today) - 1);
  } else {
    current = diffDaysInclusive(dates[0], today);
  }

  // BEST STREAK:
  // Longest calendar segment between slips, extended to today if current segment is open.
  let best = 0;
  let segmentStart = null;

  for (const dt of dates) {
    const e = dayMap.get(dt);

    if (e.dayType === "slip") {
      if (segmentStart) {
        const days = diffDaysInclusive(segmentStart, dt) - 1;
        best = Math.max(best, days);
        segmentStart = null;
      }
    } else if (!segmentStart) {
      segmentStart = dt;
    }
  }

  if (segmentStart) {
    best = Math.max(best, diffDaysInclusive(segmentStart, today));
  }

  return { current, best };
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function render() {
  const state = loadState();
  const entries = state.entries || [];

  const { current, best } = computeStreak(entries);
  document.getElementById("streakDays").textContent = String(current);
  document.getElementById("bestDays").textContent = String(best);
  document.getElementById("totalEntries").textContent = String(entries.length);

  const stageInfo = stageByStreak(current);
  document.getElementById("stageLabel").textContent = `Stage: ${stageInfo.name}`;

  const img = document.getElementById("stageImage");
  img.src = `./assets/stage-${stageInfo.stage}.jpg`;
  img.onerror = () => {
    img.onerror = null;
    img.src = "./assets/stage-placeholder.jpg";
  };

  const mWrap = document.getElementById("milestonesList");
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

  const q = document.getElementById("search").value.trim().toLowerCase();
  const filter = document.getElementById("filterType").value;

  const feed = document.getElementById("feed");
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
    ].filter(Boolean).join("");

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
      const id = btn.getAttribute("data-del");
      const next = entries.filter((x) => x.id !== id);
      saveState({ entries: next });
      render();
    });
  });

  feed.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
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

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
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

function scheduleMidnightSync() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 2, 0); // 2 seconds after local midnight
  const ms = next - now;

  setTimeout(() => {
    syncDateInputToToday();
    render();
    scheduleMidnightSync();
  }, ms);
}

document.addEventListener("DOMContentLoaded", () => {
  syncDateInputToToday();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      syncDateInputToToday();
      render();
    }
  });

  document.getElementById("date").addEventListener("focus", syncDateInputToToday);
  document.getElementById("date").addEventListener("click", syncDateInputToToday);

  scheduleMidnightSync();

  document.getElementById("entryForm").addEventListener("submit", (ev) => {
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
    document.getElementById("headline").value = "";
    document.getElementById("facts").value = "";
    document.getElementById("analysis").value = "";
    document.getElementById("action").value = "";

    render();
  });

  document.getElementById("btnQuickNote").addEventListener("click", () => {
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

    render();
  });

  document.getElementById("search").addEventListener("input", render);
  document.getElementById("filterType").addEventListener("change", render);

  document.getElementById("btnExport").addEventListener("click", () => {
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

  document.getElementById("btnImport").addEventListener("click", () => {
    document.getElementById("fileImport").click();
  });

  document.getElementById("fileImport").addEventListener("change", async (ev) => {
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

  document.getElementById("btnReset").addEventListener("click", () => {
    const ok = confirm("Reset all local data? This cannot be undone.");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    render();
  });

  render();
});