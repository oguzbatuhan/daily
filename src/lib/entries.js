export const STORAGE_KEY = "daily-entries-v1";
export const DRAFT_KEY = "daily-draft-v1";

// Deleted entries are not removed right away; they are kept for a while with a "deleted" flag
// so the deletion reaches other devices too. Flags older than 30 days are purged.
const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;

export const TAG_MAX = 20;
export const TAGS_PER_ENTRY = 5;
export const TITLE_MAX = 80;

export const MOODS = [
  { value: 1, emoji: "😞", label: "Çok kötü" },
  { value: 2, emoji: "🙁", label: "Kötü" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 4, emoji: "🙂", label: "İyi" },
  { value: 5, emoji: "😄", label: "Çok iyi" },
];
export const moodOf = (v) => MOODS.find((m) => m.value === v) || null;

// While typing: drop leading/double spaces and cut at the limit
export const typingTag = (v) =>
  String(v ?? "").replace(/^[\s#]+/, "").replace(/\s{2,}/g, " ").slice(0, TAG_MAX);
export const cleanTag = (v) => typingTag(v).trim();

export function cleanTags(list) {
  const seen = new Set();
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const c = cleanTag(t);
    const key = c.toLocaleLowerCase("tr-TR");
    if (!c || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= TAGS_PER_ENTRY) break;
  }
  return out;
}

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const emptyDraft = () => ({ title: "", body: "", mood: 0, tags: [] });
export const isBlank = (d) => !d.title.trim() && !d.body.trim();

// date: day the entry was written (YYYY-MM-DD) · createdAt: timestamp · mood: 0 (none) or 1-5
export function newEntry({ date, title = "", body = "", mood = 0, tags = [] }) {
  const now = Date.now();
  return {
    id: uid(),
    date,
    createdAt: now,
    title: title.trim().slice(0, TITLE_MAX),
    body: body.replace(/\s+$/, ""),
    mood: MOODS.some((m) => m.value === mood) ? mood : 0,
    tags: cleanTags(tags),
    deleted: false,
    updatedAt: now,
  };
}

export function normalizeEntries(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)))
    .map((e) => ({
      id: e.id,
      date: e.date,
      createdAt: Number(e.createdAt) || 0,
      title: String(e.title ?? "").slice(0, TITLE_MAX),
      body: String(e.body ?? ""),
      mood: MOODS.some((m) => m.value === Number(e.mood)) ? Number(e.mood) : 0,
      tags: cleanTags(e.tags),
      deleted: Boolean(e.deleted),
      updatedAt: Number(e.updatedAt) || 0,
    }));
}

export function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeEntries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function loadDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!raw) return emptyDraft();
    return {
      title: String(raw.title ?? "").slice(0, TITLE_MAX),
      body: String(raw.body ?? ""),
      mood: MOODS.some((m) => m.value === Number(raw.mood)) ? Number(raw.mood) : 0,
      tags: cleanTags(raw.tags),
    };
  } catch {
    return emptyDraft();
  }
}

export const sortById = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
export const sameEntries = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// If the same entry changed in two places, the latest change (larger updatedAt) wins.
export function mergeEntries(local, remote) {
  const byId = new Map();
  for (const e of [...normalizeEntries(local), ...normalizeEntries(remote)]) {
    const current = byId.get(e.id);
    if (!current || e.updatedAt > current.updatedAt) byId.set(e.id, e);
  }
  const cutoff = Date.now() - TOMBSTONE_MS;
  const kept = [...byId.values()].filter((e) => !(e.deleted && e.updatedAt < cutoff));
  return sortById(kept);
}

export const wordCount = (text) => (String(text).trim() ? String(text).trim().split(/\s+/).length : 0);

const norm = (s) => String(s).toLocaleLowerCase("tr-TR");

