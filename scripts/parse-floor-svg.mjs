#!/usr/bin/env node
/**
 * 从 draw.io 导出的楼层 SVG 提取房间标签、走廊、停车场、楼梯与电梯位置
 * 用法：
 *   node scripts/parse-floor-svg.mjs [0F|1F|2F|3F|4F|5F|all]
 *   node scripts/parse-floor-svg.mjs --write-upper   # 写回 src/data/svgFloorZones.ts（2F~5F）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FLOORS = {
  "0F": { file: "public/maps/S_0F.svg", offsetX: 80, offsetY: 120 },
  "1F": { file: "public/maps/S_1F.svg", offsetX: 140, offsetY: 120 },
  "2F": { file: "public/maps/S_2F.svg", offsetX: 160, offsetY: 120 },
  "3F": { file: "public/maps/S_3F.svg", offsetX: 160, offsetY: 120 },
  "4F": { file: "public/maps/S_4F.svg", offsetX: 160, offsetY: 120 },
  "5F": { file: "public/maps/S_5F.svg", offsetX: 160, offsetY: 120 },
};

const PARKING_FILLS = new Set(["#ffe6cc", "#d5e8d4", "#dae8fc"]);
const CORRIDOR_GRAY = "#f5f5f5";
/** 教室号标签：SA169、SD446W 等 */
const ROOM_LABEL_RE = /^S[ABCD]\d/;
/** 宽横幅标注，但仍是可导航目的地 */
const WIDE_BANNER_ROOMS = new Set(["SA361", "SB434", "SB534"]);
const UPPER_FLOORS = ["2F", "3F", "4F", "5F"];

function decodeContent(svg) {
  const content = svg.match(/content="([^"]*)"/)?.[1] ?? "";
  return content
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, "\n")
    .replace(/&amp;/g, "&");
}

function parseMxCells(decoded, offsetX, offsetY) {
  const cells = [];
  const re =
    /<mxCell([^>]*)>[\s\S]*?<mxGeometry ([^/]*)\/>/g;
  let m;
  while ((m = re.exec(decoded)) !== null) {
    const attrs = m[1];
    const geo = m[2];
    const gx = geo.match(/\bx="([^"]*)"/)?.[1];
    const gy = geo.match(/\by="([^"]*)"/)?.[1];
    const gw = geo.match(/\bwidth="([^"]*)"/)?.[1];
    const gh = geo.match(/\bheight="([^"]*)"/)?.[1];
    if (!gx || !gy) continue;
    const style = attrs.match(/style="([^"]*)"/)?.[1] ?? "";
    const rawLabel = attrs.match(/value="([^"]*)"/)?.[1] ?? "";
    const label = rawLabel
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      // draw.io 复制粘贴时会在富文本里塞入隐藏 <span> 存剪贴板数据，整段丢弃
      .replace(/<span[\s\S]*?<\/span>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    const fill = style.match(/fillColor=([^;]+)/)?.[1];
    const shape = style.match(/shape=([^;]+)/)?.[1];
    const model = { x: +gx, y: +gy, w: +(gw || 0), h: +(gh || 0) };
    cells.push({
      label,
      fill,
      shape,
      style,
      model,
      svg: {
        x: model.x - offsetX,
        y: model.y - offsetY,
        w: model.w,
        h: model.h,
      },
    });
  }
  return cells;
}

function parseRenderedRects(svg) {
  return [...svg.matchAll(
    /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="([^"]*)"([^>]*)\/>/g
  )].map((m) => ({
    x: +m[1],
    y: +m[2],
    w: +m[3],
    h: +m[4],
    fill: m[5].toLowerCase(),
    stroke: m[6].includes('stroke="#') || m[6].includes("stroke='#"),
  }));
}

function iconCenter(rect, inset = 0) {
  return {
    x: Math.round(rect.x + rect.w / 2),
    y: Math.round(rect.y + rect.h / 2),
  };
}

function groupElevatorBanks(cells) {
  const icons = cells.filter((c) => c.shape === "mxgraph.floorplan.elevator");
  const banks = [];
  const used = new Set();

  for (let i = 0; i < icons.length; i++) {
    if (used.has(i)) continue;
    const cluster = [icons[i]];
    used.add(i);
    for (let j = i + 1; j < icons.length; j++) {
      if (used.has(j)) continue;
      const dx = Math.abs(icons[i].svg.x - icons[j].svg.x);
      const dy = Math.abs(icons[i].svg.y - icons[j].svg.y);
      if (dx <= 20 && dy <= 40) {
        cluster.push(icons[j]);
        used.add(j);
      }
    }
    const xs = cluster.map((c) => c.svg.x);
    const ys = cluster.map((c) => c.svg.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, idx) => x + cluster[idx].svg.w));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys.map((y, idx) => y + cluster[idx].svg.h));
    banks.push({
      center: {
        x: Math.round((minX + maxX) / 2),
        y: Math.round((minY + maxY) / 2),
      },
      icons: cluster.length,
      svg: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    });
  }
  return banks.sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x);
}

