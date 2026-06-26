import type { FloorId } from "../../types/indoor";
import { getPixelZonesForFloor } from "../../data/pixelZones";
import { PixelZoneLayer } from "./PixelZoneLayer";

interface PixelZonesProps {
  building: string;
  floorId: FloorId;
  toDisplay: (x: number, y: number) => { x: number; y: number };
}

export function PixelZones({ building, floorId, toDisplay }: PixelZonesProps) {
  const zones = getPixelZonesForFloor(building, floorId);
  if (zones.length === 0) return null;

  return (
    <g className="pixel-zones">
      {zones.map((zone) => (
        <PixelZoneLayer key={zone.id} zone={zone} toDisplay={toDisplay} />
      ))}
    </g>
  );
}
