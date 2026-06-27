/**
 * 室内导航 Web 应用主页面
 */

import { useEffect, useState } from "react";
import { useMapStore } from "./store/mapStore";
import { MapView } from "./components/map/MapView";
import { createGraph, getPOINodes, getFloors } from "./algorithms/graph";
import { findRoute } from "./algorithms/pathfinding";
import { sNodes, sEdges } from "./data";
import type { POI } from "./types/indoor";
import "./App.css";

function App() {
  const { graph, pois, initializeMap, setRoute, clearRoute, routeResult, error } =
    useMapStore();

  // 路径规划表单状态
  const [startPOIId, setStartPOIId] = useState<string>("");
  const [endPOIId, setEndPOIId] = useState<string>("");

  // 初始化地图数据
  useEffect(() => {
    try {
      const graphData = createGraph(sNodes, sEdges);
      const poisData = getPOINodes(graphData);
      const floorsData = getFloors(graphData, "S");
      initializeMap(graphData, poisData, floorsData);
    } catch (err) {
      console.error("Failed to initialize map:", err);
    }
  }, [initializeMap]);

  // 规划路径
  const handlePlanRoute = () => {
    if (!graph || !startPOIId || !endPOIId) return;

    if (startPOIId === endPOIId) {
      alert("起点和终点不能相同");
      return;
    }

    const result = findRoute(graph, startPOIId, endPOIId);
    setRoute(result);

    if (!result.found) {
      alert("未找到路径");
    }
  };

  // 清除路径
  const handleClearRoute = () => {
    clearRoute();
    setStartPOIId("");
    setEndPOIId("");
  };

  // 按楼层分组 POI
  const groupedPOIs = pois.reduce((acc, poi) => {
    if (!acc[poi.floorId]) {
      acc[poi.floorId] = [];
    }
    acc[poi.floorId].push(poi);
    return acc;
  }, {} as Record<string, POI[]>);

  // 渲染 POI 选择器
  const renderPOISelect = (
    value: string,
    onChange: (value: string) => void,
    label: string
  ) => (
    <div className="route-field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- 请选择 --</option>
        {Object.entries(groupedPOIs).map(([floorId, floorPOIs]) => (
          <optgroup key={floorId} label={`${floorId}`}>
            {floorPOIs.map((poi) => (
              <option key={poi.id} value={poi.id}>
                {poi.label || poi.id}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  if (error) {
    return (
      <div className="app-error">
        <h2>加载错误</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* 顶部控制栏 */}
      <header className="app-header">
        <h1>S 楼室内导航</h1>
        <div className="route-planner">
          {renderPOISelect(startPOIId, setStartPOIId, "起点")}
          {renderPOISelect(endPOIId, setEndPOIId, "终点")}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={handlePlanRoute}
              disabled={!startPOIId || !endPOIId}
              className="btn-primary"
            >
              规划路径
            </button>
            <button onClick={handleClearRoute} className="btn-secondary">
              清除
            </button>
          </div>
        </div>

        {/* 路径信息 */}
        {routeResult && routeResult.found && (
          <div className="route-info">
            <span>
              路径距离: <strong>{Math.round(routeResult.distance)}m</strong>
            </span>
            <span>
              途经楼层:{" "}
              <strong>
                {routeResult.segments.map((s) => s.floorId).join(" → ")}
              </strong>
            </span>
          </div>
        )}
      </header>

      {/* 主内容区 */}
      <main className="app-main">
        <MapView />
      </main>
    </div>
  );
}

export default App;
