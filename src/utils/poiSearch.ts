import type { POI } from "../types/indoor";

const MAX_SUGGESTIONS = 8;

/** 统计出现多次的 POI 名称（不区分大小写） */
export function getAmbiguousLabels(pois: POI[]): Set<string> {
  const counts = new Map<string, number>();
  for (const poi of pois) {
    const key = poi.label.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  );
}

/** 同名多楼层时附加楼层标识，如 SA169 · 1F */
export function formatPOIDisplay(
  poi: POI,
  ambiguousLabels: Set<string>
): string {
  if (ambiguousLabels.has(poi.label.toLowerCase())) {
    return `${poi.label} · ${poi.floorId}`;
  }
  return poi.label;
}

/**
 * 根据输入过滤 POI 建议（对齐 iOS NavigationViewModel）
 */
export function filterPOISuggestions(pois: POI[], query: string): POI[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return pois
    .filter((poi) => {
      const display = formatPOIDisplay(poi, getAmbiguousLabels(pois)).toLowerCase();
      return (
        poi.label.toLowerCase().includes(q) ||
        poi.id.toLowerCase().includes(q) ||
        display.includes(q) ||
        poi.floorId.toLowerCase().includes(q)
      );
    })
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * 解析输入为节点 ID（已选 ID > 精确匹配 > 模糊匹配）
 */
export function resolvePOINodeId(
  pois: POI[],
  query: string,
  selectedId: string
): string | null {
  if (selectedId) {
    const selected = pois.find((p) => p.id === selectedId);
    if (selected) return selected.id;
  }

  const trimmed = query.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  const exactId = pois.find((p) => p.id.toLowerCase() === lower);
  if (exactId) return exactId.id;

  const exactLabel = pois.find((p) => p.label.toLowerCase() === lower);
  if (exactLabel) return exactLabel.id;

  const ambiguous = getAmbiguousLabels(pois);
  const exactDisplay = pois.find(
    (p) => formatPOIDisplay(p, ambiguous).toLowerCase() === lower
  );
  if (exactDisplay) return exactDisplay.id;

  const fuzzy = pois.find(
    (p) =>
      p.label.toLowerCase().includes(lower) ||
      p.id.toLowerCase().includes(lower)
  );
  return fuzzy?.id ?? null;
}
