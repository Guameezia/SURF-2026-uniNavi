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

  const sortedFloors = [...floors].reverse();

  return (
    <div
      className="floor-selector"
      style={{ flexDirection: vertical ? "column" : "row" }}
    >
      {sortedFloors.map((floor) => {
        const isActive = floor.id === currentFloorId;
        const hasRoute = hasRouteOnFloor(routeResult, floor.id);

        return (
          <button
            key={floor.id}
            type="button"
            className={`floor-selector-btn${isActive ? " active" : ""}`}
            onClick={() => setCurrentFloor(floor.id)}
          >
            {floor.name}
            {hasRoute && <span className="floor-route-dot" title="该楼层有路径" />}
          </button>
        );
      })}
    </div>
  );
};

export const FloorSelectorCompact: React.FC = () => {
  const { floors, currentFloorId, routeResult, setCurrentFloor } = useMapStore();

  if (floors.length === 0) {
    return null;
  }

  return (
    <div className="floor-selector-compact" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 14, color: "var(--gather-text-muted)" }}>楼层:</label>
      <select
        className="route-field select"
        value={currentFloorId}
        onChange={(e) => setCurrentFloor(e.target.value as FloorId)}
        style={{ padding: "6px 12px", borderRadius: 10 }}
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
