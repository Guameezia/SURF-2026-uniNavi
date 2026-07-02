import { useEffect, useState, type FormEvent } from "react";
import { LeafIcon } from "./LeafIcon";

export type LeafNoteSheetMode = "create" | "view" | "edit";

interface LeafNoteSheetProps {
  open: boolean;
  mode: LeafNoteSheetMode;
  roomLabel?: string;
  initialText?: string;
  onSave: (text: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onClose: () => void;
}

export function LeafNoteSheet({
  open,
  mode,
  roomLabel,
  initialText = "",
  onSave,
  onDelete,
  onEdit,
  onClose,
}: LeafNoteSheetProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  const title =
    mode === "create"
      ? "New Leaf Note"
      : mode === "view"
        ? "Leaf Note"
        : "Edit Note";

  return (
    <div
      className="leaf-note-sheet-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="leaf-note-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaf-note-sheet-title"
      >
        <div className="leaf-note-sheet-header">
          <LeafIcon size={22} />
          <div className="leaf-note-sheet-titles">
            <h3 id="leaf-note-sheet-title">{title}</h3>
            {roomLabel && (
              <span className="leaf-note-sheet-subtitle">{roomLabel}</span>
            )}
          </div>
        </div>

        {mode === "view" ? (
          <>
            <p className="leaf-note-view-text">{initialText}</p>
            <div className="leaf-note-sheet-actions">
              {onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  Delete
                </button>
              )}
              <div className="leaf-note-sheet-actions-right">
                {onEdit && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onEdit}
                  >
                    Edit
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写点什么… Leave a short note"
              rows={4}
              autoFocus
              maxLength={200}
              className="leaf-note-textarea"
            />
            <div className="leaf-note-sheet-actions">
              {mode === "edit" && onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  Delete
                </button>
              )}
              <div className="leaf-note-sheet-actions-right">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!text.trim()}
                >
                  Save Note
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