const STAIR_SHAPES = new Set([
  "mxgraph.signs.travel.stairs",
  "mxgraph.signs.travel.upstairs",
  "mxgraph.signs.travel.downstairs",
]);

function parseStairCenters(cells) {
  return cells
    .filter((c) => STAIR_SHAPES.has(c.shape))
    .map((c) => iconCenter(c.svg))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

/** 同翼可能有连廊/出口楼梯图标，竖井取最靠边的那个 */
function pickWestStair(stairs, yMin, yMax) {
  const candidates = stairs.filter(
    (s) => s.y > yMin && s.y < yMax && s.x < 200
  );
  return candidates.length
    ? candidates.reduce((best, s) => (s.x < best.x ? s : best))
    : undefined;
}

function pickEastStair(stairs, yMin, yMax) {
  const candidates = stairs.filter(
    (s) => s.y > yMin && s.y < yMax && s.x > 400
  );
  return candidates.length
    ? candidates.reduce((best, s) => (s.x > best.x ? s : best))
    : undefined;
}

function assignShaftCenters(stairs, elevators) {
  return {
    stairCenters: {
      saWest: pickWestStair(stairs, -Infinity, 100),
      saEast: pickEastStair(stairs, -Infinity, 100),
      sbWest: pickWestStair(stairs, 100, 320),
      sbEast: pickEastStair(stairs, 100, 320),
      scWest: pickWestStair(stairs, 320, 520),
      scEast: pickEastStair(stairs, 320, 520),
      sdWest: pickWestStair(stairs, 520, Infinity),
      sdEast: pickEastStair(stairs, 520, Infinity),
    },
    elevatorCenters: {
      saEast: elevators.find((e) => e.center.y < 80 && e.center.x > 400)
        ?.center,
      sbWest: elevators.find(
        (e) => e.center.y > 180 && e.center.y < 280 && e.center.x < 200
      )?.center,
      scEast: elevators.find(
        (e) => e.center.y > 380 && e.center.y < 460 && e.center.x > 400
      )?.center,
      sdWest: elevators.find((e) => e.center.y > 580 && e.center.x < 200)
        ?.center,
    },
  };
}

function parseToiletIcons(cells) {
  return cells.filter(
    (c) =>
      c.shape === "image" &&
      /toilet|restroom|bathroom|_wc/i.test(c.style)
  );
}

function toiletBBox(icons, pad = 2) {
  if (!icons.length) return null;
  const minX = Math.min(...icons.map((i) => i.svg.x)) - pad;
  const minY = Math.min(...icons.map((i) => i.svg.y)) - pad;
  const maxX =
    Math.max(...icons.map((i) => i.svg.x + i.svg.w)) + pad;
  const maxY =
    Math.max(...icons.map((i) => i.svg.y + i.svg.h)) + pad;
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.round(maxX - minX),
    h: Math.round(maxY - minY),
  };
}

/**
 * 洗手间图标可能出现在任一翼的东侧或西侧（各楼层不一定对称），
 * 按楼层四个色块（SA/SB/SC/SD）的 y 区间分桶，再按 x 判断东/西。
 */
function groupToiletsByWing(icons, bands = [120, 360, 560]) {
  const blocks = ["sa", "sb", "sc", "sd"];
  const byBlock = blocks.map((_, i) => {
    const lo = i === 0 ? -Infinity : bands[i - 1];
    const hi = i === blocks.length - 1 ? Infinity : bands[i];
    return icons.filter((icon) => icon.svg.y >= lo && icon.svg.y < hi);
  });

  const result = {};
  byBlock.forEach((group, i) => {
    const west = group.filter((icon) => icon.svg.x < 200);
    const east = group.filter((icon) => icon.svg.x > 300);
    if (west.length) result[`${blocks[i]}West`] = toiletBBox(west);
    if (east.length) result[`${blocks[i]}East`] = toiletBBox(east);
  });
  return result;
}

