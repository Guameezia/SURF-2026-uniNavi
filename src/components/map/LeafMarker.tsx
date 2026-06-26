/**
 * 像素风叶子便签标记
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

export function LeafMarker({ x, y, seed = "leaf", onClick }: LeafMarkerProps) {
  const rotation = (hashSeed(seed) % 12) - 6;

  return (
    <g
      className="leaf-note-marker pixel-leaf-marker"
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <PixelArtSprite def={PIXEL_LEAF} centered />
    </g>
  );
}

/** 工具栏 / 提示条用的小号像素叶子 */
export function LeafIconMini({ size = 18 }: { size?: number }) {
  const scale = size / 18;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-9 -9 18 18"
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
