import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  LeafNote,
  LeafNoteIconId,
  LeafNoteStatus,
  LeafNoteTagId,
} from "../../types/leafNote";
import type { Topic } from "../../types/topic";
import {
  LEAF_NOTE_TAGS,
  formatNoteTime,
  getStatusLabel,
  getTagDef,
  getTypeLabel,
  inferTagsFromText,
  mergeTags,
} from "../../utils/leafNoteTags";
import { getIconDef, inferIconFromTags } from "../../utils/leafNoteIcons";
import { NoteIconBadge, LeafNoteIconPicker } from "./LeafNoteIconPicker";
import {
  LeafNotePanel,
  type LeafNotePanelFilter,
} from "./LeafNotePanel";

export type LeafNoteSheetMode = "create" | "view" | "edit";

export interface LeafNoteSavePayload {
  text: string;
  tags: LeafNoteTagId[];
  iconId: LeafNoteIconId;
  iconLocked: boolean;
}

export interface LeafNoteGuideProps {
  notes: LeafNote[];
  filteredNotes: LeafNote[];
  filter: LeafNotePanelFilter;
  onFilterChange: (patch: Partial<LeafNotePanelFilter>) => void;
  onSelectNote: (note: LeafNote) => void;
}

interface LeafNoteSheetProps {
  open: boolean;
  mode: LeafNoteSheetMode;
  roomLabel?: string;
  note?: LeafNote | null;
  initialText?: string;
  initialTags?: LeafNoteTagId[];
  initialIconId?: LeafNoteIconId;
  initialIconLocked?: boolean;
  hasLiked?: boolean;
  activeTopics?: Topic[];
  selectedTopicId?: string | null;
  onTopicChange?: (topicId: string | null) => void;
  linkedTopic?: Topic | null;
  isHeating?: boolean;
  canPromoteTopic?: boolean;
  promoteDefaultTitle?: string;
  onPromoteTopic?: (title: string) => void;
  guide?: LeafNoteGuideProps;
  onSave: (payload: LeafNoteSavePayload) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onMarkHelpful?: () => void;
  onSetStatus?: (status: LeafNoteStatus) => void;
  onClose: () => void;
}

