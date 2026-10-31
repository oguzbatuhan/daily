import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, HistoryIcon } from "./Icons.jsx";

// Small pill under the main content. The whole history stays hidden behind it.
export function HistoryButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line-strong)] pl-3 pr-3.5 text-[0.8125rem] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
    >
      <HistoryIcon />
      Geçmiş
      <span className="tabular rounded-full bg-[var(--accent-soft)] px-1.5 text-xs leading-5 text-[var(--accent)]">
        {count}
      </span>
    </button>
  );
}

const FOCUSABLE = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

// Bottom sheet on phones, side drawer on larger screens.
// toolbar: optional area under the title (search etc.) · children: the scrollable list
export function HistorySheet({ title = "Geçmiş", summary, toolbar, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const openedAt = useRef(Date.now());
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  const isMobile = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });

    const onKey = (e) => {
      if (document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      if (e.key === "Escape") {
        closeFn.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => !n.disabled && n.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    };
  }, []);

  const onHandleDown = (e) => {
    if (!isMobile()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { y0: e.clientY, dy: 0, id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
  };

  const onHandleMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let dy = e.clientY - d.y0;
    if (expanded) {
      // only pull down to shrink / close
      if (dy < 0) dy = 0;
    } else {
      // pull up expands (dampen), pull down closes
      if (dy < 0) dy = Math.max(dy, -120);
    }
    d.dy = dy;
    setOffset(dy);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    if (e && d.id !== e.pointerId) return;
    const dy = d.dy || 0;
    drag.current = null;
    setDragging(false);

    if (dy > 110) {
      setOffset(0);
      closeFn.current();
      return;
    }
    if (!expanded && dy < -50) {
      setExpanded(true);
      setOffset(0);
      return;
    }
    if (expanded && dy > 70) {
      setExpanded(false);
      setOffset(0);
      return;
    }
    setOffset(0);
  };

  const heightClass = expanded
    ? "h-[100dvh] rounded-none"
    : "h-[88dvh] rounded-t-[1.75rem]";

  return (
    <div
      className="history-backdrop fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/35 sm:items-stretch sm:justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && Date.now() - openedAt.current > 500 && closeFn.current()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "history-panel flex w-full max-w-lg flex-col overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-2xl sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[1.5rem] sm:border-r-0 " +
          heightClass
        }
        style={{
          transform: offset ? "translateY(" + offset + "px)" : undefined,
          transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.28s ease",
        }}
      >
        {/* Drag handle — mobile only */}
        <div
          className="sm:hidden touch-none select-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex cursor-grab flex-col items-center pt-2 active:cursor-grabbing" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-[var(--line-strong)]" />
            <p className="mt-1.5 text-[10px] text-[var(--muted)]">
              {expanded ? "Aşağı çek · kapat" : "Yukarı · tam ekran · aşağı · kapat"}
            </p>
          </div>
          <header className="flex items-start gap-3 px-5 pb-2 pt-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.0625rem] font-semibold tracking-tight">{title}</h2>
              {summary ? <p className="tabular mt-0.5 text-xs text-[var(--muted)]">{summary}</p> : null}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="icon-btn -mr-1.5 -mt-0.5 h-9 w-9 rounded-full hover:bg-[var(--hover)]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CloseIcon />
            </button>
          </header>
        </div>

        {/* Desktop header (no drag) */}
        <header className="hidden shrink-0 items-start gap-3 px-5 pb-2 pt-6 sm:flex">
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.0625rem] font-semibold tracking-tight">{title}</h2>
            {summary ? <p className="tabular mt-0.5 text-xs text-[var(--muted)]">{summary}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="icon-btn -mr-1.5 -mt-0.5 h-9 w-9 rounded-full hover:bg-[var(--hover)]"
          >
            <CloseIcon />
          </button>
        </header>

        {toolbar ? <div className="shrink-0 px-5 pb-3">{toolbar}</div> : null}

        <div
          data-history-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--line)] px-4 sm:px-5"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
export function MonthHead({ label, meta }) {
  return (
    <h3 className="sticky top-0 z-[1] -mx-5 flex items-baseline gap-2 bg-[var(--surface)] px-5 pb-1.5 pt-4 text-xs font-medium text-[var(--muted)]">
      <span>{label}</span>
      <span className="flex-1" aria-hidden="true"></span>
      <span className="tabular">{meta}</span>
    </h3>
  );
}

// One past day: a single row that opens to show that day's records
export function HistoryDay({ primary, secondary, meta, open, onToggle, children }) {
  return (
    <section className="border-b border-[var(--line)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 rounded-lg py-2.5 text-left text-sm hover:bg-[var(--hover)]"
      >
        <span className={"inline-flex shrink-0 text-[var(--muted)] transition-transform " + (open ? "" : "-rotate-90")}>
          <ChevronIcon dir="down" />
        </span>
        <span className="shrink-0 font-medium">{primary}</span>
        {secondary ? <span className="min-w-0 truncate text-[var(--muted)]">{secondary}</span> : null}
        <span className="flex-1" aria-hidden="true"></span>
        <span className="tabular shrink-0 font-medium">{meta}</span>
      </button>
      {open ? <div className="task-in pb-2 pl-6">{children}</div> : null}
    </section>
  );
}
