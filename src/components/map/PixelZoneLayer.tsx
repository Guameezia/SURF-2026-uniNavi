import type { PixelZoneDef } from "../../data/pixelZones";

interface PixelZoneLayerProps {
  zone: PixelZoneDef;
  toDisplay: (x: number, y: number) => { x: number; y: number };
}

export function PixelZoneLayer({ zone, toDisplay }: PixelZoneLayerProps) {
  const tl = toDisplay(zone.modelX, zone.modelY);
  const br = toDisplay(zone.modelX + zone.modelWidth, zone.modelY + zone.modelHeight);
  const width = br.x - tl.x;
  const height = br.y - tl.y;
  const src = zone.imageSrc ?? `/maps/zones/${zone.id}.png`;

  return (
    <g className="pixel-zone-layer" transform={`translate(${tl.x}, ${tl.y})`}>
      <image
        href={src}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
        className="pixel-zone-image"
      />
    </g>
  );
}
