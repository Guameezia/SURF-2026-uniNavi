import { useState } from "react";
import type { RoomDef } from "../../types/room";

interface RoomHotspotLayerProps {
  rooms: RoomDef[];
  debugMode?: boolean;
  onRoomClick: (roomId: string) => void;
}

export function RoomHotspotLayer({
  rooms,
  debugMode = false,
  onRoomClick,
}: RoomHotspotLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {rooms.map((room) => {
        const { x, y, w, h } = room.overviewRect;
        const isHovered = hoveredId === room.id;

        let fill = "rgba(25, 118, 210, 0)";
        let stroke = "transparent";
        let strokeWidth = 0;

        if (debugMode) {
          fill = "rgba(25, 118, 210, 0.12)";
          stroke = "#1976d2";
          strokeWidth = 2;
        } else if (isHovered) {
          fill = "rgba(25, 118, 210, 0.15)";
          stroke = "rgba(25, 118, 210, 0.5)";
          strokeWidth = 2;
        }

        return (
          <g key={room.id} className="room-hotspot">
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={debugMode ? "6 4" : undefined}
              className="room-hotspot-hit"
              style={{ cursor: "pointer", transition: "fill 0.15s, stroke 0.15s" }}
              onClick={(e) => {
                e.stopPropagation();
                onRoomClick(room.id);
              }}
              onMouseEnter={() => setHoveredId(room.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
            {debugMode && (
              <text
                x={x + w / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="#1565c0"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {room.label}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
