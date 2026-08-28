import { useMemo, useState } from "react";
import { useGuideStore } from "../../store/guideStore";
import { GUIDE_THEMES, type GuideTheme } from "../../types/guide";
import type { LeafNote } from "../../types/leafNote";

interface AddToCollectionSheetProps {
  open: boolean;
  note: LeafNote | null;
  onClose: () => void;
}

export function AddToCollectionSheet({
  open,
  note,
  onClose,
}: AddToCollectionSheetProps) {
  const collections = useGuideStore((s) => s.collections);
  const createCollection = useGuideStore((s) => s.createCollection);
  const addNoteToCollection = useGuideStore((s) => s.addNoteToCollection);

  const [name, setName] = useState("");
  const [theme, setTheme] = useState<GuideTheme>("custom");
  const [message, setMessage] = useState<string | null>(null);

  const containing = useMemo(() => {
    if (!note) return new Set<string>();
    return new Set(
      collections.filter((c) => c.noteIds.includes(note.id)).map((c) => c.id)
    );
  }, [collections, note]);

  if (!open || !note) return null;

  const handleAdd = (collectionId: string) => {
    addNoteToCollection(collectionId, note.id);
    setMessage("已加入收藏夹");
    window.setTimeout(() => {
      setMessage(null);
      onClose();
    }, 600);
  };

  const handleCreateAndAdd = () => {
    const collection = createCollection(name, theme);
    addNoteToCollection(collection.id, note.id);
    setName("");
    setMessage(`已创建并加入「${collection.name}」`);
    window.setTimeout(() => {
      setMessage(null);
      onClose();
    }, 700);
  };

  return (
    <div className="leaf-note-sheet-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="leaf-note-sheet guide-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="加入收藏夹"
      >
        <div className="leaf-note-sheet-header">
          <div className="leaf-note-sheet-titles">
            <h3>加入收藏夹</h3>
            <span className="leaf-note-sheet-subtitle">
              {note.text.slice(0, 36)}
              {note.text.length > 36 ? "…" : ""}
            </span>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>

        {message && <p className="guide-toast" role="status">{message}</p>}

        <section className="guide-section">
          <h4>已有收藏夹</h4>
          {collections.length === 0 ? (
            <p className="guide-empty">还没有收藏夹，先创建一个吧。</p>
          ) : (
            <ul className="guide-list">
              {collections.map((c) => {
                const themeDef = GUIDE_THEMES.find((t) => t.id === c.theme);
                const already = containing.has(c.id);
                return (
                  <li key={c.id} className="guide-list-item">
                    <div>
                      <strong>{c.name}</strong>
                      <span className="guide-meta">
                        {themeDef?.label ?? c.theme} · {c.noteIds.length} 条
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={already}
                      onClick={() => handleAdd(c.id)}
                    >
                      {already ? "已在其中" : "加入"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="guide-section">
          <h4>新建收藏夹</h4>
          <label className="guide-field">
            <span>名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：安静自习室"
              maxLength={40}
            />
          </label>
          <label className="guide-field">
            <span>主题</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as GuideTheme)}
            >
              {GUIDE_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateAndAdd}
          >
            创建并加入
          </button>
        </section>
      </div>
    </div>
  );
}
