/**
 * 地图画布配置（与小程序 constants.js 保持一致）
 *
 * 替换像素 PNG 底图时，请同步更新：
 * - MAP_VIEWBOX：PNG 实际宽高（建议 32 的倍数）
 * - MAP_MODEL_OFFSET：若整体偏移有变则调整
 * - legacyIndoorData.ts 中 MAP_ASSET_EXTENSION → 'png'
 */
import type { FloorId } from "../types/indoor";

export interface MapViewBox {
  width: number;
  height: number;
}

export interface MapPoint2D {
  x: number;
  y: number;
}

export const MAP_VIEWBOX: Record<string, Record<FloorId, MapViewBox>> = {
  S: {
    "0F": { width: 760, height: 720 },
    "1F": { width: 560, height: 680 },
    "2F": { width: 520, height: 690 },
    "3F": { width: 522, height: 681 },
    "4F": { width: 522, height: 681 },
    "5F": { width: 521, height: 681 },
  },
};

export const MAP_MODEL_OFFSET: Record<string, Record<FloorId, MapPoint2D>> = {
  S: {
    "0F": { x: 81, y: 120 },
    "1F": { x: 140, y: 120 },
    "2F": { x: 160, y: 120 },
    "3F": { x: 160, y: 120 },
    "4F": { x: 160, y: 120 },
    "5F": { x: 160, y: 120 },
  },
};

const DEFAULT_VIEWBOX: MapViewBox = { width: 850, height: 950 };

/** 与 GitHub 初版一致的网页显示画布（底图拉伸到此尺寸） */
export const DISPLAY_CANVAS: MapViewBox = { width: 850, height: 950 };

export function getFloorViewBox(
  building: string,
  floorId: FloorId
): MapViewBox {
  return MAP_VIEWBOX[building]?.[floorId] ?? DEFAULT_VIEWBOX;
}

export function getFloorModelOffset(
  building: string,
  floorId: FloorId
): MapPoint2D {
  return MAP_MODEL_OFFSET[building]?.[floorId] ?? { x: 0, y: 0 };
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

/** model → 网页 850×950 画布坐标（与 GitHub 初版显示一致，POI 仍对齐） */
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

/** 网页画布坐标 → model（贴便签点击用） */
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
