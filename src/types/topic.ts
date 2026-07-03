import type { LeafNoteTagId } from "./leafNote";

/** 话题来源：官方 / 学生发起 / 便签升华 */
export type TopicSource = "official" | "student" | "elevated";

export type TopicStatus = "active" | "ended";

export interface Topic {
  id: string;
  title: string;
  subtitle?: string;
  source: TopicSource;
  status: TopicStatus;
  suggestedTags: LeafNoteTagId[];
  /** 升华来源便签（elevated / 部分 student） */
  originNoteId?: string;
  initiatorLabel?: string;
  createdAt: number;
  expiresAt?: number;
  /** 官方话题主位优先级，越大越优先 */
  priority?: number;
}

export type TopicNotificationKind = "heating" | "candidate";

export interface TopicNotification {
  id: string;
  kind: TopicNotificationKind;
  /** heating 时关联便签 */
  noteId?: string;
  /** candidate 时聚类 key：building|floor|room */
  clusterKey?: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface PendingTopicIntent {
  topicId: string;
  suggestedTags: LeafNoteTagId[];
}

export interface TopicCluster {
  clusterKey: string;
  building: string;
  floorId: string;
  roomId: string;
  noteIds: string[];
  totalLikes: number;
  topNoteId: string;
}

export interface TopicStats {
  noteCount: number;
  totalLikes: number;
  participantEstimate: number;
}
