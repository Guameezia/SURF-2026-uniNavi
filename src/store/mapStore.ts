/**
 * 地图状态管理 - Zustand Store
 */

import { create } from "zustand";
import type {
  FloorId,
  Floor,
  RouteResult,
  Graph,
  POI,
  RouteMode,
  ComputedRoute,
  NavigationUIPhase,
} from "../types/indoor";
import type { RoomRoutePlan } from "../algorithms/routeRoomBridge";
import {
  buildRoomRoutePlan,
  getEntryRoomForFloor,
} from "../algorithms/routeRoomBridge";
import { hasRoomNavigation } from "../data/roomConfig";

interface MapState {
  floors: Floor[];
  currentFloorId: FloorId;
  floorFocusNodeId: string | null;
  floorEntryRoomId: string | null;
  selectedPOIId: string | null;
  routeResult: RouteResult | null;
  graph: Graph | null;
  pois: POI[];

  uiPhase: NavigationUIPhase;
  comfortRoute: ComputedRoute | null;
  fastRoute: ComputedRoute | null;
  selectedRouteMode: RouteMode;
  hasMultipleRoutes: boolean;
  roomRoutePlan: RoomRoutePlan | null;

  isLoading: boolean;
  error: string | null;

  initializeMap: (graph: Graph, pois: POI[], floors: Floor[]) => void;
  setCurrentFloor: (floorId: FloorId) => void;
  transitionToFloor: (
    floorId: FloorId,
    focusNodeId?: string | null,
    entryRoomId?: string | null
  ) => void;
  clearFloorFocus: () => void;
  clearFloorEntry: () => void;
  selectPOI: (poiId: string | null) => void;
  setRoute: (result: RouteResult) => void;
  setDualRoutes: (
    comfort: ComputedRoute,
    fast: ComputedRoute,
    hasMultipleRoutes: boolean
  ) => void;
  setRouteMode: (mode: RouteMode) => void;
  clearRoute: () => void;
  beginEditingRoute: () => void;
  setError: (error: string | null) => void;
}

function resolveActiveRoute(
  comfort: ComputedRoute,
  fast: ComputedRoute,
  mode: RouteMode
): ComputedRoute {
  const active = mode === "fast" ? fast : comfort;
  return active.found ? active : comfort.found ? comfort : fast;
}

function applyRouteState(
  route: ComputedRoute,
  graph: Graph | null,
  mode: RouteMode,
  hasMultipleRoutes: boolean,
  comfort: ComputedRoute,
  fast: ComputedRoute,
  prevFloorId: FloorId
): Pick<
  MapState,
  | "comfortRoute"
  | "fastRoute"
  | "hasMultipleRoutes"
  | "routeResult"
  | "roomRoutePlan"
  | "uiPhase"
  | "currentFloorId"
  | "floorEntryRoomId"
  | "floorFocusNodeId"
  | "selectedRouteMode"
> {
  const roomRoutePlan =
    route.found && graph ? buildRoomRoutePlan(graph, route) : null;

  const firstFloor =
    route.found && route.segments.length > 0
      ? route.segments[0].floorId
      : prevFloorId;

  const entryRoomId =
    route.found && hasRoomNavigation(firstFloor)
      ? getEntryRoomForFloor(roomRoutePlan, firstFloor)
      : null;

  return {
    comfortRoute: comfort,
    fastRoute: fast,
    hasMultipleRoutes,
    routeResult: route.found ? route : null,
    roomRoutePlan,
    uiPhase: route.found ? "navigating" : "idle",
    currentFloorId: firstFloor,
    floorEntryRoomId: entryRoomId,
    floorFocusNodeId: null,
    selectedRouteMode: mode,
  };
}

