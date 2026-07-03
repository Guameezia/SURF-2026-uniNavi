import type { LeafNoteIconId } from "../../types/leafNote";
import {
  LEAF_NOTE_ICONS,
  getIconDef,
  getIconEmoji,
} from "../../utils/leafNoteIcons";

export interface LeafNoteIconPickerProps {
  value: LeafNoteIconId;
  suggestedId: LeafNoteIconId;
  locked: boolean;
  onChange: (id: LeafNoteIconId) => void;
}

export function LeafNoteIconPicker({
  value,
  suggestedId,
  locked,
  onChange,
}: LeafNoteIconPickerProps) {
  return (
    <div className="leaf-note-icon-picker" role="group" aria-label="便签图标">
      <div className="leaf-note-icon-picker-header">
        <span className="leaf-note-icon-picker-label">便签图标</span>
        {!locked && value !== suggestedId && (
          <button
            type="button"
            className="leaf-note-icon-picker-suggest"
            onClick={() => onChange(suggestedId)}
          >
            使用推荐 {getIconEmoji(suggestedId)}
          </button>
        )}
        {locked && (
          <span className="leaf-note-icon-picker-hint">已手动选择</span>
        )}
      </div>
      <div className="leaf-note-icon-picker-grid">
        {LEAF_NOTE_ICONS.map((def) => {
          const active = value === def.id;
          return (
            <button
              key={def.id}
              type="button"
              className={`leaf-note-icon-picker-btn${active ? " leaf-note-icon-picker-btn--active" : ""}`}
              title={def.label}
              aria-label={def.label}
              aria-pressed={active}
              onClick={() => onChange(def.id)}
            >
              <span className="leaf-note-icon-picker-emoji">{def.emoji}</span>
              <span className="leaf-note-icon-picker-name">{def.label}</span>
            </button>
          );
        })}
      </div>
      <p className="leaf-note-icon-picker-auto">
        当前：{getIconDef(value).emoji} {getIconDef(value).label}
        {!locked && " · 随 Tag 自动匹配"}
      </p>
    </div>
  );
}

export function NoteIconBadge({
  iconId,
  size = 20,
}: {
  iconId: LeafNoteIconId;
  size?: number;
}) {
  return (
    <span
      className="note-icon-badge"
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden
    >
      {getIconEmoji(iconId)}
    </span>
  );
}
