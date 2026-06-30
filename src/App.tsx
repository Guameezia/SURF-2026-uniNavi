/**
 * 室内导航 Web 应用主页面
 */

import { useEffect, useState, useMemo } from "react";
import { useMapStore } from "./store/mapStore";
import { IndoorMapSVG } from "./components/map/IndoorMapSVG";
import { FloorSelector } from "./components/map/FloorSelector";
import { RouteSearchField, getPOISearchDisplay } from "./components/navigation/RouteSearchField";
import { DirectionsPanel } from "./components/navigation/DirectionsPanel";
import { RouteTypePicker } from "./components/navigation/RouteTypePicker";
import { createGraph, getPOINodes, getFloors } from "./algorithms/graph";
import { findDualRoutes } from "./algorithms/pathfinding";
import { filterPOISuggestions, resolvePOINodeId } from "./utils/poiSearch";
import { sNodes, sEdges } from "./data";
import type { POI } from "./types/indoor";
import "./App.css";

function App() {
  const {
    graph,
    pois,
    initializeMap,
    setDualRoutes,
    beginEditingRoute,
    setRouteMode,
    routeResult,
    comfortRoute,
    fastRoute,
    selectedRouteMode,
    hasMultipleRoutes,
    uiPhase,
    error,
  } = useMapStore();

  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [selectedStartId, setSelectedStartId] = useState("");
  const [selectedEndId, setSelectedEndId] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [directionsExpanded, setDirectionsExpanded] = useState(true);
  const [activeField, setActiveField] = useState<"start" | "end" | null>(null);

  const isNavigating = uiPhase === "navigating";

  const startSuggestions = useMemo(
    () => filterPOISuggestions(pois, startQuery),
    [pois, startQuery]
  );
  const endSuggestions = useMemo(
    () => filterPOISuggestions(pois, endQuery),
    [pois, endQuery]
  );

  const activeRoute =
    selectedRouteMode === "fast" ? fastRoute : comfortRoute;
  const steps = activeRoute?.steps ?? [];

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

  const handleStartChange = (query: string) => {
    setStartQuery(query);
    setSelectedStartId("");
    setActiveField("start");
  };

  const handleEndChange = (query: string) => {
    setEndQuery(query);
    setSelectedEndId("");
    setActiveField("end");
  };

  const handleSelectStart = (poi: POI) => {
    setSelectedStartId(poi.id);
    setStartQuery(getPOISearchDisplay(poi, pois));
    setActiveField(null);
  };

  const handleSelectEnd = (poi: POI) => {
    setSelectedEndId(poi.id);
    setEndQuery(getPOISearchDisplay(poi, pois));
    setActiveField(null);
  };

  const handlePlanRoute = () => {
    if (!graph) return;

    const startId = resolvePOINodeId(pois, startQuery, selectedStartId);
    const endId = resolvePOINodeId(pois, endQuery, selectedEndId);

    if (!startId || !endId) {
      alert("Please select a valid start point and destination");
      return;
    }

    if (startId === endId) {
      alert("起点和终点不能相同");
      return;
    }

    const { comfort, fast, hasMultipleRoutes: multi } = findDualRoutes(
      graph,
      startId,
      endId
    );

    if (!comfort.found && !fast.found) {
      alert("未找到路径");
      return;
    }

    setDualRoutes(comfort, fast, multi);
    setDirectionsExpanded(true);
    setActiveField(null);
  };

  const handleEdit = () => {
    beginEditingRoute();
  };

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
      <header className="app-header">
        <h1 className="app-brand">UniNavi</h1>

        {!isNavigating ? (
          <div className="route-planner">
            <div className="route-inputs">
              <div className="route-inputs-indicator" aria-hidden>
                <span className="route-dot route-dot-start" />
                <span className="route-line" />
                <span className="route-dot route-dot-end" />
              </div>
              <div className="route-inputs-fields">
                <RouteSearchField
                  label="From"
                  placeholder="e.g., SA169"
                  value={startQuery}
                  suggestions={startSuggestions}
                  allPois={pois}
                  showSuggestions={activeField === "start" && !selectedStartId}
                  onChange={handleStartChange}
                  onSelect={handleSelectStart}
                  onFocus={() => setActiveField("start")}
                  onBlur={() =>
                    setTimeout(
                      () => setActiveField((f) => (f === "start" ? null : f)),
                      150
                    )
                  }
                />
                <RouteSearchField
                  label="To"
                  placeholder="e.g., SA321"
                  value={endQuery}
                  suggestions={endSuggestions}
                  allPois={pois}
                  showSuggestions={activeField === "end" && !selectedEndId}
                  onChange={handleEndChange}
                  onSelect={handleSelectEnd}
                  onFocus={() => setActiveField("end")}
                  onBlur={() =>
                    setTimeout(
                      () => setActiveField((f) => (f === "end" ? null : f)),
                      150
                    )
                  }
                />
              </div>
            </div>
            <div className="route-planner-actions">
              <button
                onMouseDown={() => setActiveField(null)}
                onClick={handlePlanRoute}
                disabled={!startQuery.trim() || !endQuery.trim()}
                className="btn-primary"
              >
                Plan
              </button>
              <label className="debug-toggle">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                />
                调试模式
              </label>
            </div>
          </div>
        ) : (
          <div className="route-summary">
            <div className="route-summary-text">
              <span className="route-summary-from">{startQuery}</span>
              <span className="route-summary-sep">—</span>
              <span className="route-summary-to">{endQuery}</span>
            </div>
            {hasMultipleRoutes && (
              <RouteTypePicker
                selected={selectedRouteMode}
                onSelect={setRouteMode}
              />
            )}
            <button onClick={handleEdit} className="btn-secondary">
              Edit
            </button>
            <label className="debug-toggle">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
              调试模式
            </label>
          </div>
        )}
      </header>

      <main className="app-main">
        <aside className="floor-selector-panel">
          <FloorSelector />
        </aside>

        <div className="map-container">
          <IndoorMapSVG debugMode={debugMode} />
        </div>

        {isNavigating && routeResult?.found && steps.length > 0 && (
          <aside className="directions-sidebar">
            <DirectionsPanel
              steps={steps}
              expanded={directionsExpanded}
              onToggle={() => setDirectionsExpanded((v) => !v)}
            />
          </aside>
        )}
      </main>

      {debugMode && (
        <div className="legend">
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: "#4CAF50" }}
            />
            房间
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: "#2196F3" }}
            />
            洗手间
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: "#FF9800" }}
            />
            出口
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: "#9C27B0" }}
            />
            电梯
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: "#E91E63" }}
            />
            楼梯
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
