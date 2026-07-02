/**
 * 统一地图视口：按楼层策略切换 CAD 整层图 / 分房间导航
 */

import { useMapStore } from "../../store/mapStore";
import { hasRoomNavigation } from "../../data/roomConfig";
import { IndoorMapSVG } from "./IndoorMapSVG";
import { RoomMapView } from "./RoomMapView";

interface MapViewportProps {
  debugMode?: boolean;
}

export function MapViewport({ debugMode = false }: MapViewportProps) {
  const { currentFloorId } = useMapStore();
  const useRoomMode = hasRoomNavigation(currentFloorId);

  return (
    <div className="map-container">
      {useRoomMode ? (
        <RoomMapView debugMode={debugMode} />
      ) : (
        <IndoorMapSVG debugMode={debugMode} />
      )}
    </div>
  );
}

/** @deprecated 使用 MapViewport */
export const MapView = MapViewport;

export default MapViewport;
