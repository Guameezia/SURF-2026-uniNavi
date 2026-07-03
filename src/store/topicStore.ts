import { create } from "zustand";
import { OFFICIAL_TOPIC_SEEDS } from "../data/topicSeeds";
import type { LeafNote } from "../types/leafNote";
import type { LeafNoteTagId } from "../types/leafNote";
import type {
  Topic,
  TopicNotification,
} from "../types/topic";
import {
  clusterKeyForNote,
  defaultTitleFromNote,
  findCandidateClusters,
  getNoteAuthorLabel,
  isNoteHeating,
} from "../utils/topicRules";

const TOPICS_KEY = "uni-navi-topics";
const NOTIFICATIONS_KEY = "uni-navi-topic-notifications";
const DISMISSED_KEY = "uni-navi-topic-dismissed";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function mergeOfficialSeeds(existing: Topic[]): Topic[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const seed of OFFICIAL_TOPIC_SEEDS) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, { ...seed });
    }
  }
  return [...byId.values()];
}

function loadTopics(): Topic[] {
  const stored = loadJson<Topic[]>(TOPICS_KEY, []);
  const merged = mergeOfficialSeeds(stored);
  saveTopics(merged);
  return merged;
}

function saveTopics(topics: Topic[]) {
  saveJson(TOPICS_KEY, topics);
}

function loadNotifications(): TopicNotification[] {
  return loadJson<TopicNotification[]>(NOTIFICATIONS_KEY, []);
}

function saveNotifications(items: TopicNotification[]) {
  saveJson(NOTIFICATIONS_KEY, items);
}

function loadDismissed(): Set<string> {
  const arr = loadJson<string[]>(DISMISSED_KEY, []);
  return new Set(arr);
}

function saveDismissed(set: Set<string>) {
  saveJson(DISMISSED_KEY, [...set]);
}

interface TopicState {
  topics: Topic[];
  notifications: TopicNotification[];
  dismissedClusterKeys: Set<string>;
  lastSyncedAt: number | null;

  refreshTopics: () => void;
  syncFromNotes: (notes: LeafNote[]) => void;

  getTopicById: (id: string) => Topic | undefined;
  getActiveTopics: () => Topic[];

  createTopicFromPromotion: (input: {
    title: string;
    subtitle?: string;
    originNote: LeafNote;
    suggestedTags?: LeafNoteTagId[];
  }) => Topic;

  markNotificationRead: (id: string) => void;
  dismissCluster: (clusterKey: string) => void;

  /** 后期可替换为 API 同步 */
  replaceTopicsFromPlatform: (topics: Topic[]) => void;
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: loadTopics(),
  notifications: loadNotifications(),
  dismissedClusterKeys: loadDismissed(),
  lastSyncedAt: null,

  refreshTopics: () => {
    set({
      topics: loadTopics(),
      notifications: loadNotifications(),
      dismissedClusterKeys: loadDismissed(),
      lastSyncedAt: Date.now(),
    });
  },

  getTopicById: (id) => get().topics.find((t) => t.id === id),

  getActiveTopics: () => get().topics.filter((t) => t.status === "active"),

  replaceTopicsFromPlatform: (topics) => {
    const merged = mergeOfficialSeeds(topics);
    saveTopics(merged);
    set({ topics: merged, lastSyncedAt: Date.now() });
  },

  syncFromNotes: (notes) => {
    const { notifications, dismissedClusterKeys, topics } = get();
    let nextNotifications = [...notifications];
    const existingNoteIds = new Set(
      nextNotifications.filter((n) => n.noteId).map((n) => n.noteId!)
    );
    const existingClusterKeys = new Set(
      nextNotifications.filter((n) => n.clusterKey).map((n) => n.clusterKey!)
    );

    for (const note of notes) {
      if (!isNoteHeating(note)) continue;
      if (existingNoteIds.has(note.id)) continue;
      if (note.topicId) continue;

      nextNotifications.unshift({
        id: createId("ntf"),
        kind: "heating",
        noteId: note.id,
        message: `你的便签「${note.text.trim().slice(0, 20)}${note.text.length > 20 ? "…" : ""}」正在升温（${note.helpfulCount} 赞）`,
        read: false,
        createdAt: Date.now(),
      });
      existingNoteIds.add(note.id);
    }

    const clusters = findCandidateClusters(notes);
    for (const cluster of clusters) {
      if (dismissedClusterKeys.has(cluster.clusterKey)) continue;
      if (existingClusterKeys.has(cluster.clusterKey)) continue;

      const promoted = topics.some(
        (t) =>
          t.status === "active" &&
          t.originNoteId &&
          cluster.noteIds.includes(t.originNoteId)
      );
      if (promoted) continue;

      nextNotifications.unshift({
        id: createId("ntf"),
        kind: "candidate",
        clusterKey: cluster.clusterKey,
        message: `${cluster.roomId} 已有 ${cluster.noteIds.length} 条便签、${cluster.totalLikes} 赞，可申请发起话题`,
        read: false,
        createdAt: Date.now(),
      });
      existingClusterKeys.add(cluster.clusterKey);
    }

    if (nextNotifications.length !== notifications.length) {
      saveNotifications(nextNotifications);
      set({ notifications: nextNotifications, lastSyncedAt: Date.now() });
    }
  },

  createTopicFromPromotion: ({ title, subtitle, originNote, suggestedTags }) => {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error("话题标题不能为空");
    }

    const topic: Topic = {
      id: createId("topic"),
      title: trimmed,
      subtitle,
      source: "elevated",
      status: "active",
      suggestedTags: suggestedTags ?? originNote.tags,
      originNoteId: originNote.id,
      initiatorLabel: getNoteAuthorLabel(originNote.id),
      createdAt: Date.now(),
    };

    const topics = [...get().topics, topic];
    saveTopics(topics);

    const clusterKey = clusterKeyForNote(originNote);
    const notifications = get()
      .notifications.map((n) =>
        n.clusterKey === clusterKey || n.noteId === originNote.id
          ? { ...n, read: true }
          : n
      );

    saveNotifications(notifications);
    set({ topics, notifications, lastSyncedAt: Date.now() });
    return topic;
  },

  markNotificationRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(notifications);
    set({ notifications });
  },

  dismissCluster: (clusterKey) => {
    const dismissedClusterKeys = new Set(get().dismissedClusterKeys);
    dismissedClusterKeys.add(clusterKey);
    saveDismissed(dismissedClusterKeys);

    const notifications = get().notifications.filter(
      (n) => n.clusterKey !== clusterKey
    );
    saveNotifications(notifications);
    set({ dismissedClusterKeys, notifications });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (
      e.key === TOPICS_KEY ||
      e.key === NOTIFICATIONS_KEY ||
      e.key === DISMISSED_KEY
    ) {
      useTopicStore.getState().refreshTopics();
    }
  });
}

export { defaultTitleFromNote };

// re-export for convenience — implementation lives in topicRules
