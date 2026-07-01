import type { RoomDef } from "../../types/room";

interface RoomPlaceholderProps {
  room: RoomDef;
}

export function RoomPlaceholder({ room }: RoomPlaceholderProps) {
  const { viewWidth: w, viewHeight: h, label } = room;
  const isCanteen = room.id.includes("canteen");

  return (
    <svg
      className="room-placeholder"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      <defs>
        <linearGradient id="room-ph-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isCanteen ? "#f5ebe0" : "#eceff1"} />
          <stop offset="100%" stopColor={isCanteen ? "#e8d5c4" : "#cfd8dc"} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#room-ph-bg)" />
      <rect
        x={w * 0.12}
        y={h * 0.18}
        width={w * 0.76}
        height={h * 0.64}
        rx={8}
        fill="rgba(255,255,255,0.55)"
        stroke="#90a4ae"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <text
        x={w / 2}
        y={h / 2 - 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#455a64"
        fontSize={28}
        fontWeight="600"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        {label}
      </text>
      <text
        x={w / 2}
        y={h / 2 + 22}
        textAnchor="middle"
        fill="#78909c"
        fontSize={14}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        Placeholder · 贴图待替换
      </text>
    </svg>
  );
}
