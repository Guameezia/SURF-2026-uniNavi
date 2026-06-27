/**
 * 地图视图：0F 使用分房间导航，其余楼层使用整层 CAD 图
 */

import { useMapStore } from "../../store/mapStore";
import { hasRoomNavigation } from "../../data/roomConfig";
import { IndoorMapSVG } from "./IndoorMapSVG";
import { RoomMapView } from "./RoomMapView";
import { FloorSelector } from "./FloorSelector";

export function MapView() {
  const { currentFloorId } = useMapStore();
  const useRoomMode = hasRoomNavigation(currentFloorId);

  return (
    <>
      <aside className="floor-selector-panel">
        <FloorSelector />
      </aside>
      <div className="map-container">
        {useRoomMode ? <RoomMapView /> : <IndoorMapSVG />}
      </div>
    </>
  );
}
