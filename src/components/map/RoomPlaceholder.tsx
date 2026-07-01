import type { RoomDef } from "../../types/room";

interface RoomPlaceholderProps {
  room: RoomDef;
}

/** 无 PNG 时的像素风占位（走廊 / 房间） */
export function RoomPlaceholder({ room }: RoomPlaceholderProps) {
  const { viewWidth: w, viewHeight: h, placeholder = "room", label } = room;
  const isCorridorH = placeholder === "corridor-h";
  const isCorridorV = placeholder === "corridor-v";
  const isStair = placeholder === "stair";
  const isShaft = placeholder === "shaft";
  const isVertical = isStair || isShaft;

  return (
    <svg
      className="room-placeholder"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
    >
      <rect width={w} height={h} fill="#ddb888" />
      {Array.from({ length: Math.ceil(w / 32) }).flatMap((_, i) =>
        Array.from({ length: Math.ceil(h / 32) }).map((_, j) =>
          (i + j) % 2 === 0 ? (
            <rect key={`${i}-${j}`} x={i * 32} y={j * 32} width={32} height={32} fill="#caa870" />
          ) : null
        )
      )}
      <rect x={0} y={0} width={w} height={12} fill="#d8c898" />
      <rect x={0} y={h - 12} width={w} height={12} fill="#d8c898" />
      <rect x={0} y={0} width={12} height={h} fill="#d8c898" />
      <rect x={w - 12} y={0} width={12} height={h} fill="#d8c898" />

      {isCorridorH && (
        <>
          <rect x={w * 0.15} y={h * 0.35} width={w * 0.7} height={h * 0.3} fill="#e8dcc0" />
          <rect x={w * 0.2} y={h * 0.42} width={w * 0.6} height={4} fill="#8b7355" />
        </>
      )}
      {isCorridorV && (
        <>
          <rect x={w * 0.35} y={h * 0.1} width={w * 0.3} height={h * 0.8} fill="#e8dcc0" />
          <rect x={w * 0.42} y={h * 0.15} width={4} height={h * 0.7} fill="#8b7355" />
        </>
      )}
      {!isCorridorH && !isCorridorV && !isVertical && (
        <rect x={w * 0.2} y={h * 0.25} width={w * 0.6} height={h * 0.5} fill="#e8dcc0" stroke="#8b7355" strokeWidth={3} />
      )}
      {isStair && (
        <>
          <rect x={w * 0.25} y={h * 0.35} width={w * 0.5} height={h * 0.35} fill="#b8a898" stroke="#6b5344" strokeWidth={3} />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={w * 0.28}
              y={h * (0.38 + i * 0.08)}
              width={w * (0.44 - i * 0.06)}
              height={h * 0.06}
              fill="#d8c8b8"
              stroke="#6b5344"
              strokeWidth={2}
            />
          ))}
          <text x={w / 2} y={h * 0.28} textAnchor="middle" fill="#5a4030" fontSize={22} fontWeight="700">
            ↑
          </text>
        </>
      )}
      {isShaft && (
        <>
          <rect x={w * 0.55} y={h * 0.22} width={w * 0.14} height={w * 0.14} fill="#c8d8e8" stroke="#4a6080" strokeWidth={2} />
          <rect x={w * 0.71} y={h * 0.22} width={w * 0.14} height={w * 0.14} fill="#c8d8e8" stroke="#4a6080" strokeWidth={2} />
          <line x1={w * 0.62} y1={h * 0.28} x2={w * 0.78} y2={h * 0.34} stroke="#4a6080" strokeWidth={2} />
          <line x1={w * 0.78} y1={h * 0.28} x2={w * 0.62} y2={h * 0.34} stroke="#4a6080" strokeWidth={2} />
          <rect x={w * 0.55} y={h * 0.48} width={w * 0.3} height={h * 0.28} fill="#b8a898" stroke="#6b5344" strokeWidth={3} />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={w * 0.58}
              y={h * (0.52 + i * 0.07)}
              width={w * (0.24 - i * 0.04)}
              height={h * 0.05}
              fill="#d8c8b8"
              stroke="#6b5344"
              strokeWidth={2}
            />
          ))}
          <text x={w / 2} y={h * 0.18} textAnchor="middle" fill="#5a4030" fontSize={22} fontWeight="700">
            ↑
          </text>
        </>
      )}

      <text
        x={w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#5a4030"
        fontSize={18}
        fontWeight="700"
        fontFamily="Segoe UI, sans-serif"
      >
        {label}
      </text>
      <text x={w / 2} y={h / 2 + 28} textAnchor="middle" fill="#8b7355" fontSize={12} fontFamily="Segoe UI, sans-serif">
        {isVertical ? "上楼 · 自动切换到 1F" : "（占位 · 待替换像素图）"}
      </text>
    </svg>
  );
}
