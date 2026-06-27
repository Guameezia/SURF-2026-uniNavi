import type { OverviewRect } from "../types/room";

/** 小地图局部视口（SVG 坐标单位，zoom=1 时的默认大小） */
export const MINIMAP_LOCAL_VIEWPORT = {
  width: 280,
  height: Math.round(280 * (720 / 760)),
};

/** 小地图滚轮缩放范围（zoom=1 为默认局部视口） */
export const MINIMAP_ZOOM = {
  min: 0.55,
  max: 3.2,
  wheelFactor: 0.1,
};

export function clampMinimapZoom(zoom: number): number {
  return Math.min(MINIMAP_ZOOM.max, Math.max(MINIMAP_ZOOM.min, zoom));
}

export function viewportForMinimapZoom(zoom: number) {
  const z = clampMinimapZoom(zoom);
  return {
    width: MINIMAP_LOCAL_VIEWPORT.width / z,
    height: MINIMAP_LOCAL_VIEWPORT.height / z,
  };
}

/**
 * 以当前 room 为中心，截取周围局部区域（星露谷式小地图）
 */
export function computeLocalMinimapViewBox(
  floorWidth: number,
  floorHeight: number,
  roomRect: OverviewRect,
  viewport = MINIMAP_LOCAL_VIEWPORT
): { x: number; y: number; w: number; h: number } {
  const cx = roomRect.x + roomRect.w / 2;
  const cy = roomRect.y + roomRect.h / 2;
  const vw = Math.min(viewport.width, floorWidth);
  const vh = Math.min(viewport.height, floorHeight);

  let x = cx - vw / 2;
  let y = cy - vh / 2;

  if (vw < floorWidth) {
    x = Math.max(0, Math.min(x, floorWidth - vw));
  } else {
    x = 0;
  }

  if (vh < floorHeight) {
    y = Math.max(0, Math.min(y, floorHeight - vh));
  } else {
    y = 0;
  }

  return { x, y, w: vw, h: vh };
}

/** 在基准视口上叠加拖拽偏移，并限制在楼层范围内 */
export function shiftMinimapViewBox(
  base: { x: number; y: number; w: number; h: number },
  panX: number,
  panY: number,
  floorWidth: number,
  floorHeight: number
): { x: number; y: number; w: number; h: number } {
  let x = base.x + panX;
  let y = base.y + panY;
  x = Math.max(0, Math.min(x, floorWidth - base.w));
  y = Math.max(0, Math.min(y, floorHeight - base.h));
  return { x, y, w: base.w, h: base.h };
}
