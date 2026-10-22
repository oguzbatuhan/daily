import { useEffect, useRef, useState } from "react";
import { ChevronIcon, EditIcon, TrashIcon } from "./Icons.jsx";
import { moodOf, wordCount } from "../lib/entries.js";

// Day heading: the day on the left, that day's entry count on the right
export function GroupHead({ primary, secondary, total }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-[var(--line-strong)] pb-2 text-sm">
      <span className="font-medium">{primary}</span>
      {secondary ? (
        <span className="text-[var(--muted)]">{secondary}</span>
      ) : null}
      <span className="flex-1" aria-hidden="true"></span>
      <span className="tabular font-medium">{total}</span>
    </h2>
  );
}

// Open/close button for a past day's entries (today is always open)
export function DayToggle({ count, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-1 flex min-h-11 w-full items-center gap-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
    >
      <span
        className={
          "inline-flex transition-transform " + (open ? "" : "-rotate-90")
        }
      >
        <ChevronIcon dir="down" />
      </span>
      Yazılar
      <span className="tabular">{count}</span>
    </button>
  );
}

const CONFIRM_MS = 5000;
const timeText = (ms) =>
  new Date(ms).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// A saved entry: tap to read it in full; edit and delete live in the opened view.
// reveal: play the soft fade-in (rows of past days that were just opened)
export function EntryRow({
  entry,
  onEdit,
  onRemove,
  onTag,
  reveal = false,
  forceOpen = false,
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef(null);
  const trashRef = useRef(null);
  const wasConfirming = useRef(false);

  const mood = moodOf(entry.mood);
  const expanded = open || forceOpen;
  const firstLine = entry.body.split("\n").find((l) => l.trim()) || "";

  // Confirmation: focus moves to the safe option; if untouched it cancels itself
  useEffect(() => {
    if (confirming) {
      wasConfirming.current = true;
      cancelRef.current?.focus();
      const id = setTimeout(() => setConfirming(false), CONFIRM_MS);
      return () => clearTimeout(id);
    }
    if (wasConfirming.current) {
      wasConfirming.current = false;
      trashRef.current?.focus();
    }
  }, [confirming]);

  const wrap = reveal ? "task-in" : "";

  return (
    <li className={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="-mx-2 flex min-h-[3.25rem] w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[var(--hover)]"
      >
        <span className="min-w-0 w-full">
          <span className="flex items-center gap-2">
            {entry.title ? (
              <span className="min-w-0 truncate font-medium">
                {entry.title}
              </span>
            ) : (
              <span
                className={"min-w-0 " + (expanded ? "sr-only" : "truncate")}
              >
                {firstLine || "Boş yazı"}
              </span>
            )}
            {mood ? (
              <span
                className="shrink-0 text-base leading-none"
                title={mood.label}
                aria-label={mood.label}
              >
                {mood.emoji}
              </span>
            ) : null}
          </span>
          {!expanded && entry.title && firstLine ? (
            <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">
              {firstLine}
            </span>
          ) : null}
          {!expanded &&
          !entry.title &&
          entry.body.trim().length > firstLine.length ? (
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {wordCount(entry.body)} kelime
            </span>
          ) : null}
        </span>
      </button>

      {expanded ? (
        <div className="task-in pb-2">
          <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-7">
            {entry.body}
          </p>
          {entry.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag-chip"
                  onClick={() => onTag(t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex min-h-[2.5rem] items-center gap-2">
            {confirming ? (
              <div
                role="alertdialog"
                aria-label="Silme onayı"
                className="flex w-full items-center gap-2"
              >
                <span className="min-w-0 flex-1 text-sm">Silinsin mi?</span>
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="btn btn-warn btn-sm"
                >
                  Sil
                </button>
              </div>
            ) : (
              <>
                <span className="tabular min-w-0 flex-1 text-xs text-[var(--muted)]">
                  {wordCount(entry.body)} kelime · {timeText(entry.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(entry.id)}
                  className="btn btn-ghost btn-sm gap-1.5"
                >
                  <EditIcon />
                  Düzenle
                </button>
                <button
                  ref={trashRef}
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="btn btn-sm min-w-0 gap-1.5 border-[var(--line-strong)] text-[var(--warn)] hover:bg-[var(--hover)]"
                >
                  <TrashIcon />
                  Sil
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
