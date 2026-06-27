/**
 * 地图状态管理 - Zustand Store
 */

import { create } from "zustand";
import type { FloorId, Floor, RouteResult, Graph, POI } from "../types/indoor";

interface MapState {
  // 状态
  floors: Floor[];
  currentFloorId: FloorId;
  selectedPOIId: string | null;
  routeResult: RouteResult | null;
  graph: Graph | null;
  pois: POI[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeMap: (graph: Graph, pois: POI[], floors: Floor[]) => void;
  setCurrentFloor: (floorId: FloorId) => void;
  selectPOI: (poiId: string | null) => void;
  setRoute: (result: RouteResult) => void;
  clearRoute: () => void;
  setError: (error: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  // 初始状态
  floors: [],
  currentFloorId: "1F",
  selectedPOIId: null,
  routeResult: null,
  graph: null,
  pois: [],
  isLoading: true,
  error: null,

  // 初始化地图
  initializeMap: (graph, pois, floors) => {
    const prefer0F = floors.find((f) => f.id === "0F");
    set({
      graph,
      pois,
      floors,
      currentFloorId: prefer0F?.id ?? (floors.length > 0 ? floors[0].id : "1F"),
      isLoading: false,
      error: null,
    });
  },

  // 切换楼层
  setCurrentFloor: (floorId) => {
    set({ currentFloorId: floorId });
  },

  // 选择 POI
  selectPOI: (poiId) => {
    set({ selectedPOIId: poiId });
  },

  // 设置路径结果
  setRoute: (result) => {
    set(() => {
      // 如果有路径结果，自动切换到路径起点所在楼层
      if (result.found && result.segments.length > 0) {
        return {
          routeResult: result,
          currentFloorId: result.segments[0].floorId,
        };
      }
      return { routeResult: result };
    });
  },

  // 清除路径
  clearRoute: () => {
    set({ routeResult: null });
  },

  // 设置错误
  setError: (error) => {
    set({ error, isLoading: false });
  },
}));

/**
 * 判断指定楼层是否有路径段
 */
export function hasRouteOnFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
): boolean {
  if (!routeResult || !routeResult.found) return false;
  return routeResult.segments.some((seg) => seg.floorId === floorId);
}

/**
 * 获取指定楼层的路径段
 */
export function getRouteSegmentForFloor(
  routeResult: RouteResult | null,
  floorId: FloorId
) {
  if (!routeResult || !routeResult.found) return null;
  return routeResult.segments.find((seg) => seg.floorId === floorId) || null;
}

/**
 * 获取有路径的楼层列表
 */
export function getFloorsWithRoute(routeResult: RouteResult | null): FloorId[] {
  if (!routeResult || !routeResult.found) return [];
  return routeResult.segments.map((seg) => seg.floorId);
}
