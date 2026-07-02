/**
 * 从 public/maps/S_*F.svg（draw.io 导出）解析的区域矩形
 * 坐标系：SVG viewBox，与 Minimap 底图一致
 *
 * 重新生成：node scripts/parse-floor-svg.mjs 0F|1F
 */
import type { FloorId } from "../types/indoor";
import type { OverviewRect } from "../types/room";

export interface SvgZoneRect extends OverviewRect {
  /** 来源说明，便于对照 CAD */
  source?: string;
}

/** 以楼梯/电梯图标中心生成小地图选区 */
export function iconZoneRect(
  centerX: number,
  centerY: number,
  w = 44,
  h = 44
): OverviewRect {
  return {
    x: Math.round(centerX - w / 2),
    y: Math.round(centerY - h / 2),
    w,
    h,
  };
}

/** 0F — viewBox 760×720，model 偏移 (80, 120) */
export const ZONES_0F = {
  /** 浅灰细走廊条（#f5f5f5，h≤15） */
  corridors: {
    sa: { x: 119, y: 70, w: 440, h: 10 } satisfies OverviewRect,
    sb: { x: 120, y: 265, w: 440, h: 10 } satisfies OverviewRect,
    /** 西翼竖向灰走廊 #f5f5f5（x=99, w=20） */
    saWest: { x: 99, y: 10, w: 20, h: 190 } satisfies OverviewRect,
    sbWest: { x: 99, y: 200, w: 20, h: 80 } satisfies OverviewRect,
    /** 东翼竖向灰走廊 #f5f5f5（x=559, w=20） */
    saEast: { x: 559, y: 10, w: 20, h: 190 } satisfies OverviewRect,
    sbEast: { x: 559, y: 200, w: 20, h: 75 } satisfies OverviewRect,
    /** SD 西翼灰走廊 + 东西向灰走廊 */
    sdWest: { x: 139, y: 610, w: 20, h: 60 } satisfies OverviewRect,
    sdH: { x: 519, y: 630.5, w: 40, h: 10 } satisfies OverviewRect,
  },
  walkable: {
    entranceCorridor: { x: 159, y: 320, w: 120, h: 280 } satisfies OverviewRect,
    sbAtrium: { x: 279, y: 400, w: 240, h: 200 } satisfies OverviewRect,
    sdEastOpen: { x: 399, y: 600, w: 120, h: 80 } satisfies OverviewRect,
    /** SD 入口竖向灰走廊 */
    sdCorridorNarrow: { x: 159, y: 600, w: 10, h: 70 } satisfies OverviewRect,
  },
  rooms: {
    tongfaCanteen: { x: 119, y: 80, w: 250, h: 110 } satisfies OverviewRect,
    sa007: { x: 439, y: 100, w: 120, h: 90 } satisfies OverviewRect,
    sd085: { x: 169, y: 610, w: 220, h: 60 } satisfies OverviewRect,
  },
  /** 楼梯图标中心（mxgraph.signs.travel.upstairs，15×15） */
  stairCenters: {
    saWest: { x: 128, y: 58 },
    saEast: { x: 553, y: 58 },
    sbWest: { x: 128, y: 258 },
    sbEast: { x: 553, y: 258 },
    scWest: { x: 138, y: 458 },
    scEast: { x: 548, y: 458 },
    sdWest: { x: 133, y: 658 },
    sdEast: { x: 547, y: 658 },
  },
  /** 电梯图标簇中心（mxgraph.floorplan.elevator，13×13） */
  elevatorCenters: {
    saEast: { x: 553, y: 26 },
    sbWest: { x: 127, y: 230 },
    scEast: { x: 547, y: 429 },
    sdWest: { x: 133, y: 629 },
  },
  scCorridorH: { x: 129, y: 432, w: 390, h: 36 } satisfies OverviewRect,
  /** 楼梯/电梯小地图选区尺寸 */
  stairIconSize: { w: 20, h: 20 },
  elevIconSize: { w: 22, h: 22 },
} as const;

