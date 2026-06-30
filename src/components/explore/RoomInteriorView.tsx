import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import type { RoomDef } from "../../types/room";
import type { LeafNote } from "../../types/leafNote";
import { useExploreStore } from "../../store/exploreStore";
import { useLeafNoteStore } from "../../store/leafNoteStore";
import { MinimapWidget } from "./MinimapWidget";
import { LeafToolbar } from "./LeafToolbar";
import { LeafMarker } from "./LeafIcon";
import { LeafNoteSheet, type LeafNoteSheetMode } from "./LeafNoteSheet";
import { getExploreRooms } from "../../data/roomConfig";

const BUILDING_ID = "S";
const ZOOM = { min: 0.5, max: 3, step: 0.15 };
const DRAG_THRESHOLD = 5;

type NoteDialogState =
  | { kind: "create"; x: number; y: number }
  | { kind: "view" | "edit"; note: LeafNote };

interface RoomInteriorViewProps {
  room: RoomDef;
}

export function RoomInteriorView({ room }: RoomInteriorViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragMovedRef = useRef(false);

  const { exitToFloorMap, leafDropMode, setLeafDropMode } = useExploreStore();
  const { notes, addNote, updateNote, deleteNote } = useLeafNoteStore();

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, tx: 0, ty: 0 });
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);

  const canvasW = room.viewWidth;
  const canvasH = room.viewHeight;
  const allRooms = getExploreRooms(room.floorId);

  const roomNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.building === BUILDING_ID &&
          n.floorId === room.floorId &&
          n.roomId === room.id
      ),
    [notes, room.floorId, room.id]
  );

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setNoteDialog(null);
    setLeafDropMode(false);
  }, [room.id, setLeafDropMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (noteDialog) {
          setNoteDialog(null);
        } else {
          exitToFloorMap();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [noteDialog, exitToFloorMap]);

  const clampScale = (s: number) =>
    Math.min(ZOOM.max, Math.max(ZOOM.min, s));

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s + ZOOM.step));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => clampScale(s - ZOOM.step));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM.step : ZOOM.step;
    setScale((s) => clampScale(s + delta));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || leafDropMode) return;
      dragMovedRef.current = false;
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      });
    },
    [leafDropMode, translate.x, translate.y]
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

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!leafDropMode || dragMovedRef.current) return;
      const pt = clientToSvg(e.clientX, e.clientY);
      if (!pt) return;
      if (pt.x < 0 || pt.y < 0 || pt.x > canvasW || pt.y > canvasH) return;
      setNoteDialog({ kind: "create", x: pt.x, y: pt.y });
      setLeafDropMode(false);
    },
    [leafDropMode, clientToSvg, canvasW, canvasH, setLeafDropMode]
  );

  const sheetMode: LeafNoteSheetMode | null = noteDialog
    ? noteDialog.kind === "create"
      ? "create"
      : noteDialog.kind
    : null;

  const sheetText =
    noteDialog?.kind === "view" || noteDialog?.kind === "edit"
      ? noteDialog.note.text
      : "";

  const renderInterior = () => {
    const { interior } = room;
    if (interior.type === "image" && interior.imageSrc) {
      return (
        <image
          href={interior.imageSrc}
          x={0}
          y={0}
          width={canvasW}
          height={canvasH}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }
    return (
      <>
        <rect width={canvasW} height={canvasH} fill="#eceff1" />
        <rect
          x={canvasW * 0.12}
          y={canvasH * 0.18}
          width={canvasW * 0.76}
          height={canvasH * 0.64}
          rx={8}
          fill="rgba(255,255,255,0.55)"
          stroke="#90a4ae"
          strokeWidth={2}
          strokeDasharray="8 6"
        />
        <text
          x={canvasW / 2}
          y={canvasH / 2 - 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#455a64"
          fontSize={28}
          fontWeight="600"
        >
          {room.label}
        </text>
        <text
          x={canvasW / 2}
          y={canvasH / 2 + 22}
          textAnchor="middle"
          fill="#78909c"
          fontSize={14}
        >
          Placeholder · 贴图待替换
        </text>
      </>
    );
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="room-interior">
      <div className="room-interior-topbar">
        <div className="room-interior-title-row">
          <h2>{room.label}</h2>
          <span className="room-interior-badge">0F · Room View</span>
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
          className="room-interior-stage"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <svg
            ref={svgRef}
            className="room-interior-svg"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {renderInterior()}
            {roomNotes.map((note) => (
              <LeafMarker
                key={note.id}
                x={note.x}
                y={note.y}
                text={note.text}
                onClick={() => {
                  setNoteDialog({ kind: "view", note });
                }}
              />
            ))}
          </svg>
        </div>

        <div className="room-zoom-controls">
          <button
            type="button"
            className="room-zoom-btn"
            onClick={zoomIn}
            aria-label="Zoom in"
            title="放大"
          >
            +
          </button>
          <button
            type="button"
            className="room-zoom-btn"
            onClick={zoomOut}
            aria-label="Zoom out"
            title="缩小"
            disabled={scale <= ZOOM.min}
          >
            −
          </button>
          <button
            type="button"
            className="room-zoom-btn room-zoom-btn--reset"
            onClick={resetView}
            aria-label="Reset view"
            title="重置视图"
          >
            ⌂
          </button>
          <span className="room-zoom-label">{zoomPercent}%</span>
        </div>
      </div>

      <MinimapWidget
        rooms={allRooms}
        currentRoomId={room.id}
        onBackToMap={exitToFloorMap}
      />

      <LeafNoteSheet
        open={noteDialog !== null}
        mode={sheetMode ?? "create"}
        roomLabel={room.label}
        initialText={sheetText}
        onClose={() => setNoteDialog(null)}
        onSave={(text) => {
          if (!noteDialog) return;
          if (noteDialog.kind === "create") {
            addNote({
              building: BUILDING_ID,
              floorId: room.floorId,
              roomId: room.id,
              x: noteDialog.x,
              y: noteDialog.y,
              text,
            });
          } else if (noteDialog.kind === "edit") {
            updateNote(noteDialog.note.id, text);
          }
          setNoteDialog(null);
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
    </div>
  );
}
