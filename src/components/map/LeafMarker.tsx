/**
 * 像素风叶子便签标记（座位级尺寸）
 */

import { PixelArtSprite } from "./pixel/PixelArtSprite";
import { PIXEL_LEAF } from "./pixel/sprites";

interface LeafMarkerProps {
  x: number;
  y: number;
  seed?: string;
  onClick?: (e: React.MouseEvent) => void;
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 地图上的便签叶子：视觉约 7px，点击热区稍大 */
export function LeafMarker({ x, y, seed = "leaf", onClick }: LeafMarkerProps) {
  const rotation = -18 + (hashSeed(seed) % 10) - 5;

  return (
    <g
      className="leaf-note-marker pixel-leaf-marker"
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <circle r={7} fill="transparent" stroke="none" />
      <PixelArtSprite def={PIXEL_LEAF} centered />
    </g>
  );
}

/** 工具栏 / 弹窗用的小号像素叶子（放大显示） */
export function LeafIconMini({ size = 16 }: { size?: number }) {
  const scale = size / 14;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-7 -7 14 14"
      aria-hidden="true"
      className="pixel-leaf-icon-mini"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <g transform={`scale(${scale})`}>
        <PixelArtSprite def={PIXEL_LEAF} centered />
      </g>
    </svg>
  );
}