function parse0FZones(rects, cells) {
  const thinGrayCorridors = rects
    .filter(
      (r) =>
        r.fill === CORRIDOR_GRAY &&
        r.h <= 15 &&
        r.w >= 200
    )
    .sort((a, b) => a.y - b.y);

  const parking = rects
    .filter((r) => PARKING_FILLS.has(r.fill) && r.w >= 100 && r.h >= 40)
    .sort((a, b) => a.y - b.y);

  const walkable = rects.filter(
    (r) => r.fill === "#fcfcfc" && r.w > 30
  );

  const rooms = cells.filter((c) => c.label && c.svg.w > 30);

  const stairs = parseStairCenters(cells);
  const elevators = groupElevatorBanks(cells);
  const { stairCenters, elevatorCenters } = assignShaftCenters(
    stairs,
    elevators
  );

  return {
    corridors: {
      sa: thinGrayCorridors[0] ?? null,
      sb: thinGrayCorridors[1] ?? null,
    },
    parking: {
      scUpper: parking.find((p) => p.fill === "#ffe6cc") ?? null,
      scLower: parking.find((p) => p.fill === "#d5e8d4") ?? null,
      sd: parking.find((p) => p.fill === "#dae8fc") ?? null,
    },
    walkable,
    rooms,
    stairCenters,
    elevatorCenters,
    allStairs: stairs,
    allElevators: elevators,
  };
}

/** 两段灰走廊之间的无填充空隙（同一竖列，上一段底 → 下一段顶） */
function gapBetween(upper, lower) {
  if (!upper || !lower) return null;
  return {
    x: upper.x,
    y: upper.y + upper.h,
    w: upper.w,
    h: lower.y - (upper.y + upper.h),
  };
}

/** 去重 + 去掉跨排横幅标签，保留每个房间号最小的一块 */
function extractRoomRects(cells) {
  const roomLike = cells.filter((c) => ROOM_LABEL_RE.test(c.label));
  const byLabel = new Map();
  for (const c of roomLike) {
    const area = c.svg.w * c.svg.h;
    const prev = byLabel.get(c.label);
    if (!prev || area < prev.area) {
      byLabel.set(c.label, { ...c.svg, area });
    }
  }
  const rooms = {};
  for (const [label, rect] of byLabel) {
    // 宽横幅多为跨排标签；白名单内仍保留为可导航房间
    if (rect.w > 150 && rect.h <= 50 && !WIDE_BANNER_ROOMS.has(label)) continue;
    rooms[label] = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.w),
      h: Math.round(rect.h),
    };
  }
  return rooms;
}

/** 西/东翼纵向灰走廊：仅当存在 h≥400 的贯穿段时返回（4F/5F 无完整翼走廊则为 null） */
function corridorSideBBox(rects, side) {
  const gray = rects.filter(
    (r) => r.fill === CORRIDOR_GRAY && r.w <= 40 && r.h > r.w
  );
  const wing =
    side === "west"
      ? gray.filter((r) => r.x < 100)
      : gray.filter((r) => r.x > 300);
  const full = wing.find((r) => r.h >= 400);
  if (!full) return null;
  return {
    x: Math.round(full.x),
    y: Math.round(full.y),
    w: Math.round(full.w),
    h: Math.round(full.h),
  };
}

const UPPER_BLOCKS = ["sa", "sb", "sc", "sd"];

/** 2F/3F 贯穿翼走廊按块走廊 y 中线拆成 SA/SB/SC/SD 四段（物理连通，逻辑分楼） */
function splitWingCorridorByBlocks(fullCorridor, blockCorridors) {
  const centers = UPPER_BLOCKS.map((b) => {
    const bc = blockCorridors[b];
    return bc.y + bc.h / 2;
  });
  const boundaries = [fullCorridor.y];
  for (let i = 0; i < UPPER_BLOCKS.length - 1; i++) {
    boundaries.push(Math.round((centers[i] + centers[i + 1]) / 2));
  }
  boundaries.push(fullCorridor.y + fullCorridor.h);
  return UPPER_BLOCKS.map((block, i) => ({
    block,
    rect: {
      x: Math.round(fullCorridor.x),
      y: boundaries[i],
      w: Math.round(fullCorridor.w),
      h: boundaries[i + 1] - boundaries[i],
    },
  }));
}

