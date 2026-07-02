/**
 * 楼层几何配置 — 单一数据源
 * draw.io 页面坐标、SVG viewBox、model 偏移均由此文件维护
 */
import type { FloorId } from "../types/indoor";

export const BUILDING_ID = "S";

export interface FloorMapConfig {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface MapViewBox {
  width: number;
  height: number;
}

export interface MapPoint2D {
  x: number;
  y: number;
}

/** 各楼层 SVG viewBox 与 model 偏移（与 draw.io 导出一致） */
export const FLOOR_MAP_CONFIG: Record<FloorId, FloorMapConfig> = {
  "0F": { width: 760, height: 720, offsetX: 80, offsetY: 120 },
  "1F": { width: 560, height: 680, offsetX: 140, offsetY: 120 },
  "2F": { width: 520, height: 690, offsetX: 160, offsetY: 120 },
  "3F": { width: 522, height: 681, offsetX: 160, offsetY: 120 },
  "4F": { width: 522, height: 681, offsetX: 160, offsetY: 120 },
  "5F": { width: 521, height: 681, offsetX: 160, offsetY: 120 },
};

const DEFAULT_VIEWBOX: MapViewBox = { width: 850, height: 950 };

/** 与初版网页显示画布一致（底图拉伸尺寸） */
export const DISPLAY_CANVAS: MapViewBox = { width: 850, height: 950 };

export function getFloorMapConfig(floorId: FloorId): FloorMapConfig {
  return FLOOR_MAP_CONFIG[floorId];
}

export function getFloorViewBox(
  building: string,
  floorId: FloorId
): MapViewBox {
  if (building === BUILDING_ID) {
    const { width, height } = FLOOR_MAP_CONFIG[floorId];
    return { width, height };
  }
  return DEFAULT_VIEWBOX;
}

export function getFloorModelOffset(
  building: string,
  floorId: FloorId
): MapPoint2D {
  if (building === BUILDING_ID) {
    const { offsetX, offsetY } = FLOOR_MAP_CONFIG[floorId];
    return { x: offsetX, y: offsetY };
  }
  return { x: 0, y: 0 };
}

export function modelToSvg(
  x: number,
  y: number,
  building: string,
  floorId: FloorId
): MapPoint2D {
  const offset = getFloorModelOffset(building, floorId);
  return { x: x - offset.x, y: y - offset.y };
}

export function svgToModel(
  x: number,
  y: number,
  building: string,
  floorId: FloorId
): MapPoint2D {
  const offset = getFloorModelOffset(building, floorId);
  return { x: x + offset.x, y: y + offset.y };
}

export function modelToDisplay(
  x: number,
  y: number,
  building: string,
  floorId: FloorId
): MapPoint2D {
  const vb = getFloorViewBox(building, floorId);
  const svg = modelToSvg(x, y, building, floorId);
  return {
    x: svg.x * (DISPLAY_CANVAS.width / vb.width),
    y: svg.y * (DISPLAY_CANVAS.height / vb.height),
  };
}

export function displayToModel(
  x: number,
  y: number,
  building: string,
  floorId: FloorId
): MapPoint2D {
  const vb = getFloorViewBox(building, floorId);
  const svgX = x * (vb.width / DISPLAY_CANVAS.width);
  const svgY = y * (vb.height / DISPLAY_CANVAS.height);
  return svgToModel(svgX, svgY, building, floorId);
}
