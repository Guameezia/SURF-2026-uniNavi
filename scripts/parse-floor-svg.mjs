#!/usr/bin/env node
/**
 * 从 draw.io 导出的楼层 SVG 提取房间标签、走廊、停车场、楼梯与电梯位置
 * 用法：node scripts/parse-floor-svg.mjs [0F|1F]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FLOORS = {
  "0F": { file: "public/maps/S_0F.svg", offsetX: 80, offsetY: 120 },
  "1F": { file: "public/maps/S_1F.svg", offsetX: 140, offsetY: 120 },
};

const PARKING_FILLS = new Set(["#ffe6cc", "#d5e8d4", "#dae8fc"]);
const CORRIDOR_GRAY = "#f5f5f5";

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
    const label = (attrs.match(/value="([^"]*)"/)?.[1] ?? "")
      .replace(/&lt;[^&]*&gt;/g, "")
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

function parseStairCenters(cells, shape = "mxgraph.signs.travel.upstairs") {
  return cells
    .filter((c) => c.shape === shape)
    .map((c) => iconCenter(c.svg))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function assignShaftCenters(stairs, elevators) {
  return {
    stairCenters: {
      saWest: stairs.find((s) => s.y < 100 && s.x < 200),
      saEast: stairs.find((s) => s.y < 100 && s.x > 400),
      sbWest: stairs.find((s) => s.y > 100 && s.y < 320 && s.x < 200),
      sbEast: stairs.find((s) => s.y > 100 && s.y < 320 && s.x > 400),
      scWest: stairs.find((s) => s.y > 320 && s.y < 520 && s.x < 200),
      scEast: stairs.find((s) => s.y > 320 && s.y < 520 && s.x > 400),
      sdWest: stairs.find((s) => s.y > 520 && s.x < 200),
      sdEast: stairs.find((s) => s.y > 520 && s.x > 400),
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

function groupToiletsByWing(icons) {
  const westSa = icons.filter((i) => i.svg.y < 120 && i.svg.x < 200);
  const eastSb = icons.filter(
    (i) => i.svg.y >= 120 && i.svg.y < 360 && i.svg.x > 300
  );
  const westSc = icons.filter(
    (i) => i.svg.y >= 320 && i.svg.y < 560 && i.svg.x < 200
  );
  const eastSd = icons.filter((i) => i.svg.y >= 520 && i.svg.x > 300);
  return {
    saWest: toiletBBox(westSa),
    sbEast: toiletBBox(eastSb),
    scWest: toiletBBox(westSc),
    sdEast: toiletBBox(eastSd),
  };
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

function parse1FZones(rects, cells) {
  const walkable = rects.filter((r) => r.fill === "#fcfcfc" && r.w > 30);
  const spine =
    walkable.find((r) => r.h >= 500 && r.x >= 200 && r.x <= 240) ?? null;
  const wingWalk = walkable.filter((r) => r.h <= 50 && r.w >= 180);
  const westCorridors = wingWalk
    .filter((r) => r.x < 100)
    .sort((a, b) => a.y - b.y);
  const eastCorridors = wingWalk
    .filter((r) => r.x > 300)
    .sort((a, b) => a.y - b.y);

  const rooms = Object.fromEntries(
    cells
      .filter((c) => c.label && c.svg.w > 30)
      .map((c) => [c.label, { ...c.svg }])
  );

  const stairs = parseStairCenters(
    cells,
    "mxgraph.signs.travel.stairs"
  );
  const elevators = groupElevatorBanks(cells);
  const { stairCenters, elevatorCenters } = assignShaftCenters(
    stairs,
    elevators
  );
  const toilets = groupToiletsByWing(parseToiletIcons(cells));

  return {
    spine,
    corridors: {
      westSa: westCorridors[0] ?? null,
      westSb: westCorridors[1] ?? null,
      westSd: westCorridors[2] ?? null,
      eastSa: eastCorridors[0] ?? null,
      eastSb: eastCorridors[1] ?? null,
      eastSc: eastCorridors[2] ?? null,
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
  return base;
}

const target = process.argv[2] ?? "all";
const floors = target === "all" ? Object.keys(FLOORS) : [target];

for (const floorId of floors) {
  if (!FLOORS[floorId]) {
    console.error(`Unknown floor: ${floorId}`);
    process.exit(1);
  }
  const data = parseFloor(floorId);
  console.log(JSON.stringify(data, null, 2));
}
