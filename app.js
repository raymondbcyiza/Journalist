const STORAGE_KEY = "sr_journal_v1";

const milestones = [
  { days: 3,  label: "3 days — momentum" },
  { days: 7,  label: "7 days — first week" },
  { days: 14, label: "14 days — two weeks" },
  { days: 30, label: "30 days — one month" },
  { days: 60, label: "60 days — strong base" },
  { days: 90, label: "90 days — major milestone" },
];

const stageByStreak = (days) => {
  // pick an image stage based on streak
  if (days >= 90) return { stage: 5, name: "Legend (90+)" };
  if (days >= 60) return { stage: 4, name: "Focused (60+)" };
  if (days >= 30) return { stage: 3, name: "Steady (30+)" };
  if (days >= 14) return { stage: 2, name: "Building (14+)" };
  return { stage: 1, name: "Starting (0+)" };
};

function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
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
  return [...entries].sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function computeStreak(entries) {
  // Streak counts consecutive days where last entry is not "slip"
  // If a day is missing, streak breaks (simple, predictable behavior).
  const map = new Map(entries.map(e => [e.date, e]));
  const dates = [...map.keys()].sort(); // asc
  if (dates.length === 0) return { current: 0, best: 0 };

  // compute best streak from the whole history
  let best = 0;
  let run = 0;
  let prev = null;

  for (const dt of dates) {
    const e = map.get(dt);
    const cur = new Date(dt + "T00:00:00");
    if (e.dayType === "slip") {
      run = 0;
      prev = cur;
      best = Math.max(best, run);
      continue;
    }

    if (!prev) {
      run = 1;
    } else {
      const diffDays = Math.round((cur - prev) / (1000*60*60*24));
      if (diffDays === 1 && map.get(dt)?.dayType !== "slip") run += 1;
      else run = 1;
    }
    prev = cur;
    best = Math.max(best, run);
  }

  // current streak: walk backward from today until missing/slip
  let current = 0;
  let cursor = new Date(todayISO() + "T00:00:00");
  while (true) {
    const key = cursor.toISOString().slice(0,10);
    const e = map.get(key);
    if (!e) break;
    if (e.dayType === "slip") break;
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best };
}

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
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
  document.getElementById("stageImage").src = `./assets/stage-${stageInfo.stage}.svg`;

  // milestones
  const mWrap = document.getElementById("milestonesList");
  mWrap.innerHTML = "";
  for (const m of milestones) {
    const done = current >= m.days;
    const div = document.createElement("div");
    div.className = `mstone ${done ? "done" : ""}`;
    div.innerHTML = `<strong>${escapeHtml(m.label)}</strong><span>${done ? "Unlocked" : `${m.days - current} days to go`}</span>`;
    mWrap.appendChild(div);
  }

  // feed
  const q = document.getElementById("search").value.trim().toLowerCase();
  const filter = document.getElementById("filterType").value;

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  const filtered = sortEntriesDesc(entries).filter(e => {
    const matchesText =
      !q ||
      (e.headline || "").toLowerCase().includes(q) ||
      (e.facts || "").toLowerCase().includes(q) ||
      (e.analysis || "").toLowerCase().includes(q) ||
      (e.action || "").toLowerCase().includes(q);

    const matchesType = (filter === "all") ? true : e.dayType === filter;
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

  // bind actions
  feed.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      const next = entries.filter(x => x.id !== id);
      saveState({ entries: next });
      render();
    });
  });

  feed.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const item = entries.find(x => x.id === id);
      if (!item) return;

      document.getElementById("date").value = item.date;
      document.getElementById("dayType").value = item.dayType;
      document.getElementById("energy").value = item.energy;
      document.getElementById("mood").value = item.mood;
      document.getElementById("headline").value = item.headline || "";
      document.getElementById("facts").value = item.facts || "";
      document.getElementById("analysis").value = item.analysis || "";
      document.getElementById("action").value = item.action || "";

      // store "editingId" on the form dataset
      const form = document.getElementById("entryForm");
      form.dataset.editingId = id;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function upsertEntry(newEntry) {
  const state = loadState();
  const entries = state.entries || [];
  const i = entries.findIndex(e => e.id === newEntry.id);
  if (i >= 0) entries[i] = newEntry;
  else entries.push(newEntry);
  saveState({ entries });
}

function uuid() {
  return (crypto?.randomUUID?.() || ("id-" + Math.random().toString(16).slice(2)));
}

// init
document.addEventListener("DOMContentLoaded", () => {
  // default date = today
  document.getElementById("date").value = todayISO();

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

    upsertEntry({ id, date, dayType, energy, mood, headline, facts, analysis, action, updatedAt: Date.now() });

    // clear editing mode
    delete form.dataset.editingId;

    // keep date at today; clear text fields
    document.getElementById("headline").value = "";
    document.getElementById("facts").value = "";
    document.getElementById("analysis").value = "";
    document.getElementById("action").value = "";

    render();
  });

  document.getElementById("btnQuickNote").addEventListener("click", () => {
    const headline = prompt("Quick note headline:");
    if (!headline) return;
    const date = document.getElementById("date").value || todayISO();
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
      updatedAt: Date.now()
    });
    render();
  });

  document.getElementById("search").addEventListener("input", render);
  document.getElementById("filterType").addEventListener("change", render);

  // export
  document.getElementById("btnExport").addEventListener("click", () => {
    const state = loadState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retention-journal-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // import
  document.getElementById("btnImport").addEventListener("click", () => {
    document.getElementById("fileImport").click();
  });
  document.getElementById("fileImport").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.entries || !Array.isArray(parsed.entries)) throw new Error("Invalid file format");
      saveState({ entries: parsed.entries });
      render();
      ev.target.value = "";
    } catch (e) {
      alert("Import failed: " + (e?.message || "unknown error"));
    }
  });

  // reset
  document.getElementById("btnReset").addEventListener("click", () => {
    const ok = confirm("Reset all local data? This cannot be undone.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    render();
  });

  render();
});
