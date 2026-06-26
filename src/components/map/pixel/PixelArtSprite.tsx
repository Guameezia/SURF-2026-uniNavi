import type { ReactNode } from "react";
import type { PixelSpriteDef } from "./sprites";

interface PixelArtSpriteProps {
  def: PixelSpriteDef;
  /** 锚点：sprite 中心对齐到 (0,0) */
  centered?: boolean;
}

export function PixelArtSprite({ def, centered = true }: PixelArtSpriteProps) {
  const ps = def.pixelSize ?? 2;
  const w = def.rows[0]?.length ?? 0;
  const h = def.rows.length;
  const offsetX = centered ? (-w * ps) / 2 : 0;
  const offsetY = centered ? (-h * ps) / 2 : 0;

  const rects: ReactNode[] = [];
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      const fill = def.palette[key];
      if (!fill) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={offsetX + x * ps}
          y={offsetY + y * ps}
          width={ps}
          height={ps}
          fill={fill}
        />
      );
    }
  });

  return (
    <g className="pixel-art-sprite" shapeRendering="crispEdges">
      {rects}
    </g>
  );
}