/** 西/东翼按楼宇拆分；无贯穿翼走廊时返回 null */
function extractUpperWingCorridors(rects, blockCorridors) {
  const westFull = corridorSideBBox(rects, "west");
  const eastFull = corridorSideBBox(rects, "east");
  if (!westFull || !eastFull) return null;

  const wingCorridors = {};
  for (const { block, rect } of splitWingCorridorByBlocks(westFull, blockCorridors)) {
    const key = `west${block.charAt(0).toUpperCase()}${block.slice(1)}`;
    wingCorridors[key] = rect;
  }
  for (const { block, rect } of splitWingCorridorByBlocks(eastFull, blockCorridors)) {
    const key = `east${block.charAt(0).toUpperCase()}${block.slice(1)}`;
    wingCorridors[key] = rect;
  }
  return wingCorridors;
}

/** SA/SB/SC/SD 东西向楼内走廊：合并同层 y 相近的灰条 */
function extractBlockCorridors(rects) {
  const horizontal = rects
    .filter((r) => r.fill === CORRIDOR_GRAY && r.w > r.h * 1.5 && r.h <= 25)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const groups = [];
  for (const r of horizontal) {
    let g = groups.find((gr) => Math.abs(gr.y - r.y) <= 20);
    if (!g) {
      g = { y: r.y, rects: [] };
      groups.push(g);
    }
    g.rects.push(r);
    g.y = Math.min(g.y, r.y);
  }
  groups.sort((a, b) => a.y - b.y);

  const keys = ["sa", "sb", "sc", "sd"];
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const g = groups[i];
    if (!g) break;
    const minX = Math.min(...g.rects.map((r) => r.x));
    const minY = Math.min(...g.rects.map((r) => r.y));
    const maxX = Math.max(...g.rects.map((r) => r.x + r.w));
    const maxY = Math.max(...g.rects.map((r) => r.y + r.h));
    result[keys[i]] = {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(maxX - minX),
      h: Math.round(maxY - minY),
    };
  }
  return result;
}

/** 2F~5F：提取全部小房间 + 东西翼走廊包围盒 */
function parseUpperFloorZones(rects, cells) {
  const rooms = extractRoomRects(cells);
  const stairs = parseStairCenters(cells);
  const elevators = groupElevatorBanks(cells);
  const { stairCenters, elevatorCenters } = assignShaftCenters(
    stairs,
    elevators
  );
  const toilets = groupToiletsByWing(parseToiletIcons(cells));

  const blockCorridors = extractBlockCorridors(rects);
  return {
    rooms,
    wingCorridors: extractUpperWingCorridors(rects, blockCorridors),
    blockCorridors,
    stairCenters,
    elevatorCenters,
    toilets,
    allStairs: stairs,
    allElevators: elevators,
  };
}

function parse1FZones(rects, cells) {
  const walkable = rects.filter((r) => r.fill === "#fcfcfc" && r.w > 30);
  const spine =
    walkable.find((r) => r.h >= 500 && r.x >= 200 && r.x <= 240) ?? null;
  const wingWalk = walkable.filter((r) => r.h <= 50 && r.w >= 180);
  const westBridges = wingWalk
    .filter((r) => r.x < 100)
    .sort((a, b) => a.y - b.y);
  const eastBridges = wingWalk
    .filter((r) => r.x > 300)
    .sort((a, b) => a.y - b.y);

  // 两翼各只有 4 段真实灰走廊（每翼一段，含该翼全部教室），块间空隙才是通道
  const gray = rects
    .filter((r) => r.fill === CORRIDOR_GRAY && r.w <= 40)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const westGray = gray.filter((r) => r.x < 100).sort((a, b) => a.y - b.y);
  const eastGray = gray.filter((r) => r.x > 300).sort((a, b) => a.y - b.y);

  const rooms = Object.fromEntries(
    cells
      .filter((c) => c.label && c.svg.w > 30)
      .map((c) => [c.label, { ...c.svg }])
  );

  const stairs = parseStairCenters(cells);
  const elevators = groupElevatorBanks(cells);
  const { stairCenters, elevatorCenters } = assignShaftCenters(
    stairs,
    elevators
  );
  const toilets = groupToiletsByWing(parseToiletIcons(cells));

  return {
    spine,
    wingCorridors: {
      westSa: westGray[0] ?? null,
      westSb: westGray[1] ?? null,
      westSc: westGray[2] ?? null,
      westSd: westGray[3] ?? null,
      eastSa: eastGray[0] ?? null,
      eastSb: eastGray[1] ?? null,
      eastSc: eastGray[2] ?? null,
      eastSd: eastGray[3] ?? null,
    },
    passages: {
      westSaSb: gapBetween(westGray[0], westGray[1]),
      westSbSc: gapBetween(westGray[1], westGray[2]),
      westScSd: gapBetween(westGray[2], westGray[3]),
      eastSaSb: gapBetween(eastGray[0], eastGray[1]),
      eastSbSc: gapBetween(eastGray[1], eastGray[2]),
      eastScSd: gapBetween(eastGray[2], eastGray[3]),
    },
    spineBridges: {
      westSa: westBridges[0] ?? null,
      westSb: westBridges[1] ?? null,
      westSc: westBridges[2] ?? null,
      eastSa: eastBridges[0] ?? null,
      eastSb: eastBridges[1] ?? null,
      eastSc: eastBridges[2] ?? null,
    },
    rooms,
    stairCenters,
    elevatorCenters,
    toilets,
    allStairs: stairs,
    allElevators: elevators,
  };
}

