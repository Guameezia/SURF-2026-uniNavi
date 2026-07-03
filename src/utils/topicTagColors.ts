import type { LeafNoteTagId } from "../types/leafNote";

/** 话题 Tag 胶囊随机配色（参考榜单风格） */
export const TOPIC_TAG_CHIP_COLORS = [
  "#e53935",
  "#ec407a",
  "#ab47bc",
  "#5c6bc0",
  "#29b6f6",
  "#26a69a",
  "#66bb6a",
  "#9ccc65",
  "#ffa726",
  "#ff7043",
  "#8d6e63",
  "#78909c",
];

export function getTopicTagChipColor(tagId: LeafNoteTagId, index: number): string {
  let hash = index * 17;
  for (let i = 0; i < tagId.length; i++) {
    hash = (hash * 31 + tagId.charCodeAt(i)) >>> 0;
  }
  return TOPIC_TAG_CHIP_COLORS[hash % TOPIC_TAG_CHIP_COLORS.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Tag 胶囊用随机 emoji（稳定 seed） */
export function getRandomTagEmoji(
  tagId: string,
  index: number,
  seed: number,
  emojis: string[]
): string {
  if (emojis.length === 0) return "💬";
  let hash = seed + index * 97;
  for (let i = 0; i < tagId.length; i++) {
    hash = (hash * 31 + tagId.charCodeAt(i)) >>> 0;
  }
  return emojis[hash % emojis.length];
}
