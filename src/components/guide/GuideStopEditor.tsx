import { useMemo, useRef, useState } from "react";
import type { LeafNote } from "../../types/leafNote";
import { getRoomById } from "../../data/roomConfig";

interface GuideStopEditorProps {
  noteIds: string[];
  notes: LeafNote[];
  onChange: (noteIds: string[]) => void;
  minStops?: number;
}

function moveItem(items: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function GuideStopEditor({
  noteIds,
  notes,
  onChange,
  minStops = 3,
}: GuideStopEditorProps) {
  const [insertNoteId, setInsertNoteId] = useState("");
  const [insertAt, setInsertAt] = useState(noteIds.length);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const availableNotes = notes.filter(
    (note) => note.status === "active" && !noteIds.includes(note.id)
  );

  const reorder = (from: number, to: number) => {
    const next = moveItem(noteIds, from, to);
    if (next !== noteIds) onChange(next);
    dragIndexRef.current = to;
    setDraggingIndex(to);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const from = dragIndexRef.current;
    if (from == null) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-guide-stop-index]");
    if (!target) return;
    const to = Number(target.dataset.guideStopIndex);
    if (Number.isInteger(to) && to !== from) reorder(from, to);
  };

  const endDrag = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
  };

  return (
    <div className="guide-stop-editor">
      <ol
        className="guide-stop-editor-list"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {noteIds.map((noteId, index) => {
          const note = byId.get(noteId);
          if (!note) return null;
          const room = getRoomById(note.floorId, note.roomId);
          return (
            <li
              key={noteId}
              data-guide-stop-index={index}
              className={
                draggingIndex === index ? "guide-stop-editor-item--dragging" : ""
              }
            >
              <span
                className="guide-stop-drag-handle"
                title="拖动调整顺序"
                onPointerDown={(event) => {
                  event.preventDefault();
                  dragIndexRef.current = index;
                  setDraggingIndex(index);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              >
                ☰
              </span>
              <span className="guide-route-index">{index + 1}</span>
              <span className="guide-stop-editor-content">
                <strong>
                  [{note.floorId}] {room?.label ?? note.roomId}
                </strong>
                <small>{note.text.slice(0, 55)}</small>
              </span>
              <span className="guide-stop-editor-actions">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(noteIds, index, index - 1))}
                  aria-label="上移"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={index === noteIds.length - 1}
                  onClick={() => onChange(moveItem(noteIds, index, index + 1))}
                  aria-label="下移"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  disabled={noteIds.length <= minStops}
                  onClick={() =>
                    onChange(noteIds.filter((candidate) => candidate !== noteId))
                  }
                >
                  删除
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {noteIds.length < 8 && availableNotes.length > 0 && (
        <div className="guide-stop-insert">
          <label className="guide-field">
            <span>插入便签</span>
            <select
              value={insertNoteId}
              onChange={(event) => setInsertNoteId(event.target.value)}
            >
              <option value="">选择有效便签</option>
              {availableNotes.map((note) => {
                const room = getRoomById(note.floorId, note.roomId);
                return (
                  <option key={note.id} value={note.id}>
                    [{note.floorId}] {room?.label ?? note.roomId} ·{" "}
                    {note.text.slice(0, 25)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="guide-field">
            <span>插入位置</span>
            <select
              value={Math.min(insertAt, noteIds.length)}
              onChange={(event) => setInsertAt(Number(event.target.value))}
            >
              {Array.from({ length: noteIds.length + 1 }, (_, index) => (
                <option key={index} value={index}>
                  {index === noteIds.length
                    ? "路线末尾"
                    : `第 ${index + 1} 站之前`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={!insertNoteId}
            onClick={() => {
              if (!insertNoteId) return;
              const next = [...noteIds];
              next.splice(Math.min(insertAt, noteIds.length), 0, insertNoteId);
              onChange(next);
              setInsertNoteId("");
              setInsertAt(next.length);
            }}
          >
            插入站点
          </button>
        </div>
      )}
    </div>
  );
}
