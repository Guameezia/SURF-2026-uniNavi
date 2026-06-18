/**
 * 室内地图 SVG 组件
 * 双层渲染：底层 SVG 背景图 + 顶层路网叠加层
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useMapStore, getRouteSegmentForFloor } from "../../store/mapStore";
import { getMapAssetPath } from "../../data";
import type { MapNode, FloorId } from "../../types/indoor";
import { getFloorNodes, getFloorEdges } from "../../algorithms/graph";

// 地图视口配置
const MAP_CONFIG = {
  width: 850,
  height: 950,
  minScale: 0.3,
  maxScale: 3,
  scaleStep: 0.1,
};

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
  showJunctions?: boolean;
  showLabels?: boolean;
}

export const IndoorMapSVG: React.FC<IndoorMapSVGProps> = ({
  floorId: propFloorId,
  showJunctions = false,
  showLabels = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, currentFloorId, selectedPOIId, routeResult, selectPOI } =
    useMapStore();

  // 使用 props 或 store 中的楼层
  const activeFloorId = propFloorId || currentFloorId;

  // 缩放和平移状态
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 获取当前楼层的节点和边
  const floorNodes = graph ? getFloorNodes(graph, activeFloorId) : [];
  const floorEdges = graph ? getFloorEdges(graph, activeFloorId) : [];

  // 获取当前楼层的路径段
  const currentRouteSegment = getRouteSegmentForFloor(routeResult, activeFloorId);

  // 地图背景路径
  const mapPath = getMapAssetPath("S", activeFloorId);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -MAP_CONFIG.scaleStep : MAP_CONFIG.scaleStep;
    setScale((prev) =>
      Math.min(MAP_CONFIG.maxScale, Math.max(MAP_CONFIG.minScale, prev + delta))
    );
  }, []);

  // 开始拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [translate]);

  // 拖拽中
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 点击节点
  const handleNodeClick = useCallback(
    (node: MapNode, e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type !== "junction") {
        selectPOI(node.id);
      }
    },
    [selectPOI]
  );

  // 重置视图
  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // 楼层变化时重置视图
  useEffect(() => {
    resetView();
  }, [activeFloorId, resetView]);

  // 渲染边
  const renderEdges = () => {
    if (!graph) return null;

    return floorEdges.map((edge, index) => {
      const fromNode = graph.nodesById[edge.from];
      const toNode = graph.nodesById[edge.to];
      if (!fromNode || !toNode) return null;

      return (
        <line
          key={`edge-${index}`}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke="#BDBDBD"
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
      );
    });
  };

  // 渲染路径
  const renderRoute = () => {
    if (!currentRouteSegment || currentRouteSegment.points.length < 2)
      return null;

    const pathData = currentRouteSegment.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return (
      <g className="route-layer">
        {/* 路径底层光晕 */}
        <path
          d={pathData}
          fill="none"
          stroke="#1976D2"
          strokeWidth={8}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 路径主线 */}
        <path
          d={pathData}
          fill="none"
          stroke="#1976D2"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 路径节点标记 */}
        {currentRouteSegment.points.map((point, index) => (
          <circle
            key={`route-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === 0 || index === currentRouteSegment.points.length - 1 ? 8 : 4}
            fill={
              index === 0
                ? "#4CAF50"
                : index === currentRouteSegment.points.length - 1
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

  // 渲染节点
  const renderNodes = () => {
    return floorNodes.map((node) => {
      // 根据配置决定是否显示 junction
      if (node.type === "junction" && !showJunctions) return null;

      const style = NODE_STYLES[node.type] || NODE_STYLES.junction;
      const isSelected = node.id === selectedPOIId;
      const isOnRoute =
        currentRouteSegment?.nodeIds.includes(node.id) ?? false;

      return (
        <g
          key={node.id}
          className={`map-node ${node.type} ${isSelected ? "selected" : ""}`}
          onClick={(e) => handleNodeClick(node, e)}
          style={{ cursor: node.type !== "junction" ? "pointer" : "default" }}
        >
          {/* 选中高亮 */}
          {isSelected && (
            <circle
              cx={node.x}
              cy={node.y}
              r={style.r + 6}
              fill="none"
              stroke="#FF5722"
              strokeWidth={3}
              strokeDasharray="4 2"
            />
          )}
          {/* 节点圆点 */}
          <circle
            cx={node.x}
            cy={node.y}
            r={isOnRoute ? style.r + 2 : style.r}
            fill={style.fill}
            stroke={isSelected ? "#FF5722" : "#fff"}
            strokeWidth={isSelected ? 2 : 1}
          />
          {/* 标签 */}
          {showLabels && node.type !== "junction" && node.label && (
            <text
              x={node.x}
              y={node.y - style.r - 4}
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
    <div
      ref={containerRef}
      className="indoor-map-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#f5f5f5",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 变换容器 */}
      <div
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -MAP_CONFIG.width / 2,
          marginTop: -MAP_CONFIG.height / 2,
        }}
      >
        {/* 底层：SVG 背景地图 */}
        <img
          src={mapPath}
          alt={`Floor ${activeFloorId}`}
          style={{
            width: MAP_CONFIG.width,
            height: MAP_CONFIG.height,
            display: "block",
            pointerEvents: "none",
          }}
          draggable={false}
        />

        {/* 顶层：路网叠加 SVG */}
        <svg
          width={MAP_CONFIG.width}
          height={MAP_CONFIG.height}
          viewBox={`0 0 ${MAP_CONFIG.width} ${MAP_CONFIG.height}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* 边层 */}
          <g className="edges-layer">{renderEdges()}</g>

          {/* 路径层 */}
          {renderRoute()}

          {/* 节点层 */}
          <g className="nodes-layer">{renderNodes()}</g>
        </svg>
      </div>

      {/* 控制按钮 */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={() => setScale((s) => Math.min(MAP_CONFIG.maxScale, s + 0.2))}
          style={controlButtonStyle}
          title="放大"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(MAP_CONFIG.minScale, s - 0.2))}
          style={controlButtonStyle}
          title="缩小"
        >
          -
        </button>
        <button
          onClick={resetView}
          style={controlButtonStyle}
          title="重置视图"
        >
          ⟲
        </button>
      </div>

      {/* 当前楼层标签 */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 4,
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        {activeFloorId}
      </div>
    </div>
  );
};

// 控制按钮样式
const controlButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 4,
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

export default IndoorMapSVG;
