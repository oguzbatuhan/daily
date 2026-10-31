import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, HistoryIcon } from "./Icons.jsx";

// Small pill under the main content. The whole history stays hidden behind it.
export function HistoryButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] pl-3.5 pr-2 text-[0.8125rem] font-medium text-[var(--fg)] transition-colors active:bg-[var(--hover)] hover:border-[var(--line-strong)]"
    >
      <HistoryIcon />
      <span>Geçmiş</span>
      <span className="tabular rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
        {count}
      </span>
    </button>
  );
}

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
      if (dy < 0) dy = 0;
    } else if (dy < 0) {
      dy = Math.max(dy, -120);
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

  const heightClass = expanded ? "h-[100dvh] rounded-none" : "h-[90dvh] rounded-t-[1.5rem]";

  return (
    <div
      className="history-backdrop fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/50 sm:items-stretch sm:justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && Date.now() - openedAt.current > 500 && closeFn.current()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "history-panel flex w-full max-w-lg flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border-r-0 sm:bg-[var(--surface)] " +
          heightClass
        }
        style={{
          transform: offset ? "translateY(" + offset + "px)" : undefined,
          transition: dragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.28s ease",
        }}
      >
        {/* Mobile drag zone */}
        <div
          className="sm:hidden touch-none select-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
            <div className="h-1 w-9 rounded-full bg-[var(--line-strong)]" />
          </div>
          <header className="flex items-center gap-3 px-5 pb-3 pt-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              {summary ? <p className="tabular mt-0.5 text-[11px] text-[var(--muted)]">{summary}</p> : null}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--line)] active:bg-[var(--hover)]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CloseIcon />
            </button>
          </header>
        </div>

        {/* Desktop header */}
        <header className="hidden shrink-0 items-center gap-3 border-b border-[var(--line)] px-5 py-4 sm:flex">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {summary ? <p className="tabular mt-0.5 text-xs text-[var(--muted)]">{summary}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--fg)]"
          >
            <CloseIcon />
          </button>
        </header>

        {toolbar ? (
          <div className="shrink-0 border-b border-[var(--line)] px-5 py-3">{toolbar}</div>
        ) : null}

        <div
          data-history-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5"
          style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

export function MonthHead({ label, meta }) {
  return (
    <h3 className="sticky top-0 z-[1] -mx-4 flex items-baseline gap-2 bg-[var(--bg)]/95 px-4 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] backdrop-blur-md sm:-mx-5 sm:bg-[var(--surface)]/95 sm:px-5">
      <span>{label}</span>
      <span className="h-px min-w-[1rem] flex-1 bg-[var(--line)]" aria-hidden="true" />
      <span className="tabular font-medium normal-case tracking-normal">{meta}</span>
    </h3>
  );
}

export function HistoryDay({ primary, secondary, meta, open, onToggle, children }) {
  return (
    <section className="border-b border-[var(--line)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[3rem] w-full items-center gap-2.5 rounded-xl px-1 py-2.5 text-left text-sm transition-colors active:bg-[var(--hover)] hover:bg-[var(--hover)]"
      >
        <span
          className={
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--line)] transition-transform " +
            (open ? "rotate-0" : "-rotate-90")
          }
        >
          <ChevronIcon dir="down" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium text-[var(--fg)]">{primary}</span>
          {secondary ? (
            <span className="ml-2 text-[var(--muted)]">{secondary}</span>
          ) : null}
        </span>
        <span className="tabular shrink-0 text-xs text-[var(--muted)]">{meta}</span>
      </button>
      {open ? <div className="task-in pb-3 pl-9">{children}</div> : null}
    </section>
  );
}

