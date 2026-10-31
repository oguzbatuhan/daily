import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackupMenu from "./components/BackupMenu.jsx";
import Composer from "./components/Composer.jsx";
import { EntryRow, GroupHead } from "./components/EntryRow.jsx";
import { HistoryButton, HistoryDay, HistorySheet, MonthHead } from "./components/History.jsx";
import { FlameIcon, ProtectionIcon, SearchIcon } from "./components/Icons.jsx";
import SyncBar from "./components/SyncBar.jsx";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { groupLabel, longLabel, shiftIso, toIso, weekStartIso } from "./lib/dates.js";
import { groupByMonth } from "./lib/history.js";
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

const HISTORY_PAGE_DAYS = 30;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_DAYS);
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
  // Today stays on the main screen; every other day lives behind the history button.
  // While searching, the results cover all days (today included).
  const todayItems = useMemo(
    () => live.filter((e) => e.date === today).sort((a, b) => b.createdAt - a.createdAt),
    [live, today]
  );
  const pastDays = useMemo(() => groupByDay(live, null).filter((g) => g.date !== today), [live, today]);
  const groups = useMemo(
    () => groupByDay(filtered, null).filter((g) => searching || g.date !== today),
    [filtered, today, searching]
  );
  const todayCount = todayItems.length;
  const todayLabel = groupLabel(today, today);
  const { count: days, left: freezesLeft } = useMemo(
    () => streakInfo(entries, today, shiftIso, weekStartIso),
    [entries, today]
  );

  // In the history drawer only the newest day starts open. While searching, every result day is open
  // unless the user folds it ("collapsed").
  const [openDays, setOpenDays] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState(() => new Set());
  useEffect(() => setCollapsed(new Set()), [query, tag]);
  const flip = (set) => (date) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  const dayOpen = (date) => (searching ? !collapsed.has(date) : openDays.has(date));
  const toggleDay = (date) => (searching ? flip(setCollapsed)(date) : flip(setOpenDays)(date));
  const visibleDayDates = () => groups.slice(0, historyLimit).map((g) => g.date);
  const expandAllDays = () => {
    if (searching) setCollapsed(new Set());
    else setOpenDays(new Set(visibleDayDates()));
  };
  const collapseAllDays = () => {
    if (searching) setCollapsed(new Set(visibleDayDates()));
    else setOpenDays(new Set());
  };

  // Opening starts fresh (newest day open, first page); an optional tag opens it already filtered
  const openHistory = (withTag) => {
    setOpenDays(new Set(pastDays.length ? [pastDays[0].date] : []));
    setHistoryLimit(HISTORY_PAGE_DAYS);
    if (typeof withTag === "string") setTag(withTag);
    setHistoryOpen(true);
  };
  const closeHistory = () => {
    setHistoryOpen(false);
    setQuery("");
    setTag("");
    setEditing(null);
  };
  // Nothing left to show (e.g. the last past entry was deleted): close the drawer
  useEffect(() => {
    if (historyOpen && live.length === 0) setHistoryOpen(false);
  }, [historyOpen, live.length]);

  const months = useMemo(
    () => (historyOpen ? groupByMonth(groups.slice(0, historyLimit), today) : []),
    [historyOpen, groups, historyLimit, today]
  );

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

  // One entry: its row, or the inline editor while it is being edited (same in the main list and the drawer)
  const renderEntry = (e, onTag) =>
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
      <EntryRow key={e.id} entry={e} onEdit={startEdit} onRemove={remove} onTag={onTag} />
    );

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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="tabular inline-flex h-8 items-center rounded-full border border-[var(--line)] px-3 text-xs text-[var(--muted)]">
            {todayCount > 0 ? "Bugün " + todayCount + " yazı" : "Bugün henüz yazmadın"}
          </span>
          {days > 0 ? (
            <span
              className="tabular inline-flex h-8 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] pl-3 pr-3.5 text-xs font-medium text-[var(--fg)]"
              title={
                days +
                " gün üst üste yazdın. Seri koruması: bu hafta " +
                freezesLeft +
                "/" +
                FREEZES_PER_WEEK +
                " hakkın var; yazmadığın bir günde otomatik kullanılır, her pazartesi yenilenir."
              }
              aria-label={days + " gün seri, bu hafta " + freezesLeft + " koruma hakkı kaldı"}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[var(--accent)] [&>svg]:block">
                  <FlameIcon />
                </span>
                {days} gün
              </span>
              <span className="h-3 w-px bg-[var(--line-strong)]" aria-hidden="true"></span>
              <span className="inline-flex items-center gap-1.5" aria-hidden="true">
                {Array.from({ length: FREEZES_PER_WEEK }, (_, i) => (
                  <span
                    key={i}
                    className={
                      "[&>svg]:block " + (i < freezesLeft ? "text-[var(--accent)]" : "text-[var(--muted)] opacity-45")
                    }
                  >
                    <ProtectionIcon filled={i < freezesLeft} />
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span className="tabular inline-flex h-8 items-center px-1 text-xs text-[var(--muted)]">Seri yok</span>
          )}
        </div>
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

      {!hasAny ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          Henüz yazı yok. Yazdıkların bugünün altına eklenir, bu cihazda saklanır.
        </p>
      ) : (
        <div className="mt-8">
          <section>
            <GroupHead primary={todayLabel.primary} secondary={todayLabel.secondary} total={todayItems.length + " yazı"} />
            {todayItems.length === 0 ? (
              <p className="py-3 text-sm text-[var(--muted)]">Bugün henüz yazı yok.</p>
            ) : (
              <ul>{todayItems.map((e) => renderEntry(e, openHistory))}</ul>
            )}
          </section>
          {pastDays.length > 0 ? (
            <div className="mt-6 flex justify-center">
              <HistoryButton count={pastDays.length} onClick={() => openHistory()} />
            </div>
          ) : null}
        </div>
      )}

      {historyOpen ? (
        <HistorySheet
          summary={
            searching
              ? groups.reduce((n, g) => n + g.items.length, 0) + " yazı bulundu"
              : pastDays.length + " gün · " + pastDays.reduce((n, g) => n + g.items.length, 0) + " yazı"
          }
          onClose={closeHistory}
          toolbar={
            <div className="flex flex-col gap-2.5">
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
              <div className="flex flex-wrap items-center gap-1.5">
                {suggestions.length ? (
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
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
                ) : (
                  <span className="flex-1" aria-hidden="true" />
                )}
                {groups.length > 0 ? (
                  <div className="ml-auto flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={expandAllDays}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                    >
                      Aç
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllDays}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                    >
                      Kapat
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          }
        >
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              {searching ? "Eşleşen yazı bulunamadı." : "Geçmiş günlerde yazı yok."}
            </p>
          ) : null}
          {months.map((m) => (
            <div key={m.key}>
              <MonthHead label={m.label} meta={m.days.reduce((n, g) => n + g.items.length, 0) + " yazı"} />
              {m.days.map((g) => {
                const label = groupLabel(g.date, today);
                return (
                  <HistoryDay
                    key={g.date}
                    primary={label.primary}
                    secondary={label.secondary}
                    meta={g.items.length + " yazı"}
                    open={dayOpen(g.date)}
                    onToggle={() => toggleDay(g.date)}
                  >
                    <ul>{g.items.map((e) => renderEntry(e, setTag))}</ul>
                  </HistoryDay>
                );
              })}
            </div>
          ))}
          {groups.length > historyLimit ? (
            <div className="flex justify-center py-5">
              <button
                type="button"
                onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE_DAYS)}
                className="btn btn-ghost btn-sm"
              >
                Daha eski günler
              </button>
            </div>
          ) : null}
        </HistorySheet>
      ) : null}

      {notice ? (
        <div className="toast" role="status">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
