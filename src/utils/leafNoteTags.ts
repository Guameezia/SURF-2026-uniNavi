import type {
  LeafNote,
  LeafNoteTagDef,
  LeafNoteTagId,
  LeafNoteType,
  LeafNoteFilter,
} from "../types/leafNote";

export const LEAF_NOTE_TAGS: LeafNoteTagDef[] = [
  { id: "exam", label: "考试", type: "exam", color: "#1565c0" },
  { id: "facility", label: "设施", type: "facility", color: "#6a1b9a" },
  { id: "food", label: "食堂", type: "food", color: "#e65100" },
  { id: "shortcut", label: "捷径", type: "shortcut", color: "#00838f" },
  { id: "event", label: "活动", type: "event", color: "#c62828" },
  { id: "study", label: "自习", type: "general", color: "#2e7d32" },
  { id: "tip", label: "攻略", type: "general", color: "#558b2f" },
  { id: "warning", label: "注意", type: "general", color: "#f57f17" },
];

const TAG_BY_ID = new Map(LEAF_NOTE_TAGS.map((t) => [t.id, t]));

/** 关键词 → 自动打 Tag */
const AUTO_TAG_RULES: { tag: LeafNoteTagId; patterns: RegExp[] }[] = [
  {
    tag: "exam",
    patterns: [/考试/, /考场/, /踩点/, /上机/, /期末/, /exam/i],
  },
  {
    tag: "facility",
    patterns: [/插座/, /打印/, /饮水/, /充电/, /厕所/, /洗手间/, /wifi/i],
  },
  {
    tag: "food",
    patterns: [/食堂/, /餐厅/, /窗口/, /便当/, /还餐/, /充卡/, /canteen/i],
  },
  {
    tag: "shortcut",
    patterns: [/捷径/, /电梯/, /楼梯/, /shortcut/i],
  },
  {
    tag: "event",
    patterns: [/活动/, /宣讲/, /讲座/, /社团/, /茶歇/],
  },
  {
    tag: "study",
    patterns: [/自习/, /安静/, /噪音/, /摸鱼/],
  },
  {
    tag: "warning",
    patterns: [/坏了/, /故障/, /不要/, /避开/, /危险/],
  },
  {
    tag: "tip",
    patterns: [/建议/, /推荐/, /tips?/i, /攻略/],
  },
];

const TYPE_PRIORITY: LeafNoteType[] = [
  "exam",
  "facility",
  "food",
  "shortcut",
  "event",
  "general",
];

export function getTagDef(id: LeafNoteTagId): LeafNoteTagDef {
  return TAG_BY_ID.get(id)!;
}

export function inferTagsFromText(text: string): LeafNoteTagId[] {
  const found = new Set<LeafNoteTagId>();
  for (const rule of AUTO_TAG_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      found.add(rule.tag);
    }
  }
  if (found.size === 0) found.add("tip");
  return [...found];
}

export function mergeTags(
  manual: LeafNoteTagId[] | undefined,
  text: string
): LeafNoteTagId[] {
  const auto = inferTagsFromText(text);
  const merged = new Set<LeafNoteTagId>([...(manual ?? []), ...auto]);
  return [...merged];
}

export function inferTypeFromTags(tags: LeafNoteTagId[]): LeafNoteType {
  for (const type of TYPE_PRIORITY) {
    if (tags.some((id) => getTagDef(id).type === type)) {
      return type;
    }
  }
  return "general";
}

export function getTypeLabel(type: LeafNoteType): string {
  const labels: Record<LeafNoteType, string> = {
    general: "一般",
    exam: "考试攻略",
    facility: "设施",
    food: "食堂",
    shortcut: "捷径",
    event: "活动",
  };
  return labels[type];
}

export function getStatusLabel(status: LeafNote["status"]): string {
  const labels = {
    active: "有效",
    resolved: "已解决",
    disputed: "待核实",
  };
  return labels[status];
}

export function formatNoteTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function filterAndSortNotes(
  notes: LeafNote[],
  filter: LeafNoteFilter
): LeafNote[] {
  let result = [...notes];
  const tagId = filter.tagId ?? "all";
  const query = (filter.query ?? "").trim().toLowerCase();
  const status = filter.status ?? "active_only";
  const sort = filter.sort ?? "helpful";

  if (tagId !== "all") {
    result = result.filter((n) => n.tags.includes(tagId));
  }

  if (query) {
    result = result.filter((n) => {
      const tagLabels = n.tags.map((id) => getTagDef(id).label).join(" ");
      return (
        n.text.toLowerCase().includes(query) ||
        tagLabels.toLowerCase().includes(query) ||
        getTypeLabel(n.type).includes(query)
      );
    });
  }

  if (status === "active_only") {
    result = result.filter((n) => n.status === "active");
  } else if (status !== "all") {
    result = result.filter((n) => n.status === status);
  }

  result.sort((a, b) => {
    if (sort === "helpful") {
      return b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt;
  });

  return result;
}

/** 统计各 Tag 热度（便签 helpfulCount 之和 + 数量） */
export interface TagHeatStat {
  tagId: LeafNoteTagId;
  count: number;
  heat: number;
  helpfulSum: number;
}

export function computeTagHeat(notes: LeafNote[]): TagHeatStat[] {
  const stats = new Map<
    LeafNoteTagId,
    { count: number; heat: number; helpfulSum: number }
  >();

  for (const note of notes) {
    if (note.status !== "active") continue;
    for (const tagId of note.tags) {
      const cur = stats.get(tagId) ?? { count: 0, heat: 0, helpfulSum: 0 };
      cur.count += 1;
      cur.helpfulSum += note.helpfulCount;
      cur.heat += note.helpfulCount + 1;
      stats.set(tagId, cur);
    }
  }

  return LEAF_NOTE_TAGS.map((t) => ({
    tagId: t.id,
    count: stats.get(t.id)?.count ?? 0,
    heat: stats.get(t.id)?.heat ?? 0,
    helpfulSum: stats.get(t.id)?.helpfulSum ?? 0,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.heat - a.heat || b.helpfulSum - a.helpfulSum);
}

/** 无热度时随机展示 count 个 Tag（可传入 seed 保持稳定） */
export function pickRandomDisplayTags(
  seed: number,
  count = 7 + (Math.abs(seed) % 2)
): TagHeatStat[] {
  const items = [...LEAF_NOTE_TAGS];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.abs((seed + i * 2654435761) % (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, count).map((t) => ({
    tagId: t.id,
    count: 0,
    heat: 0,
    helpfulSum: 0,
  }));
}

const CLOUD_TAG_TARGET = 7;

/** 构建 Tag 云：有热度取 Top N，不足则随机补齐；无热度随机 7–8 个 */
export function buildTagCloud(
  tagHeatList: TagHeatStat[],
  seed: number
): { tags: TagHeatStat[]; hiddenCount: number } {
  if (tagHeatList.length === 0) {
    const tags = pickRandomDisplayTags(seed);
    return { tags, hiddenCount: 0 };
  }

  const visible = tagHeatList.slice(0, CLOUD_TAG_TARGET);
  const usedIds = new Set(visible.map((t) => t.tagId));

  if (visible.length < CLOUD_TAG_TARGET) {
    const fillers = pickRandomDisplayTags(seed + 7919, CLOUD_TAG_TARGET - visible.length)
      .filter((t) => !usedIds.has(t.tagId));
    visible.push(...fillers.slice(0, CLOUD_TAG_TARGET - visible.length));
  }

  return {
    tags: visible,
    hiddenCount: Math.max(0, tagHeatList.length - CLOUD_TAG_TARGET),
  };
}
