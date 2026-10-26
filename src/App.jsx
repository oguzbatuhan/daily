import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackupMenu from "./components/BackupMenu.jsx";
import Composer from "./components/Composer.jsx";
import { DayToggle, EntryRow, GroupHead } from "./components/EntryRow.jsx";
import { FlameIcon, FreezeIcon, SearchIcon } from "./components/Icons.jsx";
import SyncBar from "./components/SyncBar.jsx";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { groupLabel, longLabel, shiftIso, toIso, weekStartIso } from "./lib/dates.js";
import {
  DRAFT_KEY,
  STORAGE_KEY,
  buildBackup,
  buildText,
  emptyDraft,
  filterEntries,
  groupByDay,
  isBlank,
  loadDraft,
  loadEntries,
  mergeEntries,
  newEntry,
  parseBackup,
  FREEZES_PER_WEEK,
  streakInfo,
  topTags,
} from "./lib/entries.js";

const FIRST_PAGE_DAYS = 14;
const BACKUP_KEY = "daily-last-backup";
const NUDGE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

const readBackupTime = () => {
  try {
    return Number(localStorage.getItem(BACKUP_KEY)) || 0;
  } catch {
    return 0;
  }
};

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  const [entries, setEntries] = useState(loadEntries);
  const [draft, setDraft] = useState(loadDraft);
  const [editing, setEditing] = useState(null); // { id, value }
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [dayLimit, setDayLimit] = useState(FIRST_PAGE_DAYS);
  const [notice, setNotice] = useState("");
  const [lastBackup, setLastBackup] = useState(readBackupTime);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [wantsNew] = useState(() => new URLSearchParams(window.location.search).get("new") === "1");
  const sync = useCloudSync(entries, setEntries);
  const noticeTimer = useRef(null);

  const say = useCallback((msg) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  }, []);

  // Local copy: entries are kept in this browser even when not connected to the cloud backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }, [entries]);

  // The unsent draft survives reloads and closing the app
  useEffect(() => {
    try {
      if (isBlank(draft)) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  // Update "today" if the page stays open past midnight
  useEffect(() => {
    const check = () => setToday((prev) => (toIso(new Date()) === prev ? prev : toIso(new Date())));
    const id = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // Esc leaves focus mode
  useEffect(() => {
    if (!focus) return;
    const onKey = (e) => e.key === "Escape" && setFocus(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  const searching = query.trim() !== "" || tag !== "";
  const live = useMemo(() => entries.filter((e) => !e.deleted), [entries]);
  const suggestions = useMemo(() => topTags(entries, 6), [entries]);
  const filtered = useMemo(() => filterEntries(entries, query, tag), [entries, query, tag]);
  const groups = useMemo(() => {
    const g = groupByDay(filtered, searching ? null : today);
    return g;
  }, [filtered, today, searching]);
  const todayCount = useMemo(() => live.filter((e) => e.date === today).length, [live, today]);
  const { count: days, left: freezesLeft } = useMemo(
    () => streakInfo(entries, today, shiftIso, weekStartIso),
    [entries, today]
  );
  const shown = groups.slice(0, dayLimit);

  // Past days start closed; today is always open (and everything is open while searching)
  const [openDays, setOpenDays] = useState(() => new Set());
  const toggleDay = (date) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  const saveDraft = () => {
    if (isBlank(draft)) return;
    setEntries((prev) => [...prev, newEntry({ date: toIso(new Date()), ...draft })]);
    setDraft(emptyDraft());
    setFocus(false);
    say("Kaydedildi");
  };

  const startEdit = (id) => {
    const e = entries.find((x) => x.id === id);
    if (e) setEditing({ id, value: { title: e.title, body: e.body, mood: e.mood, tags: e.tags } });
  };

  const saveEdit = () => {
    if (!editing || isBlank(editing.value)) return;
    const v = editing.value;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editing.id
          ? {
              ...newEntry({ date: e.date, ...v }),
              id: e.id,
              createdAt: e.createdAt,
              updatedAt: Date.now(),
            }
          : e
      )
    );
    setEditing(null);
    say("Güncellendi");
  };

  const remove = (id) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, deleted: true, updatedAt: Date.now() } : e)));

  /* ---------- Backup ---------- */
  const markBackup = () => {
    const now = Date.now();
    setLastBackup(now);
    try {
      localStorage.setItem(BACKUP_KEY, String(now));
    } catch {}
  };

  const exportJson = () => {
    download("daily-backup-" + today + ".json", JSON.stringify(buildBackup(entries), null, 2), "application/json");
    markBackup();
    say("Yedek indirildi");
  };

  const exportText = () => {
    download("daily-" + today + ".txt", buildText(entries, longLabel), "text/plain;charset=utf-8");
    say("Metin dosyası indirildi");
  };

  const importFile = async (file) => {
    try {
      const imported = parseBackup(await file.text());
      const before = new Set(live.map((e) => e.id));
      const fresh = imported.filter((e) => !e.deleted && !before.has(e.id)).length;
      setEntries((prev) => mergeEntries(prev, imported));
      say(fresh > 0 ? fresh + " yazı geri yüklendi" : "Yeni yazı yok, her şey zaten bu cihazda");
    } catch (e) {
      say(e.message || "Yedek yüklenemedi");
    }
  };

  const showNudge =
    !sync.connected && !nudgeHidden && live.length >= 3 && (!lastBackup || Date.now() - lastBackup > NUDGE_AFTER_MS);

  const hasAny = live.length > 0;

  return (
    <main className="mx-auto w-full max-w-xl">
      <header className="mb-6">
        {/* Menus of the two buttons anchor to this row, so they never run off the screen edge */}
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-xl font-medium tracking-tight">Günlük</h1>
          <div className="flex shrink-0 items-center gap-2">
            <BackupMenu
              lastBackup={lastBackup}
              count={live.length}
              onExportJson={exportJson}
              onExportText={exportText}
              onImport={importFile}
            />
            <SyncBar sync={sync} />
          </div>
        </div>
        <p className="tabular mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--muted)]">
          <span className="whitespace-nowrap">{todayCount > 0 ? "Bugün " + todayCount + " yazı" : "Bugün henüz yazmadın"}</span>
          {days > 0 ? (
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap text-[var(--accent)] [&>svg]:shrink-0"
              title="Üst üste yazılan gün sayısı"
            >
              <FlameIcon />
              {days} gün
            </span>
          ) : null}
          {days > 0 ? (
            <span
              className="inline-flex items-center gap-0.5 [&>span]:shrink-0"
              title={
                "Seri koruması: bu hafta " +
                freezesLeft +
                "/" +
                FREEZES_PER_WEEK +
                " hakkın var. Yazmadığın bir günde otomatik kullanılır, her pazartesi yenilenir."
              }
              aria-label={"Bu hafta " + freezesLeft + " seri koruması hakkın var"}
            >
              {Array.from({ length: FREEZES_PER_WEEK }, (_, i) => (
                <span key={i} className={i < freezesLeft ? "text-[var(--accent)]" : "opacity-30"}>
                  <FreezeIcon />
                </span>
              ))}
            </span>
          ) : null}
        </p>
      </header>

      {showNudge ? (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-2xl bg-[var(--accent-soft)] py-2.5 pl-4 pr-2 text-[0.8125rem] leading-5 text-[var(--accent)]"
        >
          <span className="min-w-0 flex-1">
            Yazıların yalnızca bu cihazda. Üstteki kalkan simgesinden yedek al
            {sync.configured ? " ya da Google ile bağlan." : "."}
          </span>
          <button type="button" className="link-btn shrink-0 !px-3 !py-2" onClick={() => setNudgeHidden(true)}>
            Sonra
          </button>
        </div>
      ) : null}

      {focus ? null : (
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={saveDraft}
          onExpand={() => setFocus(true)}
          suggestions={suggestions}
          autoFocus={wantsNew}
          placeholder={hasAny ? "Bugün aklında ne var?" : "İlk yazını yaz. Kimse görmeyecek, sadece sen."}
        />
      )}
      {focus ? (
        <Composer
          big
          autoFocus
          value={draft}
          onChange={setDraft}
          onSubmit={saveDraft}
          onCancel={() => setFocus(false)}
          suggestions={suggestions}
        />
      ) : null}

      {hasAny ? (
        <div className="mt-7 flex flex-col gap-3">
          <label className="search-field">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Yazılarda ara"
              aria-label="Yazılarda ara"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle" className="tag-clear">
                ×
              </button>
            ) : null}
          </label>
          {suggestions.length ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag-chip quiet"
                  aria-pressed={tag.toLocaleLowerCase("tr-TR") === t.toLocaleLowerCase("tr-TR")}
                  onClick={() => setTag((cur) => (cur.toLocaleLowerCase("tr-TR") === t.toLocaleLowerCase("tr-TR") ? "" : t))}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasAny ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          Henüz yazı yok. Yazdıkların bugünün altına eklenir, bu cihazda saklanır.
        </p>
      ) : searching && groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Eşleşen yazı bulunamadı.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-9">
          {shown.map((g) => {
            const label = groupLabel(g.date, today);
            const isToday = g.date === today;
            const open = isToday || searching || openDays.has(g.date);
            return (
              <section key={g.date}>
                <GroupHead primary={label.primary} secondary={label.secondary} total={g.items.length + " yazı"} />
                {!isToday && !searching && g.items.length > 0 ? (
                  <DayToggle count={g.items.length} open={open} onToggle={() => toggleDay(g.date)} />
                ) : null}
                {g.items.length === 0 ? (
                  <p className="py-3 text-sm text-[var(--muted)]">Bugün henüz yazı yok.</p>
                ) : open ? (
                  <ul>
                    {g.items.map((e) =>
                      editing && editing.id === e.id ? (
                        <li key={e.id} className="py-3">
                          <Composer
                            autoFocus
                            value={editing.value}
                            onChange={(value) => setEditing({ id: e.id, value })}
                            onSubmit={saveEdit}
                            onCancel={() => setEditing(null)}
                            suggestions={suggestions}
                            submitLabel="Güncelle"
                          />
                        </li>
                      ) : (
                        <EntryRow
                          key={e.id}
                          entry={e}
                          onEdit={startEdit}
                          onRemove={remove}
                          onTag={(t) => {
                            setTag(t);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          reveal={!isToday}
                        />
                      )
                    )}
                  </ul>
                ) : null}
              </section>
            );
          })}
          {groups.length > dayLimit ? (
            <div className="flex justify-center">
              <button type="button" onClick={() => setDayLimit((n) => n + FIRST_PAGE_DAYS)} className="btn btn-ghost">
                Daha eski günler
              </button>
            </div>
          ) : null}
        </div>
      )}

      {notice ? (
        <div className="toast" role="status">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
