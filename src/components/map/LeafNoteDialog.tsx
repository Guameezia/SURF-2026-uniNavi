import { useEffect, useState, type FormEvent } from "react";
import { LeafIconMini } from "./LeafMarker";

export type LeafNoteDialogMode = "create" | "view" | "edit";

interface LeafNoteDialogProps {
  open: boolean;
  mode: LeafNoteDialogMode;
  initialText?: string;
  onSave: (text: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onClose: () => void;
}

export function LeafNoteDialog({
  open,
  mode,
  initialText = "",
  onSave,
  onDelete,
  onEdit,
  onClose,
}: LeafNoteDialogProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  const title =
    mode === "create" ? "新建便签" : mode === "view" ? "便签内容" : "编辑便签";

  return (
    <div className="leaf-note-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="leaf-note-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="leaf-note-dialog-header">
          <LeafIconMini size={22} />
          <h3>{title}</h3>
        </div>

        {mode === "view" ? (
          <>
            <p className="leaf-note-view-text">{initialText}</p>
            <div className="leaf-note-dialog-actions">
              {onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  删除
                </button>
              )}
              <div className="leaf-note-dialog-actions-right">
                {onEdit && (
                  <button type="button" className="btn-secondary" onClick={onEdit}>
                    编辑
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={onClose}>
                  关闭
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例如：14:30 回来"
              rows={4}
              autoFocus
              maxLength={200}
            />
            <div className="leaf-note-dialog-actions">
              {mode === "edit" && onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  删除
                </button>
              )}
              <div className="leaf-note-dialog-actions-right">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={!text.trim()}>
                  保存
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
