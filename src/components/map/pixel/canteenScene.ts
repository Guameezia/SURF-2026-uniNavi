/**
 * 像素食堂场景 — 正俯视（Gather 视角）
 * 参照星露谷食堂参考图：U 形取餐台 + 4×3 餐桌 + 暖色地面
 */

export type Cell = string;

/** 暖色食堂调色板（参考图） */
export const CANTEEN_PALETTE: Record<string, string | null> = {
  ".": null,
  y: "#f3e8c4", // 墙面浅奶油
  Y: "#d8c898", // 墙边/阴影
  f: "#ddb888", // 地板 tan
  F: "#caa870", // 地板交替
  d: "#8b6018", // 走道边线
  D: "#6b4810", // 走道深色
  w: "#b87838", // 木质柜台
  W: "#905820", // 木柜深色
  s: "#b0b0a8", // 不锈钢餐槽
  t: "#f0f0e8", // 桌面白
  T: "#d8d8d0", // 桌面边
  c: "#d08030", // 椅子橙棕
  C: "#a86020", // 椅子深
  p: "#909090", // 立柱
  P: "#606060", // 立柱深
  b: "#88b8d8", // 窗户
  B: "#6898b8", // 窗框
  m: "#a06828", // 菜单板框
  M: "#704818", // 菜单板深
  o: "#e87840", // 餐食/图标
  r: "#d84848",
  g: "#58a838",
  l: "#f0c848",
  h: "#f8f0d0", // 餐盘高光
};

function createGrid(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
}

function fillRect(grid: Cell[][], x0: number, y0: number, x1: number, y1: number, cell: Cell) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = cell;
    }
  }
}

function stamp(grid: Cell[][], sprite: string[], atX: number, atY: number) {
  sprite.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const cell = row[dx];
      if (cell === ".") continue;
      const y = atY + dy;
      const x = atX + dx;
      if (grid[y]?.[x] !== undefined) grid[y][x] = cell;
    }
  });
}

/** 正俯视餐桌：左右各 2 把椅子，白桌 + 餐盘 */
const TABLE_TOP_DOWN = [
  "..cc.....cc..",
  "..cc.....cc..",
  "..TTTTTTTTT..",
  "..TTThThThT..",
  "..TTTTTTTTT..",
  "..cc.....cc..",
  "..cc.....cc..",
];

function drawCheckerFloor(grid: Cell[][], x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      grid[y][x] = (x + y) % 2 === 0 ? "f" : "F";
    }
  }
}

function drawPathBorder(grid: Cell[][], x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x < x1; x++) {
    grid[y0][x] = "d";
    grid[y1 - 1][x] = "d";
  }
  for (let y = y0; y < y1; y++) {
    grid[y][x0] = "d";
    grid[y][x1 - 1] = "d";
  }
}

function drawSideCounter(grid: Cell[][], x0: number, y0: number, x1: number, y1: number) {
  fillRect(grid, x0, y0, x1, y1, "w");
  fillRect(grid, x0, y0, x1, y0 + 1, "W");
  fillRect(grid, x0, y1 - 1, x1, y1, "W");
  // 不锈钢餐槽 + 彩色食物
  for (let y = y0 + 2; y < y1 - 2; y += 5) {
    fillRect(grid, x0 + 1, y, x1 - 1, y + 2, "s");
    const foods: Cell[] = ["o", "g", "r", "l"];
    grid[y + 1][x0 + 2] = foods[(y / 5) % foods.length];
    if (x1 - x0 > 4) grid[y + 1][x1 - 3] = foods[(y / 5 + 1) % foods.length];
  }
}

function drawMenuBoards(grid: Cell[][], y: number, x0: number, x1: number) {
  for (let x = x0; x < x1; x += 8) {
    fillRect(grid, x, y, Math.min(x + 6, x1), y + 2, "m");
    grid[y + 1][x + 2] = "o";
    grid[y + 1][x + 3] = "g";
    grid[y + 1][x + 4] = "r";
  }
}

/** 生成食堂内部像素网格（正俯视） */
export function buildCanteenGrid(cols: number, rows: number): Cell[][] {
  const grid = createGrid(cols, rows);

  // 1. 外墙 + 室内底色
  fillRect(grid, 0, 0, cols, rows, "y");
  fillRect(grid, 0, 0, cols, 2, "Y");
  fillRect(grid, 0, rows - 2, cols, rows, "Y");
  fillRect(grid, 0, 0, 2, rows, "Y");
  fillRect(grid, cols - 2, 0, cols, rows, "Y");

  // 2. 后墙：窗户 + 中央立柱 + 后方取餐窗
  const mid = Math.floor(cols / 2);
  fillRect(grid, mid - 3, 2, mid + 3, 8, "p");
  fillRect(grid, mid - 2, 2, mid + 2, 7, "P");
  fillRect(grid, 14, 2, 28, 7, "b");
  fillRect(grid, cols - 28, 2, cols - 14, 7, "b");
  fillRect(grid, 14, 2, 28, 3, "B");
  fillRect(grid, cols - 28, 2, cols - 14, 3, "B");

  // 3. 菜单板（后墙上方）
  drawMenuBoards(grid, 3, 8, cols - 8);

  // 4. 后方取餐台（后墙下方横条）
  fillRect(grid, 10, 8, cols - 10, 12, "w");
  fillRect(grid, 10, 8, cols - 10, 9, "W");
  for (let x = 14; x < cols - 14; x += 10) {
    fillRect(grid, x, 9, x + 7, 11, "s");
    grid[10][x + 3] = ["o", "g", "r", "l"][(x / 10) % 4];
  }

  // 5. 左右 U 形取餐台
  drawSideCounter(grid, 3, 12, 10, rows - 4);
  drawSideCounter(grid, cols - 10, 12, cols - 3, rows - 4);
  drawMenuBoards(grid, 11, 12, cols - 12);

  // 6. 中央用餐区：tan 地板 + 深棕走道边框
  const fx0 = 12,
    fy0 = 14,
    fx1 = cols - 12,
    fy1 = rows - 5;
  drawCheckerFloor(grid, fx0, fy0, fx1, fy1);
  drawPathBorder(grid, fx0, fy0, fx1, fy1);

  // 7. 12 张餐桌 4 列 × 3 行（正俯视）
  const tableCols = [20, 36, 52, 68];
  const tableRows = [18, 36, 54];
  for (const ty of tableRows) {
    for (const tx of tableCols) {
      stamp(grid, TABLE_TOP_DOWN, tx, ty);
    }
  }

  // 8. 下方入口（走道开口）
  fillRect(grid, mid - 4, rows - 4, mid + 4, rows - 2, "f");

  return grid;
}

export function gridToRects(
  grid: Cell[][],
  palette: Record<string, string | null>,
  pixelW: number,
  pixelH: number
) {
  const rects: { x: number; y: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      const fill = palette[cell];
      if (fill) rects.push({ x: x * pixelW, y: y * pixelH, fill });
    });
  });
  return rects;
}
