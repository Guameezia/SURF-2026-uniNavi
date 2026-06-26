/**
 * 室内地图 SVG 组件
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMapStore, getRouteSegmentForFloor } from "../../store/mapStore";
import { useLeafNoteStore } from "../../store/leafNoteStore";
import { getMapAssetPath, DISPLAY_CANVAS, modelToDisplay, displayToModel, MAP_ASSET_EXTENSION } from "../../data";
import type { LeafNote } from "../../types/leafNote";
import { getFloorNodes, getFloorEdges } from "../../algorithms/graph";
import { LeafNoteDialog, type LeafNoteDialogMode } from "./LeafNoteDialog";
import { LeafMarker, LeafIconMini } from "./LeafMarker";
import { PixelZones } from "./PixelZones";

const BUILDING_ID = "S";
const MAP_INTERACTION = { minScale: 0.3, maxScale: 3, scaleStep: 0.1 };
const DEBUG_STORAGE_KEY = "uni-navi-map-debug";
const DRAG_THRESHOLD = 5;

function readInitialDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "1") return true;
  return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
}

const NODE_STYLES: Record<string, { fill: string; r: number }> = {
  room: { fill: "#4CAF50", r: 6 },
  toilet: { fill: "#2196F3", r: 6 },
  exit: { fill: "#FF9800", r: 7 },
  elevator: { fill: "#9C27B0", r: 7 },
  stairs: { fill: "#E91E63", r: 7 },
  junction: { fill: "#9E9E9E", r: 2 },
};

type NoteDialogState =
  | { kind: "create"; x: number; y: number }
  | { kind: "view" | "edit"; note: LeafNote };

export const IndoorMapSVG: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);
  const mouseDownRef = useRef({ x: 0, y: 0 });

  const { graph, currentFloorId, selectedPOIId, routeResult, selectPOI } = useMapStore();
  const { notes, addNote, updateNote, deleteNote } = useLeafNoteStore();

  const activeFloorId = currentFloorId;
  const canvas = DISPLAY_CANVAS;
  const toDisplay = useCallback(
    (x: number, y: number) => modelToDisplay(x, y, BUILDING_ID, activeFloorId),
    [activeFloorId]
  );

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [debugMode, setDebugMode] = useState(readInitialDebugMode);
  const [noteMode, setNoteMode] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);

  const floorNotes = useMemo(
    () => notes.filter((n) => n.building === BUILDING_ID && n.floorId === activeFloorId),
    [notes, activeFloorId]
  );

  const floorNodes = graph ? getFloorNodes(graph, activeFloorId) : [];
  const floorEdges = graph ? getFloorEdges(graph, activeFloorId) : [];
  const currentRouteSegment = getRouteSegmentForFloor(routeResult, activeFloorId);
  const mapPath = getMapAssetPath("S", activeFloorId);

  const showPOI = debugMode;

  const placeNoteAtClient = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      let svgX: number;
      let svgY: number;

      if (svg && ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const p = pt.matrixTransform(ctm.inverse());
        svgX = p.x;
        svgY = p.y;
      } else if (mapLayerRef.current) {
        const rect = mapLayerRef.current.getBoundingClientRect();
        svgX = ((clientX - rect.left) / rect.width) * canvas.width;
        svgY = ((clientY - rect.top) / rect.height) * canvas.height;
      } else {
        return;
      }

      if (svgX < 0 || svgY < 0 || svgX > canvas.width || svgY > canvas.height) return;

      const model = displayToModel(svgX, svgY, BUILDING_ID, activeFloorId);
      setNoteDialog({ kind: "create", x: model.x, y: model.y });
    },
    [activeFloorId, canvas.width, canvas.height]
  );

  const tryPlaceNote = useCallback(
    (e: React.MouseEvent) => {
      if (!noteMode || dragMovedRef.current) return;
      if ((e.target as Element).closest?.(".leaf-note-marker")) return;
      placeNoteAtClient(e.clientX, e.clientY);
    },
    [noteMode, placeNoteAtClient]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -MAP_INTERACTION.scaleStep : MAP_INTERACTION.scaleStep;
    setScale((s) =>
      Math.min(MAP_INTERACTION.maxScale, Math.max(MAP_INTERACTION.minScale, s + delta))
    );
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragMovedRef.current = false;
      mouseDownRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    },
    [translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - mouseDownRef.current.x;
        const dy = e.clientY - mouseDownRef.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMovedRef.current = true;
        setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
    setNoteDialog(null);
  }, [activeFloorId, resetView]);

  const toggleDebugMode = useCallback(() => {
    setDebugMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(DEBUG_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const dialogMode: LeafNoteDialogMode =
    noteDialog?.kind === "create"
      ? "create"
      : noteDialog?.kind === "edit"
        ? "edit"
        : "view";

  const dialogText =
    noteDialog?.kind === "create"
      ? ""
      : noteDialog?.note.text ?? "";

  return (
    <div
      ref={containerRef}
      className="indoor-map-container"
      style={{
        cursor: isDragging ? "grabbing" : noteMode ? "crosshair" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={mapLayerRef}
        className="gather-map-layer"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -canvas.width / 2,
          marginTop: -canvas.height / 2,
        }}
      >
        <img
          className={`gather-map-image${MAP_ASSET_EXTENSION === "png" ? " gather-map-image--pixel" : ""}`}
          src={mapPath}
          alt={`Floor ${activeFloorId}`}
          width={canvas.width}
          height={canvas.height}
          draggable={false}
        />

        <svg
          ref={svgRef}
          className="gather-map-overlay"
          width={canvas.width}
          height={canvas.height}
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          onMouseUp={tryPlaceNote}
        >
          {noteMode && (
            <rect
              x={0}
              y={0}
              width={canvas.width}
              height={canvas.height}
              fill="transparent"
              pointerEvents="all"
            />
          )}

          <PixelZones building={BUILDING_ID} floorId={activeFloorId} toDisplay={toDisplay} />

          {debugMode && (
            <g className="edges-layer">
              {floorEdges.map((edge, i) => {
                const from = graph!.nodesById[edge.from];
                const to = graph!.nodesById[edge.to];
                if (!from || !to) return null;
                const a = toDisplay(from.x, from.y);
                const b = toDisplay(to.x, to.y);
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#BDBDBD"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                  />
                );
              })}
            </g>
          )}

          {currentRouteSegment && currentRouteSegment.points.length >= 2 && (
            <g className="route-layer">
              <path
                d={currentRouteSegment.points
                  .map((p, i) => {
                    const pt = toDisplay(p.x, p.y);
                    return `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#26c6da"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {showPOI && (
            <g className="nodes-layer">
              {floorNodes.map((node) => {
                if (node.type === "junction" && !debugMode) return null;
                const style = NODE_STYLES[node.type] || NODE_STYLES.junction;
                const pos = toDisplay(node.x, node.y);
                const isSelected = node.id === selectedPOIId;
                return (
                  <g
                    key={node.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!noteMode && node.type !== "junction") selectPOI(node.id);
                    }}
                    style={{ cursor: node.type !== "junction" ? "pointer" : "default" }}
                  >
                    <circle cx={pos.x} cy={pos.y} r={style.r} fill={style.fill} stroke="#fff" />
                    {debugMode && node.label && node.type !== "junction" && (
                      <text x={pos.x} y={pos.y - style.r - 4} textAnchor="middle" fontSize={10} fill="#333">
                        {node.label}
                      </text>
                    )}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={style.r + 6}
                        fill="none"
                        stroke="#FF5722"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          <g className="leaf-notes-layer">
            {floorNotes.map((note) => {
              const pos = toDisplay(note.x, note.y);
              return (
                <LeafMarker
                  key={note.id}
                  x={pos.x}
                  y={pos.y}
                  seed={note.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteMode(false);
                    setNoteDialog({ kind: "view", note });
                  }}
                />
              );
            })}
          </g>
        </svg>
      </div>

      <div className="map-toolbar">
        <button
          type="button"
          className={`map-note-mode-btn${noteMode ? " active" : ""}`}
          onClick={() => setNoteMode((v) => !v)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <LeafIconMini size={16} /> 贴便签
        </button>
        <label className="map-debug-toggle">
          <input type="checkbox" checked={debugMode} onChange={toggleDebugMode} />
          <span>调试模式</span>
        </label>
      </div>

      <p className="map-hint">
        <LeafIconMini size={16} />
        <span>
          {noteMode
            ? "点击地图放置像素叶子便签"
            : "像素食堂 · 点击叶子查看便签"}
        </span>
      </p>

      <LeafNoteDialog
        open={noteDialog !== null}
        mode={dialogMode}
        initialText={dialogText}
        onSave={(text) => {
          if (noteDialog?.kind === "create") {
            addNote({
              building: BUILDING_ID,
              floorId: activeFloorId,
              x: noteDialog.x,
              y: noteDialog.y,
              text,
            });
            setNoteDialog(null);
            setNoteMode(false);
          } else if (noteDialog?.kind === "edit") {
            updateNote(noteDialog.note.id, text);
            setNoteDialog(null);
          }
        }}
        onEdit={
          noteDialog?.kind === "view"
            ? () => setNoteDialog({ kind: "edit", note: noteDialog.note })
            : undefined
        }
        onDelete={
          noteDialog && noteDialog.kind !== "create"
            ? () => {
                deleteNote(noteDialog.note.id);
                setNoteDialog(null);
              }
            : undefined
        }
        onClose={() => setNoteDialog(null)}
      />

      <div className="map-zoom-controls">
        <button type="button" onClick={() => setScale((s) => Math.min(3, s + 0.2))} aria-label="放大">
          +
        </button>
        <button type="button" onClick={() => setScale((s) => Math.max(0.3, s - 0.2))} aria-label="缩小">
          −
        </button>
        <button type="button" onClick={resetView} aria-label="重置视图">
          ⟲
        </button>
      </div>

      <div className="map-floor-badge">{activeFloorId}</div>
    </div>
  );
};

export default IndoorMapSVG;
