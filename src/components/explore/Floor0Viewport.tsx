import { useEffect } from "react";
import { useMapStore } from "../../store/mapStore";
import { useExploreStore } from "../../store/exploreStore";
import { getExploreRooms, getExploreRoomById } from "../../data/roomConfig";
import { IndoorMapSVG } from "../map/IndoorMapSVG";
import { RoomHotspotLayer } from "./RoomHotspotLayer";
import { RoomInteriorView } from "./RoomInteriorView";

interface Floor0ViewportProps {
  debugMode?: boolean;
}

export function Floor0Viewport({ debugMode = false }: Floor0ViewportProps) {
  const currentFloorId = useMapStore((s) => s.currentFloorId);
  const { viewMode, activeRoomId, enterRoom, reset } = useExploreStore();

  const rooms = getExploreRooms("0F");
  const activeRoom =
    activeRoomId && viewMode === "room"
      ? getExploreRoomById("0F", activeRoomId)
      : undefined;

  useEffect(() => {
    if (currentFloorId !== "0F") {
      reset();
    }
  }, [currentFloorId, reset]);

  if (viewMode === "room" && activeRoom) {
    return <RoomInteriorView room={activeRoom} />;
  }

  return (
    <IndoorMapSVG
      floorId="0F"
      debugMode={debugMode}
      mapOverlay={
        <RoomHotspotLayer
          rooms={rooms}
          debugMode={debugMode}
          onRoomClick={enterRoom}
        />
      }
    />
  );
}
