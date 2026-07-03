import type { LeafNote } from "../types/leafNote";
import type { Topic, TopicCluster, TopicStats } from "../types/topic";

/** 24 小时内 ≥ 此赞数视为「正在升温」 */
export const HEATING_LIKE_THRESHOLD = 5;
export const HEATING_WINDOW_MS = 86400000;

/** 同 room 聚类：至少 N 条便签且总赞 ≥ M 可申请发起话题 */
export const CANDIDATE_MIN_NOTES = 3;
export const CANDIDATE_MIN_TOTAL_LIKES = 10;

export function clusterKeyForNote(note: LeafNote): string {
  return `${note.building}|${note.floorId}|${note.roomId}`;
}

export function isNoteHeating(note: LeafNote, now = Date.now()): boolean {
  if (note.status !== "active") return false;
  if (note.helpfulCount < HEATING_LIKE_THRESHOLD) return false;
  return now - note.createdAt <= HEATING_WINDOW_MS;
}

export function findCandidateClusters(notes: LeafNote[]): TopicCluster[] {
  const active = notes.filter((n) => n.status === "active");
  const groups = new Map<string, LeafNote[]>();

  for (const note of active) {
    const key = clusterKeyForNote(note);
    const list = groups.get(key) ?? [];
    list.push(note);
    groups.set(key, list);
  }

  const clusters: TopicCluster[] = [];

  for (const [clusterKey, group] of groups) {
    if (group.length < CANDIDATE_MIN_NOTES) continue;
    const totalLikes = group.reduce((s, n) => s + n.helpfulCount, 0);
    if (totalLikes < CANDIDATE_MIN_TOTAL_LIKES) continue;

    const sorted = [...group].sort(
      (a, b) =>
        b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt
    );
    const [building, floorId, roomId] = clusterKey.split("|");

    clusters.push({
      clusterKey,
      building,
      floorId,
      roomId,
      noteIds: group.map((n) => n.id),
      totalLikes,
      topNoteId: sorted[0].id,
    });
  }

  return clusters.sort((a, b) => b.totalLikes - a.totalLikes);
}

export function getClusterForNote(
  note: LeafNote,
  notes: LeafNote[]
): TopicCluster | null {
  const key = clusterKeyForNote(note);
  return findCandidateClusters(notes).find((c) => c.clusterKey === key) ?? null;
}

export function canPromoteCluster(
  cluster: TopicCluster,
  topics: Topic[],
  dismissedKeys: Set<string>
): boolean {
  if (dismissedKeys.has(cluster.clusterKey)) return false;
  const hasTopic = topics.some(
    (t) =>
      t.status === "active" &&
      t.originNoteId &&
      cluster.noteIds.includes(t.originNoteId)
  );
  if (hasTopic) return false;
  return true;
}

export function getTopicStats(topicId: string, notes: LeafNote[]): TopicStats {
  const linked = notes.filter(
    (n) => n.topicId === topicId && n.status === "active"
  );
  const totalLikes = linked.reduce((s, n) => s + n.helpfulCount, 0);
  return {
    noteCount: linked.length,
    totalLikes,
    participantEstimate: linked.length + totalLikes,
  };
}

export function sortNotesForTopic(notes: LeafNote[]): LeafNote[] {
  return [...notes].sort(
    (a, b) =>
      b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt
  );
}

export function getNotesForTopic(topicId: string, notes: LeafNote[]): LeafNote[] {
  return sortNotesForTopic(
    notes.filter((n) => n.topicId === topicId && n.status === "active")
  );
}

function studentTopicHeat(topic: Topic, notes: LeafNote[], now = Date.now()): number {
  const dayStart = now - HEATING_WINDOW_MS;
  if (topic.createdAt < dayStart) return 0;
  if (topic.source === "official") return 0;
  return getTopicStats(topic.id, notes).totalLikes;
}

/** 主位：官方 active 且 priority 最高；否则当日学生话题 helpful 总和最高 */
export function pickFeaturedTopics(
  topics: Topic[],
  notes: LeafNote[],
  now = Date.now()
): { main: Topic | null; subs: Topic[] } {
  const active = topics.filter((t) => t.status === "active");

  const official = [...active]
    .filter((t) => t.source === "official")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  let main: Topic | null = official[0] ?? null;

  if (!main) {
    const studentLike = active
      .filter((t) => t.source !== "official")
      .map((t) => ({ topic: t, heat: studentTopicHeat(t, notes, now) }))
      .filter((x) => x.heat > 0)
      .sort((a, b) => b.heat - a.heat);
    main = studentLike[0]?.topic ?? active[0] ?? null;
  }

  const subs = active
    .filter((t) => t.id !== main?.id)
    .sort((a, b) => {
      const heatA =
        a.source === "official"
          ? (a.priority ?? 0)
          : studentTopicHeat(a, notes, now);
      const heatB =
        b.source === "official"
          ? (b.priority ?? 0)
          : studentTopicHeat(b, notes, now);
      return heatB - heatA;
    })
    .slice(0, 3);

  return { main, subs };
}

export function getTopicSourceLabel(source: Topic["source"]): string {
  switch (source) {
    case "official":
      return "官方";
    case "student":
      return "学生";
    case "elevated":
      return "便签升华";
  }
}

export function getTopicSourceEmoji(source: Topic["source"]): string {
  switch (source) {
    case "official":
      return "🔵";
    case "student":
      return "🟢";
    case "elevated":
      return "🍃";
  }
}

export function defaultTitleFromNote(text: string, roomId: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 28) return trimmed;
  return `${roomId}：${trimmed.slice(0, 24)}…`;
}

export function getNoteAuthorLabel(noteId: string): string {
  const suffix = noteId.replace(/-/g, "").slice(-4);
  return `旅人${suffix}`;
}
