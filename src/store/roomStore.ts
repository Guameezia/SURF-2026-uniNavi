import { create } from "zustand";
import type { FloorId } from "../types/indoor";
import type { Direction } from "../types/room";
import {
  getDefaultRoomId,
  getRoomById,
  hasRoomNavigation,
} from "../data/roomConfig";

interface RoomState {
  currentRoomId: string | null;
  visitedRoomIds: string[];
  initForFloor: (floorId: FloorId) => void;
  setRoom: (roomId: string) => void;
  move: (floorId: FloorId, direction: Direction) => boolean;
}

function markVisited(list: string[], roomId: string): string[] {
  return list.includes(roomId) ? list : [...list, roomId];
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoomId: null,
  visitedRoomIds: [],

  initForFloor: (floorId) => {
    if (!hasRoomNavigation(floorId)) {
      set({ currentRoomId: null, visitedRoomIds: [] });
      return;
    }
    const defaultId = getDefaultRoomId(floorId);
    if (!defaultId) return;
    set({
      currentRoomId: defaultId,
      visitedRoomIds: [defaultId],
    });
  },

  setRoom: (roomId) => {
    set((state) => ({
      currentRoomId: roomId,
      visitedRoomIds: markVisited(state.visitedRoomIds, roomId),
    }));
  },

  move: (floorId, direction) => {
    const { currentRoomId } = get();
    if (!currentRoomId) return false;
    const room = getRoomById(floorId, currentRoomId);
    const nextId = room?.neighbors[direction];
    if (!nextId) return false;
    get().setRoom(nextId);
    return true;
  },
}));
