/** 像素调色板键 → 颜色，'.' 表示透明 */
export type PixelRow = string;

export interface PixelSpriteDef {
  rows: PixelRow[];
  palette: Record<string, string | null>;
  /** 每个像素格在 SVG 里的边长 */
  pixelSize?: number;
}

/** 8-bit 小叶子 */
export const PIXEL_LEAF: PixelSpriteDef = {
  pixelSize: 2,
  palette: {
    ".": null,
    o: "#1a4a10",
    G: "#8cc832",
    g: "#c8ee55",
    l: "#e8ff90",
  },
  rows: [
    "..o.....",
    ".oggo...",
    ".ogggo..",
    "ogggggo.",
    "oggggggo",
    "oggggggo",
    ".ogggo..",
    ".oggo...",
    "..oo....",
  ],
};

/** 像素桌椅套装（含地毯） */
export const PIXEL_TABLE_SET: PixelSpriteDef = {
  pixelSize: 3,
  palette: {
    ".": null,
    o: "#1a1a1a",
    r: "#5a8a38",
    R: "#4a7830",
    b: "#4a90c8",
    B: "#3a78b0",
    t: "#a06830",
    T: "#7a5020",
    c: "#e8c830",
    C: "#c8a820",
  },
  rows: [
    "....rrrrrr....",
    "...rrrrrrrr...",
    "..rrrrrrrrrr..",
    ".rrrrtttttttt.",
    "rrrrtttttttttt",
    "rrrrtttttttttt",
    "ccrrttttttttcc",
    "ccrrttttttttcc",
    ".rrrrtttttttt.",
    "..rrrrrrrrrr..",
    "...rrrrrrrr...",
    "....rrrrrr....",
  ],
};

export const PIXEL_TABLE_SET_BLUE: PixelSpriteDef = {
  ...PIXEL_TABLE_SET,
  palette: {
    ...PIXEL_TABLE_SET.palette,
    r: "#5a90c8",
    R: "#4a78b0",
  },
};