function parseFloor(floorId) {
  const { file, offsetX, offsetY } = FLOORS[floorId];
  const svg = fs.readFileSync(path.join(root, file), "utf8");
  const decoded = decodeContent(svg);
  const cells = parseMxCells(decoded, offsetX, offsetY);
  const rects = parseRenderedRects(svg);

  const base = {
    floorId,
    viewBox: svg.match(/viewBox="([^"]+)"/)?.[1],
    labeled: cells.filter((c) => c.label),
    walkable: rects.filter((r) => r.fill === "#fcfcfc" && r.w > 30),
    bands: rects.filter(
      (r) =>
        ["#ffe6cc", "#d5e8d4", "#dae8fc", "#f8cecc"].includes(r.fill) &&
        r.w > 100
    ),
    roomOutlines: rects.filter((r) => r.stroke && r.w > 30),
    stairs: parseStairCenters(cells),
    elevators: groupElevatorBanks(cells),
  };

  if (floorId === "0F") {
    return { ...base, zones0F: parse0FZones(rects, cells) };
  }
  if (floorId === "1F") {
    return { ...base, zones1F: parse1FZones(rects, cells) };
  }
  if (UPPER_FLOORS.includes(floorId)) {
    return { ...base, zonesUpper: parseUpperFloorZones(rects, cells) };
  }
  return base;
}

function fmtRect(r) {
  if (!r) return "null";
  const nums = [r.x, r.y, r.w, r.h].map((n) =>
    Number.isInteger(n) ? String(n) : String(+n.toFixed(2))
  );
  return `{ x: ${nums[0]}, y: ${nums[1]}, w: ${nums[2]}, h: ${nums[3]} }`;
}

function fmtPoint(p) {
  if (!p) return "undefined";
  return `{ x: ${p.x}, y: ${p.y} }`;
}

function fmtRooms(rooms) {
  const lines = Object.entries(rooms)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, r]) => `    ${k}: ${fmtRect(r)},`);
  return `{\n${lines.join("\n")}\n  }`;
}

function fmtBlockCorridors(blockCorridors) {
  const keys = ["sa", "sb", "sc", "sd"];
  const lines = keys.map(
    (k) => `    ${k}: ${fmtRect(blockCorridors[k])} satisfies OverviewRect,`
  );
  return `{\n${lines.join("\n")}\n  }`;
}

function fmtWingCorridors(wingCorridors) {
  if (!wingCorridors) return "  wingCorridors: null,";
  const keys = [
    "westSa",
    "westSb",
    "westSc",
    "westSd",
    "eastSa",
    "eastSb",
    "eastSc",
    "eastSd",
  ];
  const lines = keys.map(
    (k) => `    ${k}: ${fmtRect(wingCorridors[k])} satisfies OverviewRect,`
  );
  return `  wingCorridors: {\n${lines.join("\n")}\n  },`;
}

function fmtToilets(toilets) {
  const lines = Object.entries(toilets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, r]) => `    ${k}: ${fmtRect(r)},`);
  return `  toilets: {\n${lines.join("\n")}\n  } satisfies Record<string, OverviewRect>`;
}

function fmtUpperFloorZones(floorId, zones) {
  return `export const ZONES_${floorId}: UpperFloorZones = {
  rooms: ${fmtRooms(zones.rooms)},
${fmtWingCorridors(zones.wingCorridors)}
  blockCorridors: ${fmtBlockCorridors(zones.blockCorridors)},
${fmtToilets(zones.toilets)},
};`;
}

