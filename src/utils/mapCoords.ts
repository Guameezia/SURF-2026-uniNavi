import type { FloorId, MapPoint } from "../types/indoor";
import { FLOOR_MAP_CONFIG } from "../types/indoor";

/**
 * 叠加层整体平移微调（SVG 坐标，正值：X 向右，Y 向下）。
 * 偏移已由 FLOOR_MAP_CONFIG 精确对齐到 SVG 原点，这里只保留 1px 的整体右移微调，
 * 用于补偿 draw.io 描边带来的视觉偏差。所有点统一使用，不针对单个点位调整。
 */
export const POINT_NUDGE = { x: 1, y: 0 } as const;

export function getFloorMapConfig(floorId: FloorId) {
  return FLOOR_MAP_CONFIG[floorId];
}

/** 将 draw.io 页面坐标转换为楼层 SVG viewBox 坐标 */
export function toSvgPoint(floorId: FloorId, x: number, y: number): MapPoint {
  const { offsetX, offsetY } = getFloorMapConfig(floorId);
  return { x: x - offsetX, y: y - offsetY };
}
