import { useEffect, useRef, useState } from "react";
import type { TimelineFilter } from "../../types/guide";

const FILTERS: { id: TimelineFilter; label: string }[] = [
  { id: "today", label: "今天" },
  { id: "week", label: "本周" },
  { id: "all", label: "全部" },
];

interface TimelineFilterButtonProps {
  filter: TimelineFilter;
  onSelect: (filter: TimelineFilter) => void;
}

function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="timeline-funnel-icon"
    >
      <path
        d="M4 5.5h16l-6.2 7.4v5.6l-3.6 1.5v-7.1L4 5.5z"
        fill={active ? "#8d6e63" : "currentColor"}
        stroke={active ? "#6d4c41" : "currentColor"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimelineFilterButton({
  filter,
  onSelect,
}: TimelineFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeLabel = FILTERS.find((f) => f.id === filter)?.label ?? "全部";

  return (
    <div className="timeline-funnel" ref={rootRef}>
      <button
        type="button"
        className={`timeline-funnel-btn${open || filter !== "all" ? " timeline-funnel-btn--active" : ""}`}
        aria-label={`时间流筛选：${activeLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`时间流 · ${activeLabel}`}
        onClick={() => setOpen((v) => !v)}
      >
        <FunnelIcon active={open || filter !== "all"} />
      </button>

      {open && (
        <div className="timeline-funnel-menu" role="menu" aria-label="时间筛选">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={filter === item.id}
              className={`timeline-funnel-option${filter === item.id ? " timeline-funnel-option--active" : ""}`}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
