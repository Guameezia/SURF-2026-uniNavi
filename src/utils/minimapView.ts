import type { OverviewRect } from "../types/room";

export const MINIMAP_LOCAL_VIEWPORT = {
  width: 280,
  height: Math.round(280 * (720 / 760)),
};

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
