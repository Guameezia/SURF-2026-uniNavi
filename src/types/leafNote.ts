import type { BuildingId, FloorId } from "./indoor";

/** 便签主分类（由 tags 自动推断，也可手动覆盖） */
export type LeafNoteType =
  | "general"
  | "exam"
  | "facility"
  | "food"
  | "shortcut"
  | "event";

export type LeafNoteStatus = "active" | "resolved" | "disputed";

/** 便签地图图标 id（从图标库选择） */
export type LeafNoteIconId =
  | "leaf"
  | "exam"
  | "pencil"
  | "facility"
  | "printer"
  | "food"
  | "shortcut"
  | "arrow"
  | "warning"
  | "study"
  | "event";

/** 可选 Tag id，用于筛选与自动分类 */
export type LeafNoteTagId =
  | "exam"
  | "facility"
  | "food"
  | "shortcut"
  | "event"
  | "study"
  | "tip"
  | "warning";

export interface LeafNoteTagDef {
  id: LeafNoteTagId;
  label: string;
  type: LeafNoteType;
  color: string;
}

export interface LeafNote {
  id: string;
  building: BuildingId;
  floorId: FloorId;
  roomId: string;
  x: number;
  y: number;
  text: string;
  type: LeafNoteType;
  tags: LeafNoteTagId[];
  iconId: LeafNoteIconId;
  iconLocked: boolean;
  status: LeafNoteStatus;
  helpfulCount: number;
  /** 归属话题（MVP 创建时单选，默认 1 个） */
  topicId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type LeafNoteInput = Pick<
  LeafNote,
  "building" | "floorId" | "roomId" | "x" | "y" | "text"
> & {
  tags?: LeafNoteTagId[];
  type?: LeafNoteType;
  iconId?: LeafNoteIconId;
  iconLocked?: boolean;
  status?: LeafNoteStatus;
  topicId?: string | null;
};

export type LeafNoteUpdate = {
  text?: string;
  tags?: LeafNoteTagId[];
  type?: LeafNoteType;
  iconId?: LeafNoteIconId;
  iconLocked?: boolean;
  status?: LeafNoteStatus;
  topicId?: string | null;
};

export type LeafNoteSort = "newest" | "helpful";

export interface LeafNoteFilter {
  tagId?: LeafNoteTagId | "all";
  query?: string;
  status?: LeafNoteStatus | "all" | "active_only";
  sort?: LeafNoteSort;
}