function fmtShaftCenters(floorId, zones) {
  const keys = [
    "sa-stair-west",
    "sa-stair-east",
    "sa-elev-east",
    "sb-stair-west",
    "sb-stair-east",
    "sb-elev-west",
    "sc-stair-west",
    "sc-stair-east",
    "sc-elev-east",
    "sd-stair-west",
    "sd-stair-east",
    "sd-elev-west",
  ];
  const stairMap = {
    "sa-stair-west": zones.stairCenters.saWest,
    "sa-stair-east": zones.stairCenters.saEast,
    "sb-stair-west": zones.stairCenters.sbWest,
    "sb-stair-east": zones.stairCenters.sbEast,
    "sc-stair-west": zones.stairCenters.scWest,
    "sc-stair-east": zones.stairCenters.scEast,
    "sd-stair-west": zones.stairCenters.sdWest,
    "sd-stair-east": zones.stairCenters.sdEast,
    "sa-elev-east": zones.elevatorCenters.saEast,
    "sb-elev-west": zones.elevatorCenters.sbWest,
    "sc-elev-east": zones.elevatorCenters.scEast,
    "sd-elev-west": zones.elevatorCenters.sdWest,
  };
  const lines = keys.map((k) => `    "${k}": ${fmtPoint(stairMap[k])},`);
  return `  "${floorId}": {\n${lines.join("\n")}\n  },`;
}

function writeUpperZonesTs() {
  const zonesBlocks = UPPER_FLOORS.map((floorId) => {
    const data = parseFloor(floorId);
    const count = Object.keys(data.zonesUpper.rooms).length;
    console.error(`${floorId}: ${count} rooms`);
    return fmtUpperFloorZones(floorId, data.zonesUpper);
  });

  const shaftBlocks = UPPER_FLOORS.map((floorId) => {
    const data = parseFloor(floorId);
    return fmtShaftCenters(floorId, data.zonesUpper);
  });

  const tsPath = path.join(root, "src/data/svgFloorZones.ts");
  let src = fs.readFileSync(tsPath, "utf8");

  const upperStart = "/** @generated-upper-zones-start */";
  const upperEnd = "/** @generated-upper-zones-end */";
  const upperBody = [
    upperStart,
    "/** 2F～5F — 自动生成，勿手改；node scripts/parse-floor-svg.mjs --write-upper */",
    ...zonesBlocks,
    "",
    "export const ZONES_UPPER: Record<\"2F\" | \"3F\" | \"4F\" | \"5F\", UpperFloorZones> = {",
    ...UPPER_FLOORS.map((f) => `  "${f}": ZONES_${f},`),
    "};",
    upperEnd,
  ].join("\n");

  const shaftStart = "/** @generated-upper-shafts-start */";
  const shaftEnd = "/** @generated-upper-shafts-end */";
  const shaftBody = [
    shaftStart,
    ...shaftBlocks,
    shaftEnd,
  ].join("\n");

  const replaceBlock = (text, start, end, body) => {
    const re = new RegExp(
      `${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
    );
    if (!re.test(text)) {
      throw new Error(`Markers not found: ${start}`);
    }
    return text.replace(re, body);
  };

  // 首次写入：在 UpperFloorZones 接口后插入 zones 块
  if (!src.includes(upperStart)) {
    src = src.replace(
      /export interface UpperFloorZones \{[\s\S]*?\}\n\n/,
      (m) =>
        `${m}/**\n * 2F～5F — 从 S_2F~5F.svg 解析教室标签与走廊\n * 重新生成：node scripts/parse-floor-svg.mjs --write-upper\n */\n${upperStart}\n${upperEnd}\n\n`
    );
  }

  if (!src.includes(shaftStart)) {
    src = src.replace(
      /("1F": \{[\s\S]*?"sd-elev-west": [^\n]+\n  \},)\n/,
      `$1\n${shaftStart}\n${shaftEnd}\n`
    );
  }

  src = replaceBlock(src, upperStart, upperEnd, upperBody);
  src = replaceBlock(src, shaftStart, shaftEnd, shaftBody);

  fs.writeFileSync(tsPath, src);
  console.error(`Wrote ${tsPath}`);
}

const args = process.argv.slice(2);
if (args.includes("--write-upper")) {
  writeUpperZonesTs();
  process.exit(0);
}

const target = args[0] ?? "all";
const floors = target === "all" ? Object.keys(FLOORS) : [target];

for (const floorId of floors) {
  if (!FLOORS[floorId]) {
    console.error(`Unknown floor: ${floorId}`);
    process.exit(1);
  }
  const data = parseFloor(floorId);
  console.log(JSON.stringify(data, null, 2));
}