export const useMapStore = create<MapState>((set, get) => ({
  floors: [],
  currentFloorId: "0F",
  floorFocusNodeId: null,
  floorEntryRoomId: null,
  selectedPOIId: null,
  routeResult: null,
  graph: null,
  pois: [],
  uiPhase: "idle",
  comfortRoute: null,
  fastRoute: null,
  selectedRouteMode: "comfort",
  hasMultipleRoutes: false,
  roomRoutePlan: null,
  isLoading: true,
  error: null,

  initializeMap: (graph, pois, floors) => {
    const prefer0F = floors.find((f) => f.id === "0F");
    set({
      graph,
      pois,
      floors,
      currentFloorId: prefer0F?.id ?? (floors.length > 0 ? floors[0].id : "0F"),
      isLoading: false,
      error: null,
    });
  },

  setCurrentFloor: (floorId) => {
    const { uiPhase, roomRoutePlan } = get();
    let entryRoomId: string | null = null;
    let focusNodeId: string | null = null;

    if (uiPhase === "navigating" && roomRoutePlan) {
      if (hasRoomNavigation(floorId)) {
        entryRoomId = getEntryRoomForFloor(roomRoutePlan, floorId);
      }
    }

    set({
      currentFloorId: floorId,
      floorFocusNodeId: entryRoomId ? null : focusNodeId,
      floorEntryRoomId: entryRoomId,
    });
  },

  transitionToFloor: (floorId, focusNodeId = null, entryRoomId = null) => {
    set({
      currentFloorId: floorId,
      floorEntryRoomId: entryRoomId ?? null,
      floorFocusNodeId: entryRoomId ? null : (focusNodeId ?? null),
    });
  },

  clearFloorFocus: () => {
    set({ floorFocusNodeId: null });
  },

  clearFloorEntry: () => {
    set({ floorEntryRoomId: null });
  },

  selectPOI: (poiId) => {
    set({ selectedPOIId: poiId });
  },

  setRoute: (result) => {
    const { graph } = get();
    const roomRoutePlan =
      result.found && graph ? buildRoomRoutePlan(graph, result) : null;

    set(() => {
      if (result.found && result.segments.length > 0) {
        const floorId = result.segments[0].floorId;
        const entryRoomId = hasRoomNavigation(floorId)
          ? getEntryRoomForFloor(roomRoutePlan, floorId)
          : null;
        return {
          routeResult: result,
          roomRoutePlan,
          currentFloorId: floorId,
          floorEntryRoomId: entryRoomId,
          floorFocusNodeId: entryRoomId ? null : get().floorFocusNodeId,
        };
      }
      return { routeResult: result, roomRoutePlan };
    });
  },

  setDualRoutes: (comfort, fast, hasMultipleRoutes) => {
    const { graph, selectedRouteMode, currentFloorId } = get();
    const route = resolveActiveRoute(comfort, fast, selectedRouteMode);
    set(
      applyRouteState(
        route,
        graph,
        selectedRouteMode,
        hasMultipleRoutes,
        comfort,
        fast,
        currentFloorId
      )
    );
  },

  setRouteMode: (mode) => {
    const { comfortRoute, fastRoute, graph, hasMultipleRoutes, currentFloorId } =
      get();
    if (!comfortRoute || !fastRoute) {
      set({ selectedRouteMode: mode });
      return;
    }

    const route = mode === "fast" ? fastRoute : comfortRoute;
    if (!route?.found) {
      set({ selectedRouteMode: mode });
      return;
    }

    set(
      applyRouteState(
        route,
        graph,
        mode,
        hasMultipleRoutes,
        comfortRoute,
        fastRoute,
        currentFloorId
      )
    );
  },

  clearRoute: () => {
    set({
      routeResult: null,
      comfortRoute: null,
      fastRoute: null,
      hasMultipleRoutes: false,
      roomRoutePlan: null,
      uiPhase: "idle",
      selectedRouteMode: "comfort",
      floorEntryRoomId: null,
    });
  },

  beginEditingRoute: () => {
    set({
      routeResult: null,
      comfortRoute: null,
      fastRoute: null,
      hasMultipleRoutes: false,
      roomRoutePlan: null,
      uiPhase: "idle",
      selectedRouteMode: "comfort",
      floorEntryRoomId: null,
    });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },
}));

export function hasRouteOnFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
): boolean {
  if (!routeResult || !routeResult.found) return false;
  return routeResult.segments.some((seg) => seg.floorId === floorId);
}

export function getRouteSegmentForFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
) {
  if (!routeResult || !routeResult.found) return null;
  return routeResult.segments.find((seg) => seg.floorId === floorId) || null;
}

export function getFloorsWithRoute(routeResult: RouteResult | null): FloorId[] {
  if (!routeResult || !routeResult.found) return [];
  return routeResult.segments.map((seg) => seg.floorId);
}
