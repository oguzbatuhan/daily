const base = { fill: "none", "aria-hidden": "true" };
const stroke = { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M3.5 5h11M7 5V3.5h4V5M5 5l.7 9h6.6L13 5" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function ChevronIcon({ dir = "down" }) {
  const d = {
    left: "M11 3.5L5.5 9l5.5 5.5",
    right: "M7 3.5L12.5 9 7 14.5",
    down: "M3.5 6.5L9 12l5.5-5.5",
  }[dir];
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d={d} strokeWidth="2" {...stroke} />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M2.5 6.5v-4h4M11.5 2.5h4v4M15.5 11.5v4h-4M6.5 15.5h-4v-4" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" {...base}>
      <path d="M5 5l12 12M17 5L5 17" strokeWidth="1.6" {...stroke} />
    </svg>
  );
}

export function CloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M5 14.5a3.25 3.25 0 01-.4-6.47A4.5 4.5 0 0113.2 7.3 3.6 3.6 0 0113 14.5H5z" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function RefreshIcon({ spinning = false }) {
  return (
    <svg className={spinning ? "animate-spin" : undefined} width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M14.5 9a5.5 5.5 0 11-1.6-3.9M14.5 3v3h-3" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M9 5.2v4.3M9 12.3v.1" strokeWidth="1.8" {...stroke} />
      <circle cx="9" cy="9" r="6.5" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function UnlinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M7.5 10.5l3-3M6.6 8.4L5 10a2.4 2.4 0 003.4 3.4L10 11.8M11.4 9.6L13 8a2.4 2.4 0 00-3.4-3.4L8 6.2M3 3l12 12" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <circle cx="8" cy="8" r="5" strokeWidth="1.5" {...stroke} />
      <path d="M12 12l3.5 3.5" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M11.5 3.5l3 3L6 15H3v-3l8.5-8.5z" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M9 2.5v8M5.5 7.5L9 11l3.5-3.5M3 14.5h12" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M9 11V3M5.5 6L9 2.5 12.5 6M3 14.5h12" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}

export function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M4.5 2.5h6l3 3v10h-9v-13zM10.5 2.5v3h3M6.5 9h5M6.5 12h5" strokeWidth="1.3" {...stroke} />
    </svg>
  );
}

// Shield with a check: the "backup" button in the header
export function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M9 2l5.5 2v4.5c0 3.2-2.3 5.8-5.5 7-3.2-1.2-5.5-3.8-5.5-7V4L9 2z" strokeWidth="1.4" {...stroke} />
      <path d="M6.5 9l2 2 3.5-3.5" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" {...base}>
      <path
        d="M9 16.2c-3.4 0-5.4-2.3-5.4-5 0-2 1-3.3 2-4.6.3 1.3.8 2 1.6 2.4C6.8 6.4 7.7 3.6 10 1.6c.4 2.7 2 4 3.3 5.6.8 1.1 1.1 2.4 1.1 4 0 2.7-2 5-5.4 5z"
        strokeWidth="1.3"
        {...stroke}
      />
      <path d="M9 14.2c-1.1 0-1.8-.8-1.8-1.7 0-1.1 1-1.7 1.4-2.6.4.9 2.2 1.5 2.2 2.6 0 .9-.7 1.7-1.8 1.7z" strokeWidth="1" {...stroke} />
    </svg>
  );
}

// Small shield: one weekly "streak protection". filled = still available, outline = used
export function ProtectionIcon({ filled = false }) {
  return (
    <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 1.8l5.6 2v4.6c0 3.6-2.3 6.1-5.6 7.8-3.3-1.7-5.6-4.2-5.6-7.8V3.8L9 1.8z"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.22 : 0}
        strokeWidth="1.4"
        {...stroke}
      />
      {filled ? <path d="M6.4 9l1.9 1.9 3.3-3.4" strokeWidth="1.4" {...stroke} /> : null}
    </svg>
  );
}

// Clock with a counter-clockwise arrow: the history button
export function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M3 9a6 6 0 101.9-4.4M3 3v3h3M9 5.8V9l2.2 1.4" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}
