/**
 * 星露谷式分房间主视图 — 0F MVP
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMapStore } from "../../store/mapStore";
import { useRoomStore } from "../../store/roomStore";
import { useLeafNoteStore } from "../../store/leafNoteStore";
import {
  getRoomsForFloor,
  getRoomById,
  getViewpointsForRoom,
} from "../../data/roomConfig";
import type { Direction } from "../../types/room";
import type { LeafNote } from "../../types/leafNote";
import { LeafNoteDialog, type LeafNoteDialogMode } from "./LeafNoteDialog";
import { LeafMarker, LeafIconMini } from "./LeafMarker";
import { RoomPlaceholder } from "./RoomPlaceholder";
import { FloorMinimap } from "./FloorMinimap";
import { DirectionPad } from "./DirectionPad";
import { ViewpointMarker, ViewpointDialog } from "./ViewpointMarker";
import type { ViewpointDef } from "../../types/room";

const BUILDING_ID = "S";
const MAP_INTERACTION = { minScale: 0.5, maxScale: 2.5, scaleStep: 0.1 };
const DRAG_THRESHOLD = 5;

type NoteDialogState =
  | { kind: "create"; x: number; y: number }
  | { kind: "view" | "edit"; note: LeafNote };

const ARROW_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export const RoomMapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);
  const mouseDownRef = useRef({ x: 0, y: 0 });

  const { currentFloorId } = useMapStore();
  const { currentRoomId, visitedRoomIds, initForFloor, setRoom, move } = useRoomStore();
  const { notes, addNote, updateNote, deleteNote } = useLeafNoteStore();

  const floorId = currentFloorId;
  const rooms = getRoomsForFloor(floorId);
  const room = currentRoomId ? getRoomById(floorId, currentRoomId) : undefined;

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [noteMode, setNoteMode] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);
  const [viewpointDialog, setViewpointDialog] = useState<ViewpointDef | null>(null);

  useEffect(() => {
    initForFloor(floorId);
  }, [floorId, initForFloor]);

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setNoteDialog(null);
    setViewpointDialog(null);
  }, [currentRoomId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = ARROW_TO_DIR[e.key];
      if (!dir) return;
      if (noteDialog || viewpointDialog) return;
      e.preventDefault();
      move(floorId, dir);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [floorId, move, noteDialog, viewpointDialog]);

  const roomNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.building === BUILDING_ID &&
          n.floorId === floorId &&
          n.roomId === currentRoomId
      ),
    [notes, floorId, currentRoomId]
  );

  const viewpoints = useMemo(
    () => (currentRoomId ? getViewpointsForRoom(floorId, currentRoomId) : []),
    [floorId, currentRoomId]
  );

  const availableDirs = useMemo(() => {
    if (!room) return {};
    const result: Partial<Record<Direction, string>> = {};
    (["up", "down", "left", "right"] as Direction[]).forEach((dir) => {
      const nextId = room.neighbors[dir];
      if (nextId) {
        const next = getRoomById(floorId, nextId);
        if (next) result[dir] = next.label;
      }
    });
    return result;
  }, [room, floorId]);

  const canvasW = room?.viewWidth ?? 640;
  const canvasH = room?.viewHeight ?? 400;

  const placeNoteAtClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!currentRoomId) return;
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
        svgX = ((clientX - rect.left) / rect.width) * canvasW;
        svgY = ((clientY - rect.top) / rect.height) * canvasH;
      } else {
        return;
      }

      if (svgX < 0 || svgY < 0 || svgX > canvasW || svgY > canvasH) return;
      setNoteDialog({ kind: "create", x: svgX, y: svgY });
    },
    [currentRoomId, canvasW, canvasH]
  );

  const tryPlaceNote = useCallback(
    (e: React.MouseEvent) => {
      if (!noteMode || dragMovedRef.current) return;
      if ((e.target as Element).closest?.(".leaf-note-marker, .viewpoint-marker")) return;
      placeNoteAtClient(e.clientX, e.clientY);
    },
    [noteMode, placeNoteAtClient]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if ((e.target as Element).closest?.(".floor-minimap")) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -MAP_INTERACTION.scaleStep : MAP_INTERACTION.scaleStep;
    setScale((s) =>
      Math.min(MAP_INTERACTION.maxScale, Math.max(MAP_INTERACTION.minScale, s + delta))
    );
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as Element).closest?.(".floor-minimap")) return;
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

  if (!room || !currentRoomId) {
    return <div className="room-map-loading">加载房间…</div>;
  }

  const dialogMode: LeafNoteDialogMode =
    noteDialog?.kind === "create"
      ? "create"
      : noteDialog?.kind === "edit"
        ? "edit"
        : "view";

  const dialogText =
    noteDialog?.kind === "create" ? "" : (noteDialog?.note.text ?? "");

  return (
    <div
      ref={containerRef}
      className="indoor-map-container room-map-container"
      style={{ cursor: isDragging ? "grabbing" : noteMode ? "crosshair" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={mapLayerRef}
        className="gather-map-layer room-map-layer"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -canvasW / 2,
          marginTop: -canvasH / 2,
          width: canvasW,
          height: canvasH,
        }}
      >
        {room.imageSrc ? (
          <img
            className="gather-map-image gather-map-image--pixel room-map-image"
            src={room.imageSrc}
            alt={room.label}
            width={canvasW}
            height={canvasH}
            draggable={false}
          />
        ) : (
          <RoomPlaceholder room={room} />
        )}

        <svg
          ref={svgRef}
          className="gather-map-overlay"
          width={canvasW}
          height={canvasH}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          onMouseUp={tryPlaceNote}
        >
          {noteMode && (
            <rect x={0} y={0} width={canvasW} height={canvasH} fill="transparent" pointerEvents="all" />
          )}

          {viewpoints.map((vp) => (
            <ViewpointMarker key={vp.id} viewpoint={vp} onClick={() => setViewpointDialog(vp)} />
          ))}

          <g className="leaf-notes-layer">
            {roomNotes.map((note) => (
              <LeafMarker
                key={note.id}
                x={note.x}
                y={note.y}
                seed={note.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteMode(false);
                  setNoteDialog({ kind: "view", note });
                }}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="map-room-badge">
        <span className="map-room-badge-floor">{floorId}</span>
        <span className="map-room-badge-name">{room.label}</span>
      </div>

      {currentRoomId && (
        <FloorMinimap
          rooms={rooms}
          currentRoomId={currentRoomId}
          visitedRoomIds={visitedRoomIds}
          onSelectRoom={setRoom}
        />
      )}

      <div className="map-toolbar map-toolbar--left">
        <button
          type="button"
          className={`map-note-mode-btn${noteMode ? " active" : ""}`}
          onClick={() => setNoteMode((v) => !v)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <LeafIconMini size={16} /> 贴便签
        </button>
      </div>

      <DirectionPad
        available={availableDirs}
        onMove={(dir) => move(floorId, dir)}
      />

      <p className="map-hint">
        <LeafIconMini size={16} />
        <span>
          {noteMode
            ? "点击当前房间放置叶子便签"
            : "方向键或下方按钮换房间 · 右上角鸟瞰"}
        </span>
      </p>

      <LeafNoteDialog
        open={noteDialog !== null}
        mode={dialogMode}
        initialText={dialogText}
        onSave={(text) => {
          if (noteDialog?.kind === "create" && currentRoomId) {
            addNote({
              building: BUILDING_ID,
              floorId,
              roomId: currentRoomId,
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

      <ViewpointDialog
        open={viewpointDialog !== null}
        viewpoint={viewpointDialog}
        onClose={() => setViewpointDialog(null)}
      />

      <div className="map-zoom-controls">
        <button type="button" onClick={() => setScale((s) => Math.min(2.5, s + 0.2))} aria-label="放大">
          +
        </button>
        <button type="button" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} aria-label="缩小">
          −
        </button>
        <button type="button" onClick={resetView} aria-label="重置视图">
          ⟲
        </button>
      </div>
    </div>
  );
};

export default RoomMapView;