/** 1F — viewBox 560×680，model 偏移 (140, 120) */
export const ZONES_1F = {
  spine: { x: 220, y: 0, w: 120, h: 680 } satisfies OverviewRect,
  corridors: {
    westSa: { x: 0, y: 160, w: 220, h: 40 } satisfies OverviewRect,
    westSb: { x: 0, y: 280, w: 220, h: 40 } satisfies OverviewRect,
    westSd: { x: 0, y: 560, w: 220, h: 40 } satisfies OverviewRect,
    eastSa: { x: 340, y: 80, w: 220, h: 40 } satisfies OverviewRect,
    eastSb: { x: 340, y: 360, w: 220, h: 40 } satisfies OverviewRect,
    eastSc: { x: 340, y: 480, w: 220, h: 40 } satisfies OverviewRect,
  },
  rooms: {
    SA136: { x: 350, y: 8, w: 120, h: 67 },
    SA164: { x: 90, y: 7, w: 90, h: 40 },
    SA169: { x: 90, y: 70, w: 120, h: 80 },
    SB152: { x: 90, y: 208, w: 120, h: 67 },
    SB102: { x: 350, y: 130, w: 120, h: 67 },
    SB123: { x: 350, y: 286, w: 120, h: 67 },
    SB120: { x: 350, y: 197, w: 120, h: 43 },
    SC140: { x: 350, y: 406.5, w: 120, h: 67 },
    SC176: { x: 90, y: 332, w: 120, h: 67 },
    SC162: { x: 90, y: 399, w: 120, h: 43 },
    SC169: { x: 90, y: 483, w: 120, h: 67 },
    SD154: { x: 90, y: 606.5, w: 120, h: 67 },
    SD102: { x: 350, y: 529, w: 120, h: 61 },
    SD114: { x: 350, y: 590, w: 120, h: 30 },
    SD120: { x: 350, y: 620, w: 120, h: 30 },
  } satisfies Record<string, OverviewRect>,
  /** 楼梯图标中心（mxgraph.signs.travel.stairs，20×20） */
  stairCenters: {
    saWest: { x: 68, y: 57 },
    saEast: { x: 493, y: 56 },
    sbWest: { x: 68, y: 256 },
    sbEast: { x: 493, y: 254 },
    scWest: { x: 68, y: 435 },
    scEast: { x: 493, y: 450 },
    sdWest: { x: 68, y: 653 },
    sdEast: { x: 493, y: 663 },
  },
  /** 电梯图标簇中心（mxgraph.floorplan.elevator，13×13） */
  elevatorCenters: {
    saEast: { x: 494, y: 25 },
    sbWest: { x: 67, y: 227 },
    scEast: { x: 493, y: 420 },
    sdWest: { x: 67, y: 624 },
  },
  /** 洗手间图标包围框（男女厕成对） */
  toilets: {
    saWest: { x: 28, y: 5, w: 34, h: 27 },
    sbEast: { x: 488, y: 284, w: 14, h: 56 },
    scWest: { x: 59, y: 343, w: 14, h: 53 },
    sdEast: { x: 487, y: 539, w: 14, h: 52 },
  } satisfies Record<string, OverviewRect>,
  stairIconSize: { w: 20, h: 20 },
  elevIconSize: { w: 22, h: 22 },
} as const;

/** 各层竖井图标中心（导航图 model 坐标换算） */
export const VERTICAL_SHAFT_CENTERS: Record<
  FloorId,
  Partial<Record<string, { x: number; y: number }>>
