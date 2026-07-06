/**
 * 从 public/maps/S_*F.svg（draw.io 导出）解析的区域矩形
 * 坐标系：SVG viewBox，与 Minimap 底图一致
 *
 * 重新生成：node scripts/parse-floor-svg.mjs 0F|1F|2F|3F|4F|5F
 * 2F~5F 批量写回：node scripts/parse-floor-svg.mjs --write-upper
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
    /** SD 西翼灰走廊 */
    sdWest: { x: 139, y: 610, w: 20, h: 60 } satisfies OverviewRect,
  },
  walkable: {
    entranceCorridor: { x: 159, y: 320, w: 120, h: 280 } satisfies OverviewRect,
    scAtrium: { x: 279, y: 400, w: 240, h: 200 } satisfies OverviewRect,
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
  /** 楼梯/电梯小地图选区尺寸 */
  stairIconSize: { w: 20, h: 20 },
  elevIconSize: { w: 22, h: 22 },
} as const;

/** 1F — viewBox 560×680，model 偏移 (140, 120) */
export const ZONES_1F = {
  spine: { x: 220, y: 0, w: 120, h: 680 } satisfies OverviewRect,
  /**
   * 两翼竖向灰走廊 #f5f5f5（x≈30 西翼 / x≈500 东翼，w=30）
   * 这才是 SA/SB/SC/SD 各翼「走廊」本体（教室在其东侧/西侧开口）
   */
  wingCorridors: {
    westSa: { x: 30, y: 30, w: 30, h: 130 } satisfies OverviewRect,
    westSb: { x: 30, y: 200, w: 30, h: 80 } satisfies OverviewRect,
    westSc: { x: 30, y: 320, w: 30, h: 240 } satisfies OverviewRect,
    westSd: { x: 30, y: 600, w: 30, h: 75 } satisfies OverviewRect,
    eastSa: { x: 500, y: 5, w: 30, h: 75 } satisfies OverviewRect,
    eastSb: { x: 500, y: 120, w: 30, h: 240 } satisfies OverviewRect,
    eastSc: { x: 500, y: 400, w: 30, h: 80 } satisfies OverviewRect,
    eastSd: { x: 500, y: 520, w: 30, h: 150 } satisfies OverviewRect,
  },
  /** 块间竖向通道（两段灰走廊之间的无填充空隙，连接相邻翼楼） */
  passages: {
    westSaSb: { x: 30, y: 160, w: 30, h: 40 } satisfies OverviewRect,
    westSbSc: { x: 30, y: 280, w: 30, h: 40 } satisfies OverviewRect,
    westScSd: { x: 30, y: 560, w: 30, h: 40 } satisfies OverviewRect,
    eastSaSb: { x: 500, y: 80, w: 30, h: 40 } satisfies OverviewRect,
    eastSbSc: { x: 500, y: 360, w: 30, h: 40 } satisfies OverviewRect,
    eastScSd: { x: 500, y: 480, w: 30, h: 40 } satisfies OverviewRect,
  },
  /** 连中通道的白色横向走道 #fcfcfc（翼楼教室区 → 中通道） */
  spineBridges: {
    westSa: { x: 0, y: 160, w: 220, h: 40 } satisfies OverviewRect,
    westSb: { x: 0, y: 280, w: 220, h: 40 } satisfies OverviewRect,
    westSc: { x: 0, y: 560, w: 220, h: 40 } satisfies OverviewRect,
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

export interface UpperFloorBlockCorridors {
  sa: OverviewRect;
  sb: OverviewRect;
  sc: OverviewRect;
  sd: OverviewRect;
}

export interface UpperFloorZones {
  /** 教室矩形，key 为房间号标签（如 SA169），来自 CAD 标注文字 */
  rooms: Record<string, OverviewRect>;
  /** 西翼纵向走廊；4F/5F 无贯穿翼走廊时为 null */
  westCorridor: OverviewRect | null;
  /** 东翼纵向走廊；4F/5F 无贯穿翼走廊时为 null */
  eastCorridor: OverviewRect | null;
  /** SA/SB/SC/SD 东西向楼内走廊 */
  blockCorridors: UpperFloorBlockCorridors;
}

/**
 * 2F～5F — 从 S_2F~5F.svg 解析教室标签与走廊
 * 重新生成：node scripts/parse-floor-svg.mjs --write-upper
 */
/** @generated-upper-zones-start */
/** 2F～5F — 自动生成，勿手改；node scripts/parse-floor-svg.mjs --write-upper */
export const ZONES_2F: UpperFloorZones = {
  rooms: {
    SA169: { x: 70, y: 70, w: 120, h: 80 },
    SA221: { x: 490, y: 50, w: 25, h: 35 },
    SA231: { x: 430, y: 70, w: 40, h: 15 },
    SA236: { x: 339, y: 6, w: 100, h: 30 },
    SA238: { x: 300, y: 29, w: 20, h: 20 },
    SA240: { x: 280, y: 29, w: 20, h: 20 },
    SA242: { x: 260, y: 29, w: 20, h: 20 },
    SA244: { x: 240, y: 29, w: 20, h: 20 },
    SA246: { x: 220, y: 29, w: 20, h: 20 },
    SA248: { x: 200, y: 29, w: 20, h: 20 },
    SA254: { x: 70, y: 5, w: 120, h: 30 },
    SA264: { x: 5, y: 5, w: 65, h: 30 },
    SA273: { x: 5, y: 35, w: 25, h: 45 },
    SB102: { x: 329, y: 127, w: 120, h: 54 },
    SB123: { x: 329, y: 290, w: 120, h: 60 },
    SB214: { x: 320, y: 180, w: 30, h: 74 },
    SB219: { x: 490, y: 205, w: 25, h: 45 },
    SB220: { x: 350, y: 180, w: 99, h: 30 },
    SB221: { x: 490, y: 250, w: 25, h: 38 },
    SB230: { x: 350, y: 210, w: 99, h: 30 },
    SB238: { x: 300, y: 234, w: 20, h: 20 },
    SB240: { x: 280, y: 234, w: 20, h: 20 },
    SB242: { x: 260, y: 234, w: 20, h: 20 },
    SB244: { x: 240, y: 234, w: 20, h: 20 },
    SB246: { x: 220, y: 234, w: 20, h: 20 },
    SB248: { x: 200, y: 234, w: 20, h: 20 },
    SB252: { x: 70, y: 208, w: 120, h: 32 },
    SB263: { x: 51, y: 275, w: 40, h: 15 },
    SB273: { x: 5, y: 250, w: 25, h: 37 },
    SC169: { x: 70, y: 487, w: 120, h: 67 },
    SC176: { x: 70, y: 327, w: 120, h: 74 },
    SC221: { x: 490, y: 447, w: 25, h: 38 },
    SC231: { x: 429, y: 476, w: 40, h: 15 },
    SC236: { x: 329, y: 408, w: 120, h: 32 },
    SC238: { x: 300, y: 435, w: 20, h: 20 },
    SC240: { x: 280, y: 435, w: 20, h: 20 },
    SC242: { x: 260, y: 435, w: 20, h: 20 },
    SC244: { x: 240, y: 435, w: 20, h: 20 },
    SC246: { x: 220, y: 435, w: 20, h: 20 },
    SC248: { x: 200, y: 435, w: 20, h: 20 },
    SC250: { x: 169, y: 400, w: 31, h: 55 },
    SC262: { x: 70, y: 400, w: 99, h: 40 },
    SC273: { x: 5, y: 467, w: 25, h: 20 },
    SC275: { x: 5, y: 437, w: 25, h: 30 },
    SC279: { x: 5, y: 403, w: 25, h: 34 },
    SD102: { x: 330, y: 530, w: 120, h: 50 },
    SD214: { x: 350, y: 580, w: 100, h: 30 },
    SD219: { x: 490, y: 610, w: 25, h: 38 },
    SD220: { x: 350, y: 610, w: 100, h: 30 },
    SD223: { x: 490, y: 647, w: 25, h: 38 },
    SD240: { x: 300, y: 630, w: 20, h: 20 },
    SD242: { x: 280, y: 630, w: 20, h: 20 },
    SD244: { x: 260, y: 630, w: 20, h: 20 },
    SD246: { x: 240, y: 630, w: 20, h: 20 },
    SD248: { x: 220, y: 630, w: 20, h: 20 },
    SD250: { x: 200, y: 630, w: 20, h: 20 },
    SD254: { x: 70, y: 606, w: 120, h: 28 },
    SD255: { x: 150, y: 670, w: 40, h: 15 },
    SD259: { x: 110, y: 670, w: 40, h: 15 },
    SD263: { x: 70, y: 670, w: 40, h: 15 },
    SD267: { x: 30, y: 670, w: 30, h: 15 },
    SD273: { x: 5, y: 650, w: 25, h: 35 },
  },
  westCorridor: { x: 30, y: 50, w: 20, h: 620 } satisfies OverviewRect,
  eastCorridor: { x: 470, y: 10, w: 20, h: 660 } satisfies OverviewRect,
  blockCorridors: {
    sa: { x: 50, y: 50, w: 420, h: 20 } satisfies OverviewRect,
    sb: { x: 50, y: 255, w: 420, h: 20 } satisfies OverviewRect,
    sc: { x: 50, y: 456, w: 420, h: 20 } satisfies OverviewRect,
    sd: { x: 50, y: 650, w: 420, h: 20 } satisfies OverviewRect,
  },
};
export const ZONES_3F: UpperFloorZones = {
  rooms: {
    SA321: { x: 490, y: 50, w: 30, h: 30 },
    SA334: { x: 320, y: 6, w: 119, h: 30 },
    SA336: { x: 320, y: 36, w: 50, h: 14 },
    SA338: { x: 300, y: 30, w: 20, h: 20 },
    SA340: { x: 280, y: 30, w: 20, h: 20 },
    SA342: { x: 260, y: 30, w: 20, h: 20 },
    SA344: { x: 240, y: 30, w: 20, h: 20 },
    SA346: { x: 220, y: 30, w: 20, h: 20 },
    SA350: { x: 180, y: 30, w: 20, h: 20 },
    SA360: { x: 10, y: 35, w: 20, h: 35 },
    SB334: { x: 369, y: 235, w: 50, h: 14 },
    SB336: { x: 320, y: 205, w: 150, h: 30 },
    SB338: { x: 300, y: 229, w: 20, h: 20 },
    SB340: { x: 280, y: 229, w: 20, h: 20 },
    SB342: { x: 260, y: 229, w: 20, h: 20 },
    SB344: { x: 240, y: 229, w: 20, h: 20 },
    SB346: { x: 220, y: 229, w: 20, h: 20 },
    SB348: { x: 200, y: 229, w: 20, h: 20 },
    SB356: { x: 84, y: 203, w: 116, h: 32 },
    SB363: { x: 50, y: 260, w: 40, h: 20 },
    SB373: { x: 9, y: 249, w: 20, h: 31 },
    SC321: { x: 490, y: 450, w: 30, h: 30 },
    SC336: { x: 320, y: 405, w: 110, h: 30 },
    SC338: { x: 300, y: 430, w: 20, h: 20 },
    SC340: { x: 280, y: 430, w: 20, h: 20 },
    SC342: { x: 260, y: 430, w: 20, h: 20 },
    SC344: { x: 240, y: 430, w: 20, h: 20 },
    SC346: { x: 220, y: 430, w: 20, h: 20 },
    SC348: { x: 200, y: 430, w: 20, h: 20 },
    SC354: { x: 70, y: 403, w: 130, h: 32 },
    SC375: { x: 0, y: 405, w: 30, h: 70 },
    SD319: { x: 490, y: 605, w: 30, h: 70 },
    SD334: { x: 320, y: 605, w: 149, h: 30 },
    SD340: { x: 300, y: 630, w: 20, h: 20 },
    SD342: { x: 280, y: 630, w: 20, h: 20 },
    SD344: { x: 260, y: 630, w: 20, h: 20 },
    SD346: { x: 240, y: 630, w: 20, h: 20 },
    SD348: { x: 220, y: 630, w: 20, h: 20 },
    SD350: { x: 200, y: 630, w: 20, h: 20 },
    SD354: { x: 90, y: 605, w: 110, h: 30 },
    SD357: { x: 171, y: 660, w: 20, h: 20 },
    SD359: { x: 151, y: 660, w: 20, h: 20 },
    SD361: { x: 131, y: 660, w: 20, h: 20 },
    SD363: { x: 111, y: 660, w: 20, h: 20 },
    SD365: { x: 91, y: 660, w: 20, h: 20 },
    SD367: { x: 71, y: 660, w: 20, h: 20 },
    SD369: { x: 51, y: 660, w: 20, h: 20 },
    SD371: { x: 31, y: 660, w: 20, h: 20 },
    SD373: { x: 6, y: 648, w: 25, h: 32 },
  },
  westCorridor: { x: 30, y: 50, w: 20, h: 610 } satisfies OverviewRect,
  eastCorridor: { x: 470, y: 10, w: 20, h: 650 } satisfies OverviewRect,
  blockCorridors: {
    sa: { x: 50, y: 50, w: 420, h: 10 } satisfies OverviewRect,
    sb: { x: 50, y: 250, w: 420, h: 10 } satisfies OverviewRect,
    sc: { x: 50, y: 450, w: 420, h: 10 } satisfies OverviewRect,
    sd: { x: 50, y: 650, w: 420, h: 10 } satisfies OverviewRect,
  },
};
export const ZONES_4F: UpperFloorZones = {
  rooms: {
    SA421: { x: 491, y: 49, w: 30, h: 31 },
    SA423: { x: 450, y: 60, w: 41, h: 20 },
    SA429: { x: 429, y: 60, w: 21, h: 20 },
    SA431: { x: 408, y: 60, w: 21, h: 20 },
    SA434: { x: 10, y: 10, w: 40, h: 60 },
    SA435: { x: 365, y: 60, w: 21, h: 20 },
    SA437: { x: 344, y: 60, w: 21, h: 20 },
    SA439: { x: 323, y: 60, w: 21, h: 20 },
    SA441: { x: 302, y: 60, w: 21, h: 20 },
    SA443: { x: 281, y: 60, w: 21, h: 20 },
    SA445: { x: 260, y: 60, w: 21, h: 20 },
    SA447: { x: 239, y: 60, w: 21, h: 20 },
    SA449: { x: 218, y: 60, w: 21, h: 20 },
    SA451: { x: 197, y: 60, w: 21, h: 20 },
    SA453: { x: 176, y: 60, w: 21, h: 20 },
    SA455: { x: 155, y: 60, w: 21, h: 20 },
    SA457: { x: 134, y: 60, w: 21, h: 20 },
    SA461: { x: 60, y: 60, w: 50, h: 20 },
    SB427: { x: 430, y: 210, w: 90, h: 65 },
    SB461: { x: 90, y: 260, w: 20, h: 20 },
    SB463: { x: 70, y: 260, w: 20, h: 20 },
    SB465: { x: 50, y: 260, w: 20, h: 20 },
    SB467: { x: 30, y: 260, w: 20, h: 20 },
    SB473: { x: 0, y: 250, w: 30, h: 30 },
    SC421: { x: 490, y: 450, w: 30, h: 30 },
    SC425: { x: 469, y: 460, w: 21, h: 20 },
    SC427: { x: 448, y: 460, w: 21, h: 20 },
    SC429: { x: 427, y: 460, w: 21, h: 20 },
    SC431: { x: 406, y: 460, w: 21, h: 20 },
    SC436: { x: 350, y: 405, w: 85, h: 45 },
    SC438: { x: 300, y: 405, w: 50, h: 45 },
    SC440: { x: 250, y: 405, w: 50, h: 45 },
    SC444: { x: 168, y: 405, w: 82, h: 45 },
    SC454: { x: 70, y: 405, w: 98, h: 30 },
    SC464: { x: 6, y: 405, w: 64, h: 45 },
    SC465: { x: 69, y: 460, w: 21, h: 20 },
    SC467: { x: 48, y: 460, w: 21, h: 20 },
    SC469: { x: 27, y: 460, w: 21, h: 20 },
    SC471: { x: 6, y: 460, w: 21, h: 20 },
    SD421: { x: 495, y: 660, w: 20, h: 20 },
    SD423: { x: 475, y: 660, w: 20, h: 20 },
    SD425: { x: 440, y: 660, w: 35, h: 20 },
    SD428: { x: 430, y: 605, w: 85, h: 45 },
    SD429: { x: 401, y: 660, w: 20, h: 20 },
    SD431: { x: 381, y: 660, w: 20, h: 20 },
    SD433: { x: 361, y: 660, w: 20, h: 20 },
    SD435: { x: 341, y: 660, w: 20, h: 20 },
    SD436: { x: 340, y: 605, w: 90, h: 30 },
    SD437: { x: 321, y: 660, w: 20, h: 20 },
    SD439: { x: 301, y: 660, w: 20, h: 20 },
    SD440: { x: 260, y: 605, w: 80, h: 45 },
    SD441: { x: 281, y: 660, w: 20, h: 20 },
    SD443: { x: 245, y: 660, w: 36, h: 20 },
    SD446E: { x: 220, y: 605, w: 40, h: 45 },
    SD446W: { x: 180, y: 605, w: 40, h: 45 },
    SD447: { x: 225, y: 660, w: 20, h: 20 },
    SD451: { x: 190, y: 660, w: 20, h: 20 },
    SD453: { x: 170, y: 660, w: 20, h: 20 },
    SD454: { x: 90, y: 605, w: 90, h: 45 },
    SD455: { x: 150, y: 660, w: 20, h: 20 },
    SD457: { x: 130, y: 660, w: 20, h: 20 },
    SD459: { x: 110, y: 660, w: 20, h: 20 },
    SD461: { x: 90, y: 660, w: 20, h: 20 },
    SD463: { x: 70, y: 660, w: 20, h: 20 },
    SD465: { x: 50, y: 660, w: 20, h: 20 },
    SD467: { x: 30, y: 660, w: 20, h: 20 },
    SD473: { x: 5, y: 648, w: 25, h: 32 },
  },
  westCorridor: null,
  eastCorridor: null,
  blockCorridors: {
    sa: { x: 50, y: 50, w: 420, h: 10 } satisfies OverviewRect,
    sb: { x: 50, y: 250, w: 381, h: 20 } satisfies OverviewRect,
    sc: { x: 10, y: 450, w: 460, h: 10 } satisfies OverviewRect,
    sd: { x: 50, y: 650, w: 460, h: 10 } satisfies OverviewRect,
  },
};
export const ZONES_5F: UpperFloorZones = {
  rooms: {
    SA521: { x: 490, y: 49, w: 30, h: 31 },
    SA525: { x: 449, y: 60, w: 41, h: 20 },
    SA529: { x: 428, y: 60, w: 21, h: 20 },
    SA531: { x: 407, y: 60, w: 21, h: 20 },
    SA534: { x: 10, y: 11, w: 40, h: 60 },
    SA535: { x: 365, y: 60, w: 21, h: 20 },
    SA537: { x: 344, y: 60, w: 21, h: 20 },
    SA539: { x: 323, y: 60, w: 21, h: 20 },
    SA541: { x: 302, y: 60, w: 21, h: 20 },
    SA543: { x: 281, y: 60, w: 21, h: 20 },
    SA545: { x: 260, y: 60, w: 21, h: 20 },
    SA547: { x: 239, y: 60, w: 21, h: 20 },
    SA549: { x: 218, y: 60, w: 21, h: 20 },
    SA551: { x: 197, y: 60, w: 21, h: 20 },
    SA553: { x: 176, y: 60, w: 21, h: 20 },
    SA555: { x: 155, y: 60, w: 21, h: 20 },
    SA557: { x: 134, y: 60, w: 21, h: 20 },
    SA561: { x: 60, y: 60, w: 50, h: 20 },
    SB527: { x: 430, y: 210, w: 90, h: 65 },
    SB561: { x: 90, y: 260, w: 20, h: 20 },
    SB563: { x: 70, y: 260, w: 20, h: 20 },
    SB565: { x: 50, y: 260, w: 20, h: 20 },
    SB567: { x: 30, y: 260, w: 20, h: 20 },
    SB573: { x: 0, y: 250, w: 30, h: 30 },
    SC521: { x: 490, y: 450, w: 30, h: 30 },
    SC525: { x: 469, y: 460, w: 21, h: 20 },
    SC527: { x: 448, y: 460, w: 21, h: 20 },
    SC529: { x: 427, y: 460, w: 21, h: 20 },
    SC531: { x: 406, y: 460, w: 21, h: 20 },
    SC536: { x: 350, y: 405, w: 81, h: 45 },
    SC540: { x: 260, y: 405, w: 90, h: 45 },
    SC544: { x: 168, y: 405, w: 92, h: 45 },
    SC554: { x: 70, y: 405, w: 98, h: 30 },
    SC564: { x: 6, y: 405, w: 64, h: 30 },
    SC565: { x: 69, y: 460, w: 21, h: 20 },
    SC566: { x: 6, y: 435, w: 44, h: 16 },
    SC567: { x: 48, y: 460, w: 21, h: 20 },
    SC569: { x: 27, y: 460, w: 21, h: 20 },
    SC571: { x: 6, y: 460, w: 21, h: 20 },
    SD521: { x: 500, y: 650, w: 15, h: 30 },
    SD523: { x: 465, y: 660, w: 35, h: 20 },
    SD525: { x: 440, y: 660, w: 25, h: 20 },
    SD526: { x: 458, y: 635, w: 57, h: 15 },
    SD528: { x: 430, y: 605, w: 85, h: 30 },
    SD529: { x: 406, y: 660, w: 20, h: 20 },
    SD531: { x: 386, y: 660, w: 20, h: 20 },
    SD533: { x: 366, y: 660, w: 20, h: 20 },
    SD535: { x: 346, y: 660, w: 20, h: 20 },
    SD536: { x: 340, y: 605, w: 90, h: 30 },
    SD537: { x: 326, y: 660, w: 20, h: 20 },
    SD539: { x: 306, y: 660, w: 20, h: 20 },
    SD540E: { x: 300, y: 605, w: 40, h: 45 },
    SD540W: { x: 260, y: 605, w: 40, h: 45 },
    SD541: { x: 286, y: 660, w: 20, h: 20 },
    SD543: { x: 266, y: 660, w: 20, h: 20 },
    SD545: { x: 246, y: 660, w: 20, h: 20 },
    SD546: { x: 180, y: 605, w: 80, h: 45 },
    SD547: { x: 226, y: 660, w: 20, h: 20 },
    SD551: { x: 190, y: 660, w: 20, h: 20 },
    SD553: { x: 170, y: 660, w: 20, h: 20 },
    SD554: { x: 90, y: 605, w: 90, h: 45 },
    SD555: { x: 150, y: 660, w: 20, h: 20 },
    SD557: { x: 130, y: 660, w: 20, h: 20 },
    SD559: { x: 110, y: 660, w: 20, h: 20 },
    SD561: { x: 90, y: 660, w: 20, h: 20 },
    SD563: { x: 70, y: 660, w: 20, h: 20 },
    SD565: { x: 50, y: 660, w: 20, h: 20 },
    SD567: { x: 30, y: 660, w: 20, h: 20 },
    SD573: { x: 5, y: 648, w: 25, h: 32 },
  },
  westCorridor: null,
  eastCorridor: null,
  blockCorridors: {
    sa: { x: 50, y: 50, w: 420, h: 10 } satisfies OverviewRect,
    sb: { x: 50, y: 250, w: 381, h: 20 } satisfies OverviewRect,
    sc: { x: 10, y: 450, w: 460, h: 10 } satisfies OverviewRect,
    sd: { x: 50, y: 650, w: 450, h: 10 } satisfies OverviewRect,
  },
};

export const ZONES_UPPER: Record<"2F" | "3F" | "4F" | "5F", UpperFloorZones> = {
  "2F": ZONES_2F,
  "3F": ZONES_3F,
  "4F": ZONES_4F,
  "5F": ZONES_5F,
};
/** @generated-upper-zones-end */

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
  /** @generated-upper-shafts-start */
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
    "sb-stair-west": { x: 182, y: 160 },
    "sb-stair-east": { x: 442, y: 243 },
    "sb-elev-west": { x: 57, y: 225 },
    "sc-stair-west": { x: 182, y: 342 },
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
/** @generated-upper-shafts-end */
};

export function getSvgZones(floorId: FloorId) {
  return floorId === "1F" ? ZONES_1F : ZONES_0F;
}
