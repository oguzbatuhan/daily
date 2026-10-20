import { useEffect, useRef, useState } from "react";
import { DownloadIcon, FileTextIcon, ShieldIcon, UploadIcon } from "./Icons.jsx";

const menuItem =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--hover)]";

// Header shield button: download a JSON backup, restore from one, or export plain text.
// Restoring never overwrites: it merges with what is already on this device (newest change wins).
export default function BackupMenu({ lastBackup, count, onExportJson, onExportText, onImport }) {
  const [menu, setMenu] = useState(false);
  const box = useRef(null);
  const file = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => box.current && !box.current.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const when = lastBackup
    ? "Son yedek: " +
      new Date(lastBackup).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) +
      " " +
      new Date(lastBackup).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "Henüz yedek alınmadı";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label="Yedekle ve dışa aktar"
        title="Yedek"
        onClick={() => setMenu((v) => !v)}
        className="icon-btn border border-[var(--line)] bg-[var(--surface)]"
      >
        <ShieldIcon />
      </button>
      {menu ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-xl"
        >
          <p className="px-3 pb-1.5 pt-2 text-xs text-[var(--muted)]">
            {count} yazı · {when}
          </p>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              onExportJson();
            }}
          >
            <DownloadIcon />
            Yedeği indir (.json)
          </button>
          <button type="button" role="menuitem" className={menuItem} onClick={() => file.current?.click()}>
            <UploadIcon />
            Yedekten geri yükle
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              onExportText();
            }}
          >
            <FileTextIcon />
            Metin olarak indir (.txt)
          </button>
        </div>
      ) : null}
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          setMenu(false);
          if (f) onImport(f);
        }}
      />
    </div>
  );
}
