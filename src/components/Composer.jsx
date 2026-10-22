import { useEffect, useRef, useState } from "react";
import { CloseIcon, ExpandIcon } from "./Icons.jsx";
import { MOODS, TAGS_PER_ENTRY, TAG_MAX, TITLE_MAX, cleanTag, isBlank, typingTag, wordCount } from "../lib/entries.js";

// Tags: type and press Enter / comma to add, tap a chip to remove. Suggestions are the user's own recent tags.
function TagEditor({ tags, onChange, suggestions }) {
  const [text, setText] = useState("");
  const full = tags.length >= TAGS_PER_ENTRY;

  const add = (raw) => {
    const t = cleanTag(raw);
    setText("");
    if (!t || full) return;
    if (tags.some((x) => x.toLocaleLowerCase("tr-TR") === t.toLocaleLowerCase("tr-TR"))) return;
    onChange([...tags, t]);
  };

  const left = suggestions.filter(
    (s) => !tags.some((x) => x.toLocaleLowerCase("tr-TR") === s.toLocaleLowerCase("tr-TR"))
  );

  return (
    <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          className="tag-chip"
          onClick={() => onChange(tags.filter((x) => x !== t))}
          aria-label={"Etiketi kaldır: " + t}
        >
          #{t} ×
        </button>
      ))}
      {!full ? (
        <input
          type="text"
          value={text}
          maxLength={TAG_MAX}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else setText(typingTag(v));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => add(text)}
          placeholder={tags.length ? "+ etiket" : "# etiket ekle"}
          aria-label="Etiket"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          className="tag-input h-8 w-24 min-w-0 bg-transparent text-[0.8125rem] outline-none placeholder:text-[var(--muted)]"
        />
      ) : null}
    </div>
    {!text && !full && left.length > 0 ? (
      <div className="scroll-row -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {left.slice(0, 6).map((s) => (
          <button key={s} type="button" className="tag-chip quiet shrink-0" onClick={() => add(s)}>
            {s}
          </button>
        ))}
      </div>
    ) : null}
    </div>
  );
}

function MoodPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Ruh hali">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          className="mood-btn"
          aria-pressed={value === m.value}
          aria-label={m.label}
          title={m.label}
          onClick={() => onChange(value === m.value ? 0 : m.value)}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}

// Writing surface used both for a new entry (draft, kept across reloads) and for editing a saved one.
// big: full-screen focus mode.
export default function Composer({
  value,
  onChange,
  onSubmit,
  onCancel,
  onExpand,
  suggestions = [],
  submitLabel = "Kaydet",
  big = false,
  autoFocus = false,
  placeholder = "Bugün aklında ne var?",
}) {
  const area = useRef(null);
  const blank = isBlank(value);
  const words = wordCount(value.body);

  useEffect(() => {
    if (autoFocus && area.current) {
      area.current.focus({ preventScroll: false });
      const len = area.current.value.length;
      area.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  // Ctrl/Cmd + Enter saves
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !blank) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape" && onCancel) onCancel();
  };

  // Focus mode follows the visible area so the on-screen keyboard never covers the save row
  const [vv, setVv] = useState(null);
  useEffect(() => {
    if (!big || !window.visualViewport) return;
    const vp = window.visualViewport;
    const update = () => setVv({ h: vp.height, top: vp.offsetTop });
    update();
    vp.addEventListener("resize", update);
    vp.addEventListener("scroll", update);
    return () => {
      vp.removeEventListener("resize", update);
      vp.removeEventListener("scroll", update);
    };
  }, [big]);

  const set = (patch) => onChange({ ...value, ...patch });

  const inner = (
    <>
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="title-input"
          value={value.title}
          maxLength={TITLE_MAX}
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              area.current?.focus();
            }
          }}
          placeholder="Başlık (isteğe bağlı)"
          aria-label="Başlık"
          enterKeyHint="next"
        />
        {onExpand && !big ? (
          <button type="button" onClick={onExpand} className="icon-btn -mr-1.5 shrink-0" aria-label="Odak modu" title="Odak modu">
            <ExpandIcon />
          </button>
        ) : null}
      </div>
      {/* Inline mode: the box grows through a hidden mirror of the text (CSS only), so the height is never reset
          from script. Resetting it made the page jump on phones and pushed the caret off screen. */}
      <div className={big ? "mt-2 flex flex-1 flex-col" : "grow-wrap mt-2"} data-value={big ? undefined : value.body + " "}>
        <textarea
          ref={area}
          className={"body-input " + (big ? "flex-1" : "grow-input")}
          value={value.body}
          onChange={(e) => set({ body: e.target.value })}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Yazı"
          enterKeyHint="enter"
        />
      </div>
      <div className="mt-3 flex flex-col gap-3 border-t border-[var(--line)] pt-3">
        <TagEditor tags={value.tags} onChange={(tags) => set({ tags })} suggestions={suggestions} />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <MoodPicker value={value.mood} onChange={(mood) => set({ mood })} />
          <span className="flex-1" aria-hidden="true"></span>
          {words > 0 ? <span className="tabular text-xs text-[var(--muted)]">{words} kelime</span> : null}
          {onCancel && !big ? (
            <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
              Vazgeç
            </button>
          ) : null}
          <button type="button" onClick={onSubmit} disabled={blank} className="btn btn-solid btn-sm ml-auto disabled:opacity-40">
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  );

  if (big) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Odak modu"
        className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-[var(--bg)]"
        style={{
          ...(vv ? { height: vv.h + "px", transform: "translateY(" + vv.top + "px)" } : null),
          paddingTop: "max(20px, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(20px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(20px, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">Odak modu</span>
            <button type="button" onClick={onCancel} className="icon-btn" aria-label="Kapat" title="Kapat (Esc)">
              <CloseIcon />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{inner}</div>
        </div>
      </div>
    );
  }

  return <section className="card p-4" aria-label="Yeni yazı">{inner}</section>;
}
