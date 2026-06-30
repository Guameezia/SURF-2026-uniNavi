/**
 * 室内地图 SVG 组件
 * 单层 SVG：背景图与路网叠加层共用同一 viewBox，确保缩放一致
 */

import React, { useCallback } from "react";
import { useMapStore, getRouteSegmentForFloor } from "../../store/mapStore";
import { getMapAssetPath } from "../../data";
import type { MapNode, FloorId } from "../../types/indoor";
import { getFloorNodes, getFloorEdges, getEdge } from "../../algorithms/graph";
import {
  getFloorMapConfig,
  toSvgPoint,
  POINT_NUDGE,
} from "../../utils/mapCoords";
import { buildOrthogonalPath } from "../../utils/orthogonalPath";
import { getEdgePathPoints } from "../../algorithms/orthogonalGraph";

// 节点样式配置
const NODE_STYLES: Record<string, { fill: string; r: number }> = {
  room: { fill: "#4CAF50", r: 6 },
  toilet: { fill: "#2196F3", r: 6 },
  exit: { fill: "#FF9800", r: 7 },
  elevator: { fill: "#9C27B0", r: 7 },
  stairs: { fill: "#E91E63", r: 7 },
  junction: { fill: "#9E9E9E", r: 2 },
};

interface IndoorMapSVGProps {
  floorId?: FloorId;
  /** 调试模式：显示路网节点、边和路径标记 */
  debugMode?: boolean;
  showJunctions?: boolean;
  showLabels?: boolean;
  /** 叠加在底图上的 SVG 内容（如 0F 房间热区） */
  mapOverlay?: React.ReactNode;
}

export const IndoorMapSVG: React.FC<IndoorMapSVGProps> = ({
  floorId: propFloorId,
  debugMode = false,
  showJunctions = false,
  showLabels = true,
  mapOverlay,
}) => {
  const { graph, currentFloorId, selectedPOIId, routeResult, selectPOI } =
    useMapStore();

  const activeFloorId = propFloorId || currentFloorId;
  const mapConfig = getFloorMapConfig(activeFloorId);
  const { width, height } = mapConfig;

  const floorNodes = graph ? getFloorNodes(graph, activeFloorId) : [];
  const floorEdges = graph ? getFloorEdges(graph, activeFloorId) : [];
  const currentRouteSegment = getRouteSegmentForFloor(routeResult, activeFloorId);
  const mapPath = getMapAssetPath("S", activeFloorId);

  const svgPoint = useCallback(
    (x: number, y: number) => toSvgPoint(activeFloorId, x, y),
    [activeFloorId]
  );

  const handleNodeClick = useCallback(
    (node: MapNode, e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type !== "junction") {
        selectPOI(node.id);
      }
    },
    [selectPOI]
  );

  const renderEdges = () => {
    if (!graph || !debugMode) return null;

    return floorEdges.map((edge, index) => {
      const fromNode = graph.nodesById[edge.from];
      const toNode = graph.nodesById[edge.to];
      if (!fromNode || !toNode) return null;

      const graphEdge =
        getEdge(graph, edge.from, edge.to) ||
        getEdge(graph, edge.to, edge.from);
      const pagePoints = graphEdge
        ? getEdgePathPoints(graphEdge, graph.nodesById)
        : [
            { x: fromNode.x, y: fromNode.y },
            { x: toNode.x, y: toNode.y },
          ];
      const svgPoints = pagePoints.map((p) => svgPoint(p.x, p.y));

      const pathData = svgPoints
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

      return (
        <path
          key={`edge-${index}`}
          d={pathData}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={3}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      );
    });
  };

  const renderRoute = () => {
    if (
      !graph ||
      !currentRouteSegment ||
      currentRouteSegment.points.length < 2
    )
      return null;

    const orthogonalPoints = buildOrthogonalPath(
      currentRouteSegment.points,
      currentRouteSegment.nodeIds,
      graph
    );

    const svgPoints = orthogonalPoints.map((p) => svgPoint(p.x, p.y));

    const pathData = svgPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <g className="route-layer">
        <path
          d={pathData}
          fill="none"
          stroke="#1976D2"
          strokeWidth={8}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
        <path
          d={pathData}
          fill="none"
          stroke="#1976D2"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
        {debugMode &&
          svgPoints.map((point, index) => (
            <circle
              key={`route-point-${index}`}
              cx={point.x}
              cy={point.y}
              r={
                index === 0 || index === svgPoints.length - 1 ? 8 : 4
              }
              fill={
                index === 0
                  ? "#4CAF50"
                  : index === svgPoints.length - 1
                  ? "#F44336"
                  : "#1976D2"
              }
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
      </g>
    );
  };

  const renderNodes = () => {
    if (!debugMode) return null;

    return floorNodes.map((node) => {
      if (node.type === "junction" && !showJunctions) return null;
      if (node.id.startsWith("__corner__")) return null;

      const style = NODE_STYLES[node.type] || NODE_STYLES.junction;
      const isSelected = node.id === selectedPOIId;
      const isOnRoute =
        currentRouteSegment?.nodeIds.includes(node.id) ?? false;
      const { x, y } = svgPoint(node.x, node.y);

      return (
        <g
          key={node.id}
          className={`map-node ${node.type} ${isSelected ? "selected" : ""}`}
          onClick={(e) => handleNodeClick(node, e)}
          style={{ cursor: node.type !== "junction" ? "pointer" : "default" }}
        >
          {isSelected && (
            <circle
              cx={x}
              cy={y}
              r={style.r + 6}
              fill="none"
              stroke="#FF5722"
              strokeWidth={3}
              strokeDasharray="4 2"
            />
          )}
          <circle
            cx={x}
            cy={y}
            r={isOnRoute ? style.r + 2 : style.r}
            fill={style.fill}
            stroke={isSelected ? "#FF5722" : "#fff"}
            strokeWidth={isSelected ? 2 : 1}
          />
          {showLabels && node.type !== "junction" && node.label && (
            <text
              x={x}
              y={y - style.r - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#333"
              style={{ pointerEvents: "none" }}
            >
              {node.label}
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="indoor-map-container">
      <svg
        className="indoor-map-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <image
          href={mapPath}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
        <g
          className="indoor-map-overlay"
          transform={`translate(${POINT_NUDGE.x}, ${POINT_NUDGE.y})`}
        >
          <g className="edges-layer">{renderEdges()}</g>
          {renderRoute()}
          <g className="nodes-layer">{renderNodes()}</g>
        </g>
        {mapOverlay && (
          <g className="map-custom-overlay">{mapOverlay}</g>
        )}
      </svg>

      <div className="indoor-map-floor-label">{activeFloorId}</div>

      {debugMode && (
        <div className="indoor-map-debug-badge">调试模式</div>
      )}
    </div>
  );
};

export default IndoorMapSVG;
