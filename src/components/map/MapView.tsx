/**
 * 地图视图：0F / 1F 使用分房间导航，其余楼层使用整层 CAD 图
 */

import { useMapStore } from "../../store/mapStore";
import { hasRoomNavigation } from "../../data/roomConfig";
import { IndoorMapSVG } from "./IndoorMapSVG";
import { RoomMapView } from "./RoomMapView";

interface MapViewProps {
  debugMode?: boolean;
}

export function MapView({ debugMode = false }: MapViewProps) {
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
