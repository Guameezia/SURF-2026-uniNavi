import { create } from "zustand";

export type ExploreViewMode = "floor" | "room";

interface ExploreState {
  viewMode: ExploreViewMode;
  activeRoomId: string | null;
  minimapExpanded: boolean;
  leafDropMode: boolean;
  enterRoom: (roomId: string) => void;
  exitToFloorMap: () => void;
  reset: () => void;
  setMinimapExpanded: (expanded: boolean) => void;
  setLeafDropMode: (enabled: boolean) => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
  viewMode: "floor",
  activeRoomId: null,
  minimapExpanded: false,
  leafDropMode: false,

  enterRoom: (roomId) =>
    set({
      viewMode: "room",
      activeRoomId: roomId,
      leafDropMode: false,
    }),

  exitToFloorMap: () =>
    set({
      viewMode: "floor",
      leafDropMode: false,
    }),

  reset: () =>
    set({
      viewMode: "floor",
      activeRoomId: null,
      minimapExpanded: false,
      leafDropMode: false,
    }),

  setMinimapExpanded: (expanded) => set({ minimapExpanded: expanded }),

  setLeafDropMode: (enabled) => set({ leafDropMode: enabled }),
}));
