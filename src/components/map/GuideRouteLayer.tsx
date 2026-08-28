/**
 * 攻略路线 SVG 图层 — 橙色折线 + 站点序号
 */

import type { FloorId, Graph } from "../../types/indoor";
import type { GuideRouteGeometry } from "../../types/guide";
import { geometryPathsOnFloor } from "../../algorithms/guideRouteGeometry";
import { POINT_NUDGE } from "../../utils/mapCoords";

interface GuideRouteLayerProps {
  floorId: FloorId;
  geometry: GuideRouteGeometry;
  graph: Graph;
  activeLegIndex: number | null;
  onStopClick?: (stopIndex: number) => void;
}

export function GuideRouteLayer({
  floorId,
  geometry,
  graph,
  activeLegIndex,
  onStopClick,
}: GuideRouteLayerProps) {
  const paths = geometryPathsOnFloor(geometry, graph, floorId, activeLegIndex);
  const stopsOnFloor = geometry.stopAnchors.filter((a) => a.floorId === floorId);

  return (
    <g className="guide-route-layer" transform={`translate(${POINT_NUDGE.x}, ${POINT_NUDGE.y})`}>
      {paths.map((path, index) => (
        <g key={`leg-${path.legIndex}-${index}`} pointerEvents="none">
          <path
            d={path.d}
            fill="none"
            stroke="#f57c00"
            strokeWidth={path.active ? 8 : 6}
            strokeOpacity={path.active ? 0.28 : 0.12}
            strokeLinecap="round"
            strokeLinejoin="miter"
          />
          <path
            d={path.d}
            fill="none"
            stroke="#ef6c00"
            strokeWidth={path.active ? 4.5 : 3}
            strokeOpacity={path.active ? 1 : 0.45}
            strokeLinecap="round"
            strokeLinejoin="miter"
            strokeDasharray={path.active ? undefined : "10 6"}
          />
        </g>
      ))}

      {stopsOnFloor.map((anchor) => (
        <g
          key={`stop-${anchor.stopIndex}`}
          className="guide-route-stop-marker"
          style={{ cursor: onStopClick ? "pointer" : undefined }}
          onClick={
            onStopClick
              ? (e) => {
                  e.stopPropagation();
                  onStopClick(anchor.stopIndex);
                }
              : undefined
          }
        >
          <circle
            cx={anchor.x}
            cy={anchor.y}
            r={14}
            fill="#ef6c00"
            stroke="#fff"
            strokeWidth={3}
          />
          <text
            x={anchor.x}
            y={anchor.y + 5}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill="#fff"
            pointerEvents="none"
          >
            {anchor.stopIndex + 1}
          </text>
        </g>
      ))}
    </g>
  );
}