> = {
  "0F": {
    "sa-stair-west": ZONES_0F.stairCenters.saWest,
    "sa-stair-east": ZONES_0F.stairCenters.saEast,
    "sa-elev-east": ZONES_0F.elevatorCenters.saEast,
    "sb-stair-west": ZONES_0F.stairCenters.sbWest,
    "sb-stair-east": ZONES_0F.stairCenters.sbEast,
    "sb-elev-west": ZONES_0F.elevatorCenters.sbWest,
    "sc-stair-west": ZONES_0F.stairCenters.scWest,
    "sc-stair-east": ZONES_0F.stairCenters.scEast,
    "sc-elev-east": ZONES_0F.elevatorCenters.scEast,
    "sd-stair-west": ZONES_0F.stairCenters.sdWest,
    "sd-stair-east": ZONES_0F.stairCenters.sdEast,
    "sd-elev-west": ZONES_0F.elevatorCenters.sdWest,
  },
  "1F": {
    "sa-stair-west": ZONES_1F.stairCenters.saWest,
    "sa-stair-east": ZONES_1F.stairCenters.saEast,
    "sa-elev-east": ZONES_1F.elevatorCenters.saEast,
    "sb-stair-west": ZONES_1F.stairCenters.sbWest,
    "sb-stair-east": ZONES_1F.stairCenters.sbEast,
    "sb-elev-west": ZONES_1F.elevatorCenters.sbWest,
    "sc-stair-west": ZONES_1F.stairCenters.scWest,
    "sc-stair-east": ZONES_1F.stairCenters.scEast,
    "sc-elev-east": ZONES_1F.elevatorCenters.scEast,
    "sd-stair-west": ZONES_1F.stairCenters.sdWest,
    "sd-stair-east": ZONES_1F.stairCenters.sdEast,
    "sd-elev-west": ZONES_1F.elevatorCenters.sdWest,
  },
  "2F": {
    "sa-stair-west": { x: 80, y: 45 },
    "sa-stair-east": { x: 432, y: 45 },
    "sa-elev-east": { x: 463, y: 30 },
    "sb-stair-west": { x: 78, y: 248 },
    "sb-stair-east": { x: 442, y: 248 },
    "sb-elev-west": { x: 58, y: 225 },
    "sc-stair-west": { x: 78, y: 449 },
    "sc-stair-east": { x: 442, y: 448 },
    "sc-elev-east": { x: 463, y: 423 },
    "sd-stair-west": { x: 78, y: 643 },
    "sd-stair-east": { x: 443, y: 648 },
    "sd-elev-west": { x: 57, y: 620 },
  },
  "3F": {
    "sa-stair-west": { x: 61, y: 44 },
    "sa-stair-east": { x: 432, y: 45 },
    "sa-elev-east": { x: 463, y: 30 },
    "sb-stair-west": { x: 77, y: 243 },
    "sb-stair-east": { x: 442, y: 243 },
    "sb-elev-west": { x: 57, y: 225 },
    "sc-stair-west": { x: 77, y: 443 },
    "sc-stair-east": { x: 442, y: 443 },
    "sc-elev-east": { x: 464, y: 418 },
    "sd-stair-west": { x: 78, y: 643 },
    "sd-stair-east": { x: 442, y: 643 },
    "sd-elev-west": { x: 57, y: 619 },
  },
  "4F": {
    "sa-stair-west": { x: 61, y: 44 },
    "sa-stair-east": { x: 433, y: 44 },
    "sa-elev-east": { x: 464, y: 29 },
    "sb-stair-west": { x: 77, y: 244 },
    "sb-stair-east": { x: 423, y: 253 },
    "sb-elev-west": { x: 57, y: 226 },
    "sc-stair-west": { x: 83, y: 443 },
    "sc-stair-east": { x: 442, y: 443 },
    "sc-elev-east": { x: 464, y: 418 },
    "sd-stair-west": { x: 77, y: 643 },
    "sd-stair-east": { x: 419, y: 643 },
    "sd-elev-west": { x: 56, y: 619 },
  },
  "5F": {
    "sa-stair-west": { x: 62, y: 43 },
    "sa-stair-east": { x: 433, y: 43 },
    "sa-elev-east": { x: 464, y: 28 },
    "sb-stair-west": { x: 78, y: 243 },
    "sb-stair-east": { x: 423, y: 253 },
    "sb-elev-west": { x: 57, y: 226 },
    "sc-stair-west": { x: 80, y: 443 },
    "sc-stair-east": { x: 448, y: 443 },
    "sc-elev-east": { x: 464, y: 418 },
    "sd-stair-west": { x: 80, y: 643 },
    "sd-stair-east": { x: 418, y: 643 },
    "sd-elev-west": { x: 56, y: 619 },
  },
};

export function getSvgZones(floorId: FloorId) {
  return floorId === "1F" ? ZONES_1F : ZONES_0F;
}
