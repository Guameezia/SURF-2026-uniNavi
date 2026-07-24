import { useMemo } from "react";
import type { LeafNote } from "../../types/leafNote";
import type { TimelineFilter } from "../../types/guide";
import { getRoomById } from "../../data/roomConfig";
import type { FloorId } from "../../types/indoor";

interface TimelineSheetProps {
  open: boolean;
  floorId: FloorId;
  roomId: string;
  notes: LeafNote[];
  filter: TimelineFilter;
  onSelectNote: (note: LeafNote) => void;
  onClose: () => void;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TimelineSheet({
  open,
  floorId,
  roomId,
  notes,
  filter,
  onSelectNote,
  onClose,
}: TimelineSheetProps) {
  const room = getRoomById(floorId, roomId);

  const filtered = useMemo(() => {
    const roomNotes = notes
      .filter((n) => n.floorId === floorId && n.roomId === roomId)
      .sort((a, b) => b.createdAt - a.createdAt);

    const today = startOfToday();
    const week = startOfWeek();

    return roomNotes.filter((n) => {
      if (filter === "today") return n.createdAt >= today;
      if (filter === "week") return n.createdAt >= week;
      return true;
    });
  }, [notes, floorId, roomId, filter]);

  if (!open) return null;

  return (
    <div className="leaf-note-sheet-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="leaf-note-sheet guide-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="地点时间流"
      >
        <div className="leaf-note-sheet-header">
          <div className="leaf-note-sheet-titles">
            <h3>时间流</h3>
            <span className="leaf-note-sheet-subtitle">
              {floorId} · {room?.label ?? roomId} ·{" "}
              {filter === "today" ? "今天" : filter === "week" ? "本周" : "全部"}
            </span>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="guide-empty">这个时间段还没有便签。</p>
        ) : (
          <ol className="timeline-list">
            {filtered.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className="timeline-item"
                  onClick={() => onSelectNote(note)}
                >
                  <span className="timeline-item-time">{formatTime(note.createdAt)}</span>
                  <span className="timeline-item-text">{note.text}</span>
                  <span className="timeline-item-meta">
                    ♥ {note.helpfulCount}
                    {note.status !== "active" ? ` · ${note.status}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
