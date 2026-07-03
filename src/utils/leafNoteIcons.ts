import type { LeafNoteIconId, LeafNoteTagId, LeafNoteType } from "../types/leafNote";
import { inferTypeFromTags } from "./leafNoteTags";

export interface LeafNoteIconDef {
  id: LeafNoteIconId;
  emoji: string;
  label: string;
  /** 关联 type，用于自动推断 */
  type?: LeafNoteType;
  /** 关联 tag */
  tag?: LeafNoteTagId;
}

/** 可选图标库（11 款） */
export const LEAF_NOTE_ICONS: LeafNoteIconDef[] = [
  { id: "leaf", emoji: "🍃", label: "便签", type: "general" },
  { id: "exam", emoji: "📋", label: "考试", type: "exam", tag: "exam" },
  { id: "pencil", emoji: "✏️", label: "踩点", type: "exam" },
  { id: "facility", emoji: "🔌", label: "设施", type: "facility", tag: "facility" },
  { id: "printer", emoji: "🖨️", label: "打印", type: "facility" },
  { id: "food", emoji: "🍽️", label: "食堂", type: "food", tag: "food" },
  { id: "shortcut", emoji: "🪜", label: "捷径", type: "shortcut", tag: "shortcut" },
  { id: "arrow", emoji: "➡️", label: "通道", type: "shortcut" },
  { id: "warning", emoji: "⚠️", label: "注意", tag: "warning" },
  { id: "study", emoji: "📖", label: "自习", tag: "study" },
  { id: "event", emoji: "📅", label: "活动", type: "event", tag: "event" },
];

const ICON_BY_ID = new Map(LEAF_NOTE_ICONS.map((i) => [i.id, i]));

const TAG_TO_ICON: Partial<Record<LeafNoteTagId, LeafNoteIconId>> = {
  exam: "exam",
  facility: "facility",
  food: "food",
  shortcut: "shortcut",
  event: "event",
  study: "study",
  warning: "warning",
  tip: "leaf",
};

const TYPE_TO_ICON: Record<LeafNoteType, LeafNoteIconId> = {
  general: "leaf",
  exam: "exam",
  facility: "facility",
  food: "food",
  shortcut: "shortcut",
  event: "event",
};

const TAG_ICON_PRIORITY: LeafNoteTagId[] = [
  "exam",
  "facility",
  "food",
  "shortcut",
  "event",
  "warning",
  "study",
  "tip",
];

export function getIconDef(id: LeafNoteIconId): LeafNoteIconDef {
  return ICON_BY_ID.get(id) ?? ICON_BY_ID.get("leaf")!;
}

export function getIconEmoji(id: LeafNoteIconId): string {
  return getIconDef(id).emoji;
}

/** 根据 tags 自动推断推荐图标 */
export function inferIconFromTags(tags: LeafNoteTagId[]): LeafNoteIconId {
  for (const tag of TAG_ICON_PRIORITY) {
    if (tags.includes(tag)) {
      return TAG_TO_ICON[tag] ?? "leaf";
    }
  }
  return TYPE_TO_ICON[inferTypeFromTags(tags)];
}

export function resolveNoteIcon(
  tags: LeafNoteTagId[],
  iconId?: LeafNoteIconId,
  iconLocked?: boolean
): LeafNoteIconId {
  if (iconLocked && iconId) return iconId;
  return iconId ?? inferIconFromTags(tags);
}