export function LeafNoteSheet({
  open,
  mode,
  roomLabel,
  note,
  initialText = "",
  initialTags = [],
  initialIconId = "leaf",
  initialIconLocked = false,
  hasLiked = false,
  activeTopics = [],
  selectedTopicId = null,
  onTopicChange,
  linkedTopic,
  isHeating = false,
  canPromoteTopic = false,
  promoteDefaultTitle = "",
  onPromoteTopic,
  onSave,
  onDelete,
  onEdit,
  onMarkHelpful,
  onSetStatus,
  onClose,
  guide,
}: LeafNoteSheetProps) {
  const [text, setText] = useState(initialText);
  const [selectedTags, setSelectedTags] = useState<LeafNoteTagId[]>(initialTags);
  const [autoTags, setAutoTags] = useState<LeafNoteTagId[]>([]);
  const [selectedIconId, setSelectedIconId] =
    useState<LeafNoteIconId>(initialIconId);
  const [iconLocked, setIconLocked] = useState(initialIconLocked);
  const [promoteTitle, setPromoteTitle] = useState(promoteDefaultTitle);
  const [showPromoteForm, setShowPromoteForm] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setSelectedTags(initialTags);
      setAutoTags([]);
      setSelectedIconId(initialIconId);
      setIconLocked(initialIconLocked);
      setPromoteTitle(promoteDefaultTitle);
      setShowPromoteForm(false);
    }
  }, [open, initialText, initialTags, initialIconId, initialIconLocked, promoteDefaultTitle]);

  useEffect(() => {
    if (mode === "view" || !open) return;
    setAutoTags(inferTagsFromText(text));
  }, [text, mode, open]);

  const mergedTags = useMemo(
    () => mergeTags(selectedTags, text),
    [selectedTags, text]
  );

  const suggestedIconId = useMemo(
    () => inferIconFromTags(mergedTags),
    [mergedTags]
  );

  useEffect(() => {
    if (mode === "view" || !open || iconLocked) return;
    setSelectedIconId(suggestedIconId);
  }, [suggestedIconId, mode, open, iconLocked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleTag = (id: LeafNoteTagId) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleIconChange = (id: LeafNoteIconId) => {
    setSelectedIconId(id);
    setIconLocked(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave({
      text: trimmed,
      tags: selectedTags,
      iconId: selectedIconId,
      iconLocked,
    });
  };

  const title =
    mode === "create" && guide
      ? "便签攻略"
      : mode === "create"
        ? "新建便签"
        : mode === "view"
          ? "便签详情"
          : "编辑便签";

  const displayTags = note?.tags ?? selectedTags;
  const suggestedAuto = autoTags.filter((t) => !selectedTags.includes(t));
  const withGuide = mode === "create" && !!guide;
  const headerIconId = note?.iconId ?? selectedIconId;

  const guidePanel =
    withGuide && guide ? (
      <LeafNotePanel
        embedded
        notes={guide.notes}
        filteredNotes={guide.filteredNotes}
        filter={guide.filter}
        onFilterChange={guide.onFilterChange}
        onSelectNote={guide.onSelectNote}
        iconPicker={{
          value: selectedIconId,
          suggestedId: suggestedIconId,
          locked: iconLocked,
          onChange: handleIconChange,
        }}
      />
    ) : null;

  return (
    <div
      className="leaf-note-sheet-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className={`leaf-note-sheet${withGuide ? " leaf-note-sheet--with-guide" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaf-note-sheet-title"
      >
        <div className="leaf-note-sheet-header">
          <NoteIconBadge iconId={headerIconId} size={22} />
          <div className="leaf-note-sheet-titles">
            <h3 id="leaf-note-sheet-title">{title}</h3>
            {roomLabel && (
              <span className="leaf-note-sheet-subtitle">{roomLabel}</span>
            )}
          </div>
        </div>

        {withGuide && (
          <div className="leaf-note-sheet-guide">{guidePanel}</div>
        )}

        {mode === "view" && note ? (
          <>
            <div className="leaf-note-meta-row">
              <span className={`leaf-note-status leaf-note-status--${note.status}`}>
                {getStatusLabel(note.status)}
              </span>
              <span className="leaf-note-type-badge">{getTypeLabel(note.type)}</span>
              <span className="leaf-note-type-badge">
                {getIconDef(note.iconId).emoji} {getIconDef(note.iconId).label}
              </span>
            </div>

            {linkedTopic && (
              <div className="leaf-note-topic-row">
                <span className="leaf-note-topic-label">归属话题</span>
                <span className="leaf-note-topic-name">{linkedTopic.title}</span>
              </div>
            )}

            {isHeating && (
              <div className="leaf-note-heating-banner" role="status">
                🔥 正在升温 · 继续获赞可申请发起话题
              </div>
            )}

            {displayTags.length > 0 && (
              <div className="leaf-note-tags">
                {displayTags.map((id) => {
                  const def = getTagDef(id);
                  return (
                    <span
                      key={id}
                      className="leaf-note-tag"
                      style={{ borderColor: def.color, color: def.color }}
                    >
                      #{def.label}
                    </span>
                  );
                })}
              </div>
            )}

            <p className="leaf-note-view-text">{note.text}</p>

            <div className="leaf-note-time-row">
              <span>创建于 {formatNoteTime(note.createdAt)}</span>
              {note.updatedAt !== note.createdAt && (
                <span>更新于 {formatNoteTime(note.updatedAt)}</span>
              )}
            </div>

            <div className="leaf-note-helpful-row">
              <button
                type="button"
                className={`leaf-note-helpful-btn${hasLiked ? " leaf-note-helpful-btn--liked" : ""}`}
                onClick={onMarkHelpful}
                disabled={hasLiked}
              >
                {hasLiked ? "已标记有用" : "有用"} · {note.helpfulCount}
              </button>
            </div>

            {canPromoteTopic && onPromoteTopic && (
              <div className="leaf-note-promote-block">
                {!showPromoteForm ? (
                  <button
                    type="button"
                    className="btn-primary leaf-note-promote-btn"
                    onClick={() => setShowPromoteForm(true)}
                  >
                    申请发起话题
                  </button>
                ) : (
                  <div className="leaf-note-promote-form">
                    <label className="leaf-note-promote-label" htmlFor="promote-title">
                      话题标题
                    </label>
                    <input
                      id="promote-title"
                      className="leaf-note-promote-input"
                      value={promoteTitle}
                      onChange={(e) => setPromoteTitle(e.target.value)}
                      maxLength={60}
                    />
                    <div className="leaf-note-promote-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowPromoteForm(false)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!promoteTitle.trim()}
                        onClick={() => {
                          onPromoteTopic(promoteTitle.trim());
                          setShowPromoteForm(false);
                        }}
                      >
                        确认发起
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {note.status === "active" && onSetStatus && (
              <div className="leaf-note-status-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSetStatus("resolved")}
                >
                  标记为已解决
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSetStatus("disputed")}
                >
                  标记待核实
                </button>
              </div>
            )}

            {note.status !== "active" && onSetStatus && (
              <div className="leaf-note-status-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSetStatus("active")}
                >
                  恢复为有效
                </button>
              </div>
            )}

            <div className="leaf-note-sheet-actions">
              {onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  删除
                </button>
              )}
              <div className="leaf-note-sheet-actions-right">
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
          <form onSubmit={handleSubmit} className="leaf-note-sheet-compose">
            {withGuide && (
              <h4 className="leaf-note-compose-heading">写便签</h4>
            )}

            {!withGuide && (
              <LeafNoteIconPicker
                value={selectedIconId}
                suggestedId={suggestedIconId}
                locked={iconLocked}
                onChange={handleIconChange}
              />
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写点什么… 例如：第3排插座坏了"
              rows={4}
              autoFocus={!withGuide}
              maxLength={200}
              className="leaf-note-textarea"
            />

            {activeTopics.length > 0 && onTopicChange && (
              <div className="leaf-note-topic-picker">
                <span className="leaf-note-tag-picker-label">参与话题（可选）</span>
                <div className="leaf-note-topic-picker-chips">
                  <button
                    type="button"
                    className={`leaf-note-topic-chip${selectedTopicId === null ? " leaf-note-topic-chip--active" : ""}`}
                    onClick={() => onTopicChange(null)}
                  >
                    不选话题
                  </button>
                  {activeTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className={`leaf-note-topic-chip${selectedTopicId === topic.id ? " leaf-note-topic-chip--active" : ""}`}
                      onClick={() => onTopicChange(topic.id)}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="leaf-note-tag-picker">
              <span className="leaf-note-tag-picker-label">选择 Tag（可多选）</span>
              <div className="leaf-note-tag-picker-chips">
                {LEAF_NOTE_TAGS.map((def) => {
                  const active = selectedTags.includes(def.id);
                  return (
                    <button
                      key={def.id}
                      type="button"
                      className={`leaf-note-tag-chip${active ? " leaf-note-tag-chip--active" : ""}`}
                      style={
                        active
                          ? { backgroundColor: def.color, borderColor: def.color }
                          : { borderColor: def.color, color: def.color }
                      }
                      onClick={() => toggleTag(def.id)}
                    >
                      #{def.label}
                    </button>
                  );
                })}
              </div>
              {suggestedAuto.length > 0 && (
                <p className="leaf-note-auto-hint">
                  系统建议：
                  {suggestedAuto.map((id) => `#${getTagDef(id).label}`).join(" ")}
                </p>
              )}
            </div>

            <div className="leaf-note-sheet-actions">
              {mode === "edit" && onDelete && (
                <button type="button" className="btn-danger" onClick={onDelete}>
                  删除
                </button>
              )}
              <div className="leaf-note-sheet-actions-right">
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
