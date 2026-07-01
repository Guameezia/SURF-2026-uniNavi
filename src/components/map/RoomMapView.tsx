/**
 * 星露谷式分房间主视图 — 保留新版 UI（顶栏、Leaf、小地图）+ 方向键导航
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMapStore } from "../../store/mapStore";
import { useRoomStore } from "../../store/roomStore";
import { useLeafNoteStore } from "../../store/leafNoteStore";
import {
  getRoomsForFloor,
  getRoomById,
  getViewpointsForRoom,
  isVerticalTransportRoom,
  hasRoomNavigation,
} from "../../data/roomConfig";
import type { Direction, FloorPortalTarget } from "../../types/room";
import type { LeafNote } from "../../types/leafNote";
import { RoomPlaceholder } from "./RoomPlaceholder";
import { DirectionPad } from "./DirectionPad";
import { ViewpointMarker, ViewpointDialog } from "./ViewpointMarker";
import type { ViewpointDef } from "../../types/room";
import { MinimapWidget } from "../explore/MinimapWidget";
import { LeafToolbar } from "../explore/LeafToolbar";
import { LeafMarker } from "../explore/LeafIcon";
import { LeafNoteSheet, type LeafNoteSheetMode } from "../explore/LeafNoteSheet";

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

interface RoomMapViewProps {
  debugMode?: boolean;
}

export const RoomMapView: React.FC<RoomMapViewProps> = ({ debugMode: _debugMode = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);

  const {
    currentFloorId,
    transitionToFloor,
    floorEntryRoomId,
    clearFloorEntry,
  } = useMapStore();
  const { currentRoomId, initForFloor, setRoom } = useRoomStore();
  const { notes, addNote, updateNote, deleteNote } = useLeafNoteStore();

  const floorId = currentFloorId;
  const rooms = getRoomsForFloor(floorId);
  const room = currentRoomId ? getRoomById(floorId, currentRoomId) : undefined;

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, tx: 0, ty: 0 });
  const [leafDropMode, setLeafDropMode] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);
  const [viewpointDialog, setViewpointDialog] = useState<ViewpointDef | null>(null);

  useEffect(() => {
    if (currentRoomId && getRoomById(floorId, currentRoomId)) {
      return;
    }
    initForFloor(floorId);
  }, [floorId, currentRoomId, initForFloor]);

  useEffect(() => {
    if (floorEntryRoomId) {
      setRoom(floorEntryRoomId);
      clearFloorEntry();
    }
  }, [floorEntryRoomId, setRoom, clearFloorEntry]);

  const applyVerticalTransition = useCallback(
    (target: FloorPortalTarget) => {
      if (target.targetRoomId && hasRoomNavigation(target.targetFloorId)) {
        transitionToFloor(target.targetFloorId, null, target.targetRoomId);
      } else {
        transitionToFloor(target.targetFloorId, target.targetNodeId ?? null);
      }
    },
    [transitionToFloor]
  );

  const navigateToRoom = useCallback(
    (roomId: string) => {
      setRoom(roomId);
    },
    [setRoom]
  );

  const tryMove = useCallback(
    (dir: Direction) => {
      if (!currentRoomId) return;
      const current = getRoomById(floorId, currentRoomId);
      const nextId = current?.neighbors[dir];
      if (!nextId) return;
      navigateToRoom(nextId);
    },
    [currentRoomId, floorId, navigateToRoom]
  );

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setNoteDialog(null);
    setViewpointDialog(null);
    setLeafDropMode(false);
  }, [currentRoomId]);

  const verticalPad = useMemo(() => {
    if (!room?.floorPortal || !isVerticalTransportRoom(room)) return undefined;
    const { up, down } = room.floorPortal;
    return {
      canUp: !!up,
      canDown: !!down,
      upFloor: up?.targetFloorId,
      downFloor: down?.targetFloorId,
      onUp: () => up && applyVerticalTransition(up),
      onDown: () => down && applyVerticalTransition(down),
    };
  }, [room, applyVerticalTransition]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noteDialog || viewpointDialog) return;

      if (verticalPad && e.key === "PageUp" && verticalPad.canUp) {
        e.preventDefault();
        verticalPad.onUp();
        return;
      }
      if (verticalPad && e.key === "PageDown" && verticalPad.canDown) {
        e.preventDefault();
        verticalPad.onDown();
        return;
      }

      const dir = ARROW_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      tryMove(dir);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tryMove, noteDialog, viewpointDialog, verticalPad]);

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
        if (next) {
          result[dir] = isVerticalTransportRoom(next)
            ? `${next.label}（梯间）`
            : next.label;
        }
      }
    });
    return result;
  }, [room, floorId]);

  const canvasW = room?.viewWidth ?? 640;
  const canvasH = room?.viewHeight ?? 400;

  const clampScale = (s: number) =>
    Math.min(MAP_INTERACTION.maxScale, Math.max(MAP_INTERACTION.minScale, s));

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!leafDropMode || dragMovedRef.current) return;
      if ((e.target as Element).closest?.(".leaf-note-marker, .viewpoint-marker")) return;
      const pt = clientToSvg(e.clientX, e.clientY);
      if (!pt || !currentRoomId) return;
      if (pt.x < 0 || pt.y < 0 || pt.x > canvasW || pt.y > canvasH) return;
      setNoteDialog({ kind: "create", x: pt.x, y: pt.y });
    },
    [leafDropMode, clientToSvg, currentRoomId, canvasW, canvasH]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if ((e.target as Element).closest?.(".minimap-widget")) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -MAP_INTERACTION.scaleStep : MAP_INTERACTION.scaleStep;
    setScale((s) => clampScale(s + delta));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || leafDropMode) return;
      if ((e.target as Element).closest?.(".minimap-widget, .dir-pad")) return;
      dragMovedRef.current = false;
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      });
    },
    [leafDropMode, translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMovedRef.current = true;
      setTranslate({ x: dragStart.tx + dx, y: dragStart.ty + dy });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s + MAP_INTERACTION.scaleStep));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => clampScale(s - MAP_INTERACTION.scaleStep));
  }, []);

  if (!room || !currentRoomId) {
    return <div className="room-map-loading">加载房间…</div>;
  }

  const sheetMode: LeafNoteSheetMode | null =
    noteDialog?.kind === "create"
      ? "create"
      : noteDialog?.kind === "edit"
        ? "edit"
        : noteDialog?.kind === "view"
          ? "view"
          : null;

  const sheetText =
    noteDialog?.kind === "create" ? "" : (noteDialog?.note.text ?? "");

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="room-interior room-map-view">
      <div className="room-interior-topbar">
        <div className="room-interior-title-row">
          <h2>{room.label}</h2>
          <span className="room-interior-badge">{floorId} · Room View</span>
          <LeafToolbar
            dropMode={leafDropMode}
            onToggleDropMode={() => setLeafDropMode(!leafDropMode)}
            noteCount={roomNotes.length}
          />
        </div>
      </div>

      {leafDropMode && (
        <div className="room-interior-drop-banner">
          <span>Click anywhere to drop a Leaf</span>
        </div>
      )}

      <div
        className={`room-interior-canvas${leafDropMode ? " room-interior-canvas--drop-mode" : ""}${isDragging ? " room-interior-canvas--dragging" : ""}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <div
          className="room-interior-stage room-map-stage"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {room.imageSrc ? (
            <img
              className="room-map-image"
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
            className="room-interior-svg gather-map-overlay"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {viewpoints.map((vp) => (
              <ViewpointMarker
                key={vp.id}
                viewpoint={vp}
                onClick={() => setViewpointDialog(vp)}
              />
            ))}
            {roomNotes.map((note) => (
              <LeafMarker
                key={note.id}
                x={note.x}
                y={note.y}
                text={note.text}
                onClick={() => setNoteDialog({ kind: "view", note })}
              />
            ))}
          </svg>
        </div>

        <div className="room-zoom-controls">
          <button type="button" className="room-zoom-btn" onClick={zoomIn} aria-label="Zoom in">
            +
          </button>
          <button
            type="button"
            className="room-zoom-btn"
            onClick={zoomOut}
            aria-label="Zoom out"
            disabled={scale <= MAP_INTERACTION.minScale}
          >
            −
          </button>
          <button
            type="button"
            className="room-zoom-btn room-zoom-btn--reset"
            onClick={resetView}
            aria-label="Reset view"
          >
            ⌂
          </button>
          <span className="room-zoom-label">{zoomPercent}%</span>
        </div>

        <DirectionPad
          available={availableDirs}
          onMove={tryMove}
          vertical={verticalPad}
        />
      </div>

      <MinimapWidget
        floorId={floorId}
        rooms={rooms}
        currentRoomId={currentRoomId}
        onSelectRoom={navigateToRoom}
        showRoute
      />

      <LeafNoteSheet
        open={noteDialog !== null}
        mode={sheetMode ?? "create"}
        roomLabel={room.label}
        initialText={sheetText}
        onClose={() => setNoteDialog(null)}
        onSave={(text) => {
          if (!noteDialog) return;
          if (noteDialog.kind === "create" && currentRoomId) {
            addNote({
              building: BUILDING_ID,
              floorId,
              roomId: currentRoomId,
              x: noteDialog.x,
              y: noteDialog.y,
              text,
            });
          } else if (noteDialog.kind === "edit") {
            updateNote(noteDialog.note.id, text);
          }
          setNoteDialog(null);
          setLeafDropMode(false);
        }}
        onDelete={
          noteDialog?.kind === "view" || noteDialog?.kind === "edit"
            ? () => {
                if (noteDialog.kind === "view" || noteDialog.kind === "edit") {
                  deleteNote(noteDialog.note.id);
                  setNoteDialog(null);
                }
              }
            : undefined
        }
        onEdit={
          noteDialog?.kind === "view"
            ? () => setNoteDialog({ kind: "edit", note: noteDialog.note })
            : undefined
        }
      />

      <ViewpointDialog
        open={viewpointDialog !== null}
        viewpoint={viewpointDialog}
        onClose={() => setViewpointDialog(null)}
      />
    </div>
  );
};

export default RoomMapView;