// Entries matching the search text (title, body, tags) and the selected tag
export function filterEntries(entries, query = "", tag = "") {
  const q = norm(query.trim());
  const t = norm(tag);
  return entries.filter((e) => {
    if (e.deleted) return false;
    if (t && !e.tags.some((x) => norm(x) === t)) return false;
    if (!q) return true;
    return norm(e.title).includes(q) || norm(e.body).includes(q) || e.tags.some((x) => norm(x).includes(q));
  });
}

// Groups by day: newest day first, newest entry first within a day.
// If "today" is given it is included even when it has no entries.
export function groupByDay(entries, today) {
  const map = new Map();
  for (const e of entries) {
    if (e.deleted) continue;
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date).push(e);
  }
  if (today && !map.has(today)) map.set(today, []);
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => b.createdAt - a.createdAt),
    }));
}

// Most used tags, then most recent
export function topTags(entries, limit = 8) {
  const count = new Map();
  for (const e of entries) {
    if (e.deleted) continue;
    for (const t of e.tags) {
      const key = norm(t);
      const cur = count.get(key) || { tag: t, n: 0, last: 0 };
      cur.n += 1;
      cur.last = Math.max(cur.last, e.createdAt);
      count.set(key, cur);
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n || b.last - a.last).slice(0, limit).map((x) => x.tag);
}

// Streak with weekly "freezes": every week (Monday to Sunday) gives FREEZES_PER_WEEK protections that
// renew each week and do not carry over. A missed day uses one automatically, so the streak survives;
// when a week has none left, a missed day resets the streak. Frozen days keep the streak alive but do
// not add to the count. The whole thing is derived from the entries themselves (nothing extra is stored),
// so it is identical on every device and recomputes correctly after a restore.
// Today is never penalised: it is still open until midnight.
export const FREEZES_PER_WEEK = 2;

export function streakInfo(entries, today, shift, weekKey) {
  const days = new Set();
  for (const e of entries) if (!e.deleted && e.date <= today) days.add(e.date);
  const usedByWeek = new Map();
  let count = 0;
  if (days.size) {
    let first = today;
    for (const d of days) if (d < first) first = d;
    for (let d = first; d < today; d = shift(d, 1)) {
      if (days.has(d)) {
        count += 1;
      } else if (count > 0) {
        const wk = weekKey(d);
        const used = usedByWeek.get(wk) || 0;
        if (used < FREEZES_PER_WEEK) usedByWeek.set(wk, used + 1);
        else count = 0;
      }
    }
    if (days.has(today)) count += 1;
  }
  const left = Math.max(0, FREEZES_PER_WEEK - (usedByWeek.get(weekKey(today)) || 0));
  return { count, left };
}

/* ---------- Backup ---------- */

export function buildBackup(entries) {
  return {
    app: "daily",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: normalizeEntries(entries).filter((e) => !e.deleted),
  };
}

// Accepts the app's own backup file (or a bare array). Throws a readable Turkish message when invalid.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Dosya okunamadı. Geçerli bir yedek dosyası değil.");
  }
  const list = Array.isArray(data) ? data : data?.entries;
  if (!Array.isArray(list)) throw new Error("Bu dosyada günlük kaydı bulunamadı.");
  const entries = normalizeEntries(list);
  if (list.length > 0 && entries.length === 0) throw new Error("Bu dosyadaki kayıtlar tanınmadı.");
  return entries;
}

// Human readable export: newest day first
export function buildText(entries, label) {
  const groups = groupByDay(entries.filter((e) => !e.deleted));
  return groups
    .map((g) => {
      const head = label(g.date);
      const body = g.items
        .slice()
        .reverse()
        .map((e) => {
          const time = new Date(e.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
          const mood = moodOf(e.mood);
          const meta = [time, mood ? mood.label : "", e.tags.length ? e.tags.map((t) => "#" + t).join(" ") : ""]
            .filter(Boolean)
            .join(" · ");
          return [meta, e.title ? e.title : "", e.body].filter(Boolean).join("\n");
        })
        .join("\n\n");
      return head + "\n" + "=".repeat(head.length) + "\n\n" + body;
    })
    .join("\n\n\n");
}
