import { useMemo } from "react";
import type {
  LeafNote,
  LeafNoteFilter,
  LeafNoteSort,
} from "../../types/leafNote";
import {
  LEAF_NOTE_TAGS,
  computeTagHeat,
  getStatusLabel,
  getTagDef,
  formatNoteTime,
} from "../../utils/leafNoteTags";
import { getIconEmoji } from "../../utils/leafNoteIcons";
import {
  LeafNoteIconPicker,
  type LeafNoteIconPickerProps,
} from "./LeafNoteIconPicker";
export interface LeafNotePanelFilter extends LeafNoteFilter {
  showResolved: boolean;
}

interface LeafNotePanelProps {
  notes: LeafNote[];
  filteredNotes: LeafNote[];
  filter: LeafNotePanelFilter;
  onFilterChange: (patch: Partial<LeafNotePanelFilter>) => void;
  onSelectNote: (note: LeafNote) => void;
  embedded?: boolean;
  iconPicker?: LeafNoteIconPickerProps;
}

export function LeafNotePanel({
  notes,
  filteredNotes,
  filter,
  onFilterChange,
  onSelectNote,
  embedded = false,
  iconPicker,
}: LeafNotePanelProps) {
  const tagHeat = useMemo(() => computeTagHeat(notes), [notes]);

  return (
    <aside
      className={`leaf-note-panel${embedded ? " leaf-note-panel--embedded" : ""}`}
      aria-label="便签列表"
    >
      {!embedded && (
        <div className="leaf-note-panel-header">
          <h4>便签攻略</h4>
          <span className="leaf-note-panel-count">{filteredNotes.length} 条</span>
        </div>
      )}
      {embedded && (
        <div className="leaf-note-panel-header leaf-note-panel-header--embedded">
          <span className="leaf-note-panel-count">本房间 {filteredNotes.length} 条便签</span>
        </div>
      )}

      {iconPicker && <LeafNoteIconPicker {...iconPicker} />}

      <input
        type="search"
        className="leaf-note-panel-search"
        placeholder="搜索 Tag 或内容…"
        value={filter.query ?? ""}
        onChange={(e) => onFilterChange({ query: e.target.value })}
        aria-label="搜索便签"
      />

      <div className="leaf-note-panel-toolbar">
        <select
          className="leaf-note-panel-sort"
          value={filter.sort ?? "helpful"}
          onChange={(e) =>
            onFilterChange({ sort: e.target.value as LeafNoteSort })
          }
          aria-label="排序方式"
        >
          <option value="helpful">按热度</option>
          <option value="newest">按最新</option>
        </select>
        <label className="leaf-note-panel-resolved-toggle">
          <input
            type="checkbox"
            checked={filter.showResolved}
            onChange={(e) => onFilterChange({ showResolved: e.target.checked })}
          />
          显示已解决
        </label>
      </div>

      <div className="leaf-note-panel-tags" role="group" aria-label="Tag 筛选">
        <button
          type="button"
          className={`leaf-note-panel-tag${filter.tagId === "all" || !filter.tagId ? " leaf-note-panel-tag--active" : ""}`}
          onClick={() => onFilterChange({ tagId: "all" })}
        >
          全部
        </button>
        {LEAF_NOTE_TAGS.map((def) => {
          const heat = tagHeat.find((h) => h.tagId === def.id);
          return (
            <button
              key={def.id}
              type="button"
              className={`leaf-note-panel-tag${filter.tagId === def.id ? " leaf-note-panel-tag--active" : ""}`}
              style={{ borderColor: def.color }}
              onClick={() => onFilterChange({ tagId: def.id })}
            >
              #{def.label}
              {heat ? ` ${heat.count}` : ""}
            </button>
          );
        })}
      </div>

      {tagHeat.length > 0 && (
        <div className="leaf-note-panel-heat">
          <span className="leaf-note-panel-heat-label">热门 Tag</span>
          {tagHeat.slice(0, 3).map((h) => (
            <button
              key={h.tagId}
              type="button"
              className="leaf-note-panel-heat-item"
              onClick={() => onFilterChange({ tagId: h.tagId })}
            >
              #{getTagDef(h.tagId).label} · {h.heat}
            </button>
          ))}
        </div>
      )}

      <ul className="leaf-note-panel-list">
        {filteredNotes.length === 0 ? (
          <li className="leaf-note-panel-empty">暂无匹配的便签</li>
        ) : (
          filteredNotes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className={`leaf-note-panel-item${note.status !== "active" ? " leaf-note-panel-item--muted" : ""}`}
                onClick={() => onSelectNote(note)}
              >
                <div className="leaf-note-panel-item-head">
                  <span className="leaf-note-panel-item-icon" aria-hidden>
                    {getIconEmoji(note.iconId)}
                  </span>
                  <div className="leaf-note-panel-item-tags">
                  {note.tags.slice(0, 3).map((id) => (
                    <span
                      key={id}
                      className="leaf-note-panel-item-tag"
                      style={{ color: getTagDef(id).color }}
                    >
                      #{getTagDef(id).label}
                    </span>
                  ))}
                  </div>
                </div>
                <p className="leaf-note-panel-item-text">{note.text}</p>
                <div className="leaf-note-panel-item-meta">
                  <span>{getStatusLabel(note.status)}</span>
                  <span>有用 {note.helpfulCount}</span>
                  <span>{formatNoteTime(note.createdAt)}</span>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
