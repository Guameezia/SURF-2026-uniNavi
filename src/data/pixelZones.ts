/**
 * 像素风区域配置（model 坐标，与 mapConfig 一致）
 */

import type { FloorId } from "../types/indoor";

export interface PixelZoneDef {
  id: string;
  building: string;
  floorId: FloorId;
  label: string;
  modelX: number;
  modelY: number;
  modelWidth: number;
  modelHeight: number;
  /** 贴图路径，默认 /maps/zones/{id}.png */
  imageSrc?: string;
}

/**
 * 0F Tongfa 食堂 — 贴 AI 图，比例≈2.36（260×110）
 */
export const CANTEEN_ZONE_0F: PixelZoneDef = {
  id: "canteen_0F",
  building: "S",
  floorId: "0F",
  label: "Tongfa Canteen",
  modelX: 168,
  modelY: 168,
  modelWidth: 260,
  modelHeight: 110,
  imageSrc: "/maps/zones/canteen_0F.png",
};

export function getPixelZonesForFloor(
  building: string,
  floorId: FloorId
): PixelZoneDef[] {
  if (building === "S" && floorId === "0F") return [CANTEEN_ZONE_0F];
  return [];
}
