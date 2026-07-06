/**
 * 星露谷式分房间主视图 — 保留新版 UI（顶栏、Leaf、小地图）+ 方向键导航
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMapStore } from "../../store/mapStore";
import { useRoomStore } from "../../store/roomStore";
import { useLeafNoteStore } from "../../store/leafNoteStore";
import { useTopicStore } from "../../store/topicStore";
import { useAppNavStore } from "../../store/appNavStore";
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
import { MinimapWidget } from "./MinimapWidget";
import { LeafToolbar } from "./LeafToolbar";
import { LeafMarker } from "./LeafIcon";
import { LeafNoteSheet, type LeafNoteSheetMode } from "./LeafNoteSheet";
import { type LeafNotePanelFilter } from "./LeafNotePanel";
import { filterAndSortNotes } from "../../utils/leafNoteTags";
import {
  canPromoteCluster,
  defaultTitleFromNote,
  getClusterForNote,
  isNoteHeating,
} from "../../utils/topicRules";
import {
  getRoomRouteSegment,
  getNextRouteRoom,
  filterRouteDirections,
} from "../../algorithms/routeRoomBridge";

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
    uiPhase,
    roomRoutePlan,
  } = useMapStore();
  const { currentRoomId, initForFloor, setRoom } = useRoomStore();
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    setNoteStatus,
    markHelpful,
    hasLiked,
  } = useLeafNoteStore();
  const { getActiveTopics, getTopicById, createTopicFromPromotion, topics, dismissedClusterKeys } =
    useTopicStore();
  const {
    pendingTopic,
    dropLeafOnArrive,
    consumeDropLeafIntent,
    clearPendingTopic,
  } = useAppNavStore();

  const activeTopics = getActiveTopics();

  const [createTopicId, setCreateTopicId] = useState<string | null>(null);

  const [noteFilter, setNoteFilter] = useState<LeafNotePanelFilter>({
    tagId: "all",
    query: "",
    sort: "helpful",
    showResolved: false,
  });

  const floorId = currentFloorId;
  const isNavigating = uiPhase === "navigating";
  const floorRoomRoute = useMemo(
    () => getRoomRouteSegment(roomRoutePlan, floorId),
    [roomRoutePlan, floorId]
  );
  const nextRouteRoomId = useMemo(() => {
    if (!isNavigating || !floorRoomRoute || !currentRoomId) return null;
    return getNextRouteRoom(floorRoomRoute, currentRoomId);
  }, [isNavigating, floorRoomRoute, currentRoomId]);

  const nextRouteRoom = nextRouteRoomId
    ? getRoomById(floorId, nextRouteRoomId)
    : undefined;
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
    if (!dropLeafOnArrive || !pendingTopic) return;
    consumeDropLeafIntent();
    setCreateTopicId(pendingTopic.topicId);
    if (pendingTopic.suggestedTags.length > 0) {
      setNoteFilter((prev) => ({
        ...prev,
        tagId: pendingTopic.suggestedTags[0],
      }));
    }
    setLeafDropMode(true);
    setNoteDialog(null);
  }, [dropLeafOnArrive, pendingTopic, consumeDropLeafIntent]);

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

  const filteredRoomNotes = useMemo(
    () =>
      filterAndSortNotes(roomNotes, {
        tagId: noteFilter.tagId,
        query: noteFilter.query,
        sort: noteFilter.sort,
        status: noteFilter.showResolved ? "all" : "active_only",
      }),
    [roomNotes, noteFilter]
  );

  const mapNotes = useMemo(
    () => roomNotes.filter((n) => n.status === "active"),
    [roomNotes]
  );

  const isPlacingLeaf = leafDropMode && noteDialog === null;
  const isCreatingLeaf = noteDialog?.kind === "create";

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
    if (isNavigating && floorRoomRoute && floorRoomRoute.length > 0) {
      return filterRouteDirections(
        floorId,
        room.id,
        result,
        floorRoomRoute
      );
    }
    return result;
  }, [room, floorId, isNavigating, floorRoomRoute]);

  const highlightDirs = useMemo(() => {
    if (!nextRouteRoomId || !room) return [] as Direction[];
    return (["up", "down", "left", "right"] as Direction[]).filter(
      (dir) => room.neighbors[dir] === nextRouteRoomId
    );
  }, [nextRouteRoomId, room]);

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

  const dialogNoteId =
    noteDialog && noteDialog.kind !== "create" ? noteDialog.note.id : null;

  const sheetNote = useMemo(
    () =>
      dialogNoteId
        ? (notes.find((n) => n.id === dialogNoteId) ?? null)
        : null,
    [notes, dialogNoteId]
  );

  const sheetTags = useMemo(() => {
    if (noteDialog?.kind === "create") {
      const topic = createTopicId ? getTopicById(createTopicId) : null;
      if (topic?.suggestedTags.length) return [...topic.suggestedTags];
      return [];
    }
    return sheetNote?.tags ?? [];
  }, [noteDialog, createTopicId, getTopicById, sheetNote?.tags]);

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
    noteDialog?.kind === "create" ? "" : (sheetNote?.text ?? "");

  const sheetIconId =
    noteDialog?.kind === "create" ? undefined : sheetNote?.iconId;

  const sheetIconLocked =
    noteDialog?.kind === "create" ? false : (sheetNote?.iconLocked ?? false);

  const linkedTopic = sheetNote?.topicId
    ? getTopicById(sheetNote.topicId) ?? null
    : null;

  const viewCluster = sheetNote
    ? getClusterForNote(sheetNote, notes)
    : null;

  const canPromoteTopic =
    !!sheetNote &&
    !!viewCluster &&
    canPromoteCluster(viewCluster, topics, dismissedClusterKeys);

  const promoteDefaultTitle = sheetNote
    ? defaultTitleFromNote(sheetNote.text, sheetNote.roomId)
    : "";

  const pendingTopicTitle = pendingTopic
    ? getTopicById(pendingTopic.topicId)?.title
    : null;

  const zoomPercent = Math.round(scale * 100);

  const createGuide = isCreatingLeaf
    ? {
        notes: roomNotes,
        filteredNotes: filteredRoomNotes,
        filter: noteFilter,
        onFilterChange: (patch: Partial<LeafNotePanelFilter>) =>
          setNoteFilter((prev) => ({ ...prev, ...patch })),
        onSelectNote: (note: LeafNote) =>
          setNoteDialog({ kind: "view", note }),
      }
    : undefined;

  return (
    <div className="room-interior room-map-view">
      <div className="room-interior-topbar">
        <div className="room-interior-title-row">
          <h2>{room.label}</h2>
          <span className="room-interior-badge">{floorId} · Room View</span>
          <LeafToolbar
            dropMode={leafDropMode}
            onToggleDropMode={() => {
              setLeafDropMode((active) => {
                const next = !active;
                if (!next) {
                  setNoteDialog(null);
                  clearPendingTopic();
                  setCreateTopicId(null);
                }
                return next;
              });
            }}
            noteCount={roomNotes.length}
          />
        </div>
        {isNavigating && nextRouteRoom && (
          <div className="room-nav-hint" role="status">
            下一站：<strong>{nextRouteRoom.label}</strong>
          </div>
        )}
        {isNavigating && !nextRouteRoom && floorRoomRoute?.includes(room.id) && (
          <div className="room-nav-hint room-nav-hint--arrived" role="status">
            已到达本层路线终点
          </div>
        )}
      </div>

      {isPlacingLeaf && (
        <div className="room-interior-drop-banner">
          <span>
            点击地图选择便签放置位置
            {pendingTopicTitle && (
              <> · 参与话题：<strong>{pendingTopicTitle}</strong></>
            )}
          </span>
        </div>
      )}

      <div
        className={`room-interior-canvas${isPlacingLeaf ? " room-interior-canvas--drop-mode" : ""}${isDragging ? " room-interior-canvas--dragging" : ""}`}
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
            transformOrigin: "top center",
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
            {mapNotes.map((note) => (
              <LeafMarker
                key={note.id}
                x={note.x}
                y={note.y}
                text={note.text}
                iconId={note.iconId}
                tags={note.tags}
                status={note.status}
                helpfulCount={note.helpfulCount}
                isHeating={isNoteHeating(note)}
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
          highlightDirs={highlightDirs}
        />
      </div>

      <MinimapWidget
        floorId={floorId}
        rooms={rooms}
        currentRoomId={currentRoomId}
        onSelectRoom={navigateToRoom}
        showRoute
        highlightRoomId={nextRouteRoomId}
        routeRoomIds={floorRoomRoute ?? undefined}
      />

      <LeafNoteSheet
        open={noteDialog !== null}
        mode={sheetMode ?? "create"}
        roomLabel={room.label}
        note={sheetNote}
        initialText={sheetText}
        initialTags={sheetTags}
        initialIconId={sheetIconId}
        initialIconLocked={sheetIconLocked}
        hasLiked={sheetNote ? hasLiked(sheetNote.id) : false}
        activeTopics={activeTopics}
        selectedTopicId={createTopicId}
        onTopicChange={setCreateTopicId}
        linkedTopic={linkedTopic}
        isHeating={sheetNote ? isNoteHeating(sheetNote) : false}
        canPromoteTopic={canPromoteTopic}
        promoteDefaultTitle={promoteDefaultTitle}
        onPromoteTopic={
          sheetNote
            ? (title) => {
                const topic = createTopicFromPromotion({
                  title,
                  originNote: sheetNote,
                });
                updateNote(sheetNote.id, { topicId: topic.id });
              }
            : undefined
        }
        guide={createGuide}
        onClose={() => {
          setNoteDialog(null);
          if (leafDropMode && noteDialog?.kind === "create") {
            clearPendingTopic();
            setCreateTopicId(null);
          }
        }}
        onSave={({ text, tags, iconId, iconLocked }) => {
          if (!noteDialog) return;
          if (noteDialog.kind === "create" && currentRoomId) {
            addNote({
              building: BUILDING_ID,
              floorId,
              roomId: currentRoomId,
              x: noteDialog.x,
              y: noteDialog.y,
              text,
              tags,
              iconId,
              iconLocked,
              topicId: createTopicId,
            });
            clearPendingTopic();
            setCreateTopicId(null);
          } else if (noteDialog.kind === "edit") {
            updateNote(noteDialog.note.id, {
              text,
              tags,
              iconId,
              iconLocked,
            });
          }
          setNoteDialog(null);
          setLeafDropMode(false);
        }}
        onMarkHelpful={
          sheetNote ? () => markHelpful(sheetNote.id) : undefined
        }
        onSetStatus={
          sheetNote
            ? (status) => setNoteStatus(sheetNote.id, status)
            : undefined
        }
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
