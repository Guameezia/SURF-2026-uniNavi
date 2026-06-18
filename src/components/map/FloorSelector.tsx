/**
 * 楼层选择器组件
 */

import React from "react";
import { useMapStore, hasRouteOnFloor } from "../../store/mapStore";
import type { FloorId } from "../../types/indoor";

interface FloorSelectorProps {
  vertical?: boolean;
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({
  vertical = true,
}) => {
  const { floors, currentFloorId, routeResult, setCurrentFloor } = useMapStore();

  if (floors.length === 0) {
    return null;
  }

  // 倒序显示楼层（高层在上）
  const sortedFloors = [...floors].reverse();

  return (
    <div
      className="floor-selector"
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        gap: 4,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {sortedFloors.map((floor) => {
        const isActive = floor.id === currentFloorId;
        const hasRoute = hasRouteOnFloor(routeResult, floor.id);

        return (
          <button
            key={floor.id}
            onClick={() => setCurrentFloor(floor.id)}
            style={{
              position: "relative",
              minWidth: 48,
              height: 40,
              padding: "8px 12px",
              border: isActive ? "2px solid #1976D2" : "1px solid #ddd",
              borderRadius: 6,
              backgroundColor: isActive ? "#E3F2FD" : "#fff",
              color: isActive ? "#1976D2" : "#333",
              fontWeight: isActive ? "bold" : "normal",
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "#fff";
              }
            }}
          >
            {floor.name}
            {/* 路径标记 */}
            {hasRoute && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#1976D2",
                }}
                title="该楼层有路径"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * 紧凑型楼层选择器（水平下拉）
 */
export const FloorSelectorCompact: React.FC = () => {
  const { floors, currentFloorId, routeResult, setCurrentFloor } = useMapStore();

  if (floors.length === 0) {
    return null;
  }

  return (
    <div className="floor-selector-compact" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 14, color: "#666" }}>楼层:</label>
      <select
        value={currentFloorId}
        onChange={(e) => setCurrentFloor(e.target.value as FloorId)}
        style={{
          padding: "6px 12px",
          fontSize: 14,
          border: "1px solid #ddd",
          borderRadius: 4,
          backgroundColor: "#fff",
          cursor: "pointer",
        }}
      >
        {floors.map((floor) => {
          const hasRoute = hasRouteOnFloor(routeResult, floor.id);
          return (
            <option key={floor.id} value={floor.id}>
              {floor.name} {hasRoute ? "•" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default FloorSelector;
