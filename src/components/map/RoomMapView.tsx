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
import { AddToCollectionSheet } from "../guide/AddToCollectionSheet";
import { TimelineSheet } from "../guide/TimelineSheet";
import { TimelineFilterButton } from "../guide/TimelineFilterButton";
import { filterAndSortNotes } from "../../utils/leafNoteTags";
import { useTwoFingerPanZoom } from "../../hooks/useTwoFingerPanZoom";
import {
  canPromoteCluster,
  defaultTitleFromNote,
  getClusterForNote,
  isNoteHeating,
} from "../../utils/topicRules";
import {
  getRoomRouteSegment,
  getNextRouteRoom,
} from "../../algorithms/routeRoomBridge";
import { useGuideStore } from "../../store/guideStore";
import type { TimelineFilter } from "../../types/guide";

const BUILDING_ID = "S";
const MAP_INTERACTION = { minScale: 0.5, maxScale: 2.5, scaleStep: 0.1 };

type NoteDialogState =
  | { kind: "create"; x: number; y: number }
  | { kind: "view" | "edit"; note: LeafNote };

const ARROW_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function guideDirectionLabel(
  floorId: string,
  room: ReturnType<typeof getRoomById>,
  nextFloorId: string,
  nextRoom: ReturnType<typeof getRoomById>
): string {
  if (floorId !== nextFloorId) {
    const currentLevel = Number.parseInt(floorId, 10);
    const nextLevel = Number.parseInt(nextFloorId, 10);
    const vertical = nextLevel > currentLevel ? "↑ 上楼" : "↓ 下楼";
    return `前往楼梯/电梯 · ${vertical}至 ${nextFloorId}`;
  }
  if (!room || !nextRoom) return "沿小地图橙色路线前进";
  const from = room.overviewRect;
  const to = nextRoom.overviewRect;
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "→ 向东前进" : "← 向西前进";
  }
  return dy >= 0 ? "↓ 向南前进" : "↑ 向北前进";
}

interface RoomMapViewProps {
  debugMode?: boolean;
}

export const RoomMapView: React.FC<RoomMapViewProps> = ({ debugMode: _debugMode = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    currentFloorId,
    transitionToFloor,
    floorEntryRoomId,
    clearFloorEntry,
    uiPhase,
    roomRoutePlan,
    graph,
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
    pendingMapFocus,
    consumeMapFocus,
    focusOnMap,
  } = useAppNavStore();
  const {
    activeOverlay,
    setActiveOverlay,
    collections,
    routes,
    recomputeRouteGeometries,
  } = useGuideStore();

  const activeTopics = getActiveTopics();

  const [createTopicId, setCreateTopicId] = useState<string | null>(null);
  const [collectNote, setCollectNote] = useState<LeafNote | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [guideProgressIndex, setGuideProgressIndex] = useState(0);

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

  const [leafDropMode, setLeafDropMode] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);
  const [viewpointDialog, setViewpointDialog] = useState<ViewpointDef | null>(null);

  const {
    containerRef: canvasRef,
    scale,
    translate,
    isGesturing,
    resetView,
    zoomBy,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  } = useTwoFingerPanZoom({
    minScale: MAP_INTERACTION.minScale,
    maxScale: MAP_INTERACTION.maxScale,
    enabled: !leafDropMode,
  });

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
    if (!pendingMapFocus) return;
    const intent = consumeMapFocus();
    if (!intent) return;
    if (intent.floorId !== floorId) {
      transitionToFloor(intent.floorId, null, intent.roomId);
    } else {
      setRoom(intent.roomId);
    }
    if (intent.noteId) {
      const note = notes.find((n) => n.id === intent.noteId);
      if (note) setNoteDialog({ kind: "view", note });
    }
  }, [
    pendingMapFocus,
    consumeMapFocus,
    floorId,
    transitionToFloor,
    setRoom,
    notes,
  ]);

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
    resetView();
    setNoteDialog(null);
    setViewpointDialog(null);
    setLeafDropMode(false);
  }, [currentRoomId, resetView]);

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
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (verticalPad && e.code === "KeyW" && verticalPad.canUp) {
        e.preventDefault();
        verticalPad.onUp();
        return;
      }
      if (verticalPad && e.code === "KeyS" && verticalPad.canDown) {
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
    return result;
  }, [room, floorId]);

  const highlightDirs = useMemo(() => {
    if (!nextRouteRoomId || !room) return [] as Direction[];
    return (["up", "down", "left", "right"] as Direction[]).filter(
      (dir) => room.neighbors[dir] === nextRouteRoomId
    );
  }, [nextRouteRoomId, room]);

  const spotlightRoomIds = useMemo(() => {
    if (!activeOverlay || activeOverlay.kind !== "collection") return undefined;
    const collection = collections.find((c) => c.id === activeOverlay.id);
    if (!collection) return undefined;
    const noteIdSet = new Set(collection.noteIds);
    const roomIds = [
      ...new Set(
        notes
          .filter((n) => noteIdSet.has(n.id) && n.floorId === floorId)
          .map((n) => n.roomId)
      ),
    ];
    return roomIds.length > 0 ? roomIds : undefined;
  }, [activeOverlay, collections, notes, floorId]);

  const guideStops = useMemo(() => {
    if (!activeOverlay || activeOverlay.kind !== "route") return undefined;
    const route = routes.find((r) => r.id === activeOverlay.id);
    if (!route) return undefined;
    const stops = route.stops
      .map((stop, index) => ({ stop, order: index + 1 }))
      .filter(({ stop }) => stop.floorId === floorId)
      .map(({ stop, order }) => ({ roomId: stop.roomId, order }));
    return stops.length > 0 ? stops : undefined;
  }, [activeOverlay, routes, floorId]);

  const activeGuideRoute = useMemo(() => {
    if (!activeOverlay || activeOverlay.kind !== "route") return null;
    return routes.find((r) => r.id === activeOverlay.id) ?? null;
  }, [activeOverlay, routes]);

  useEffect(() => {
    setGuideProgressIndex(0);
  }, [activeGuideRoute?.id]);

  useEffect(() => {
    if (!activeGuideRoute || !currentRoomId) return;
    const reachedIndex = activeGuideRoute.stops.findIndex(
      (stop) => stop.floorId === floorId && stop.roomId === currentRoomId
    );
    if (reachedIndex >= 0) setGuideProgressIndex(reachedIndex);
  }, [activeGuideRoute, currentRoomId, floorId]);

  useEffect(() => {
    if (!activeGuideRoute || !graph || activeGuideRoute.geometry) return;
    recomputeRouteGeometries(graph);
  }, [activeGuideRoute, graph, recomputeRouteGeometries]);

  const currentGuideStopIndex = activeGuideRoute ? guideProgressIndex : -1;
  const currentStopOrder =
    currentGuideStopIndex >= 0 ? currentGuideStopIndex + 1 : null;

  const nextGuideStop = useMemo(() => {
    if (!activeGuideRoute || currentGuideStopIndex < 0) return null;
    if (currentGuideStopIndex >= activeGuideRoute.stops.length - 1) return null;
    return activeGuideRoute.stops[currentGuideStopIndex + 1];
  }, [activeGuideRoute, currentGuideStopIndex]);

  const guideActiveLegIndex =
    activeGuideRoute && currentGuideStopIndex < activeGuideRoute.stops.length - 1
      ? currentGuideStopIndex
      : null;

  const nextGuideDirection = useMemo(() => {
    if (!nextGuideStop) return null;
    const nextRoom = getRoomById(nextGuideStop.floorId, nextGuideStop.roomId);
    return guideDirectionLabel(floorId, room, nextGuideStop.floorId, nextRoom);
  }, [nextGuideStop, floorId, room]);

  const currentGuideStopNote = useMemo(() => {
    if (!activeGuideRoute || currentGuideStopIndex < 0) return null;
    const stop = activeGuideRoute.stops[currentGuideStopIndex];
    return notes.find((n) => n.id === stop.noteId) ?? null;
  }, [activeGuideRoute, currentGuideStopIndex, notes]);

  const routeNoteIdsInRoom = useMemo(() => {
    if (!activeGuideRoute || !currentRoomId) return new Set<string>();
    return new Set(
      activeGuideRoute.stops
        .filter((s) => s.floorId === floorId && s.roomId === currentRoomId)
        .map((s) => s.noteId)
    );
  }, [activeGuideRoute, currentRoomId, floorId]);

  const activeOverlayLabel = useMemo(() => {
    if (!activeOverlay) return null;
    if (activeOverlay.kind === "collection") {
      return collections.find((c) => c.id === activeOverlay.id)?.name ?? null;
    }
    return routes.find((r) => r.id === activeOverlay.id)?.name ?? null;
  }, [activeOverlay, collections, routes]);

  const canvasW = room?.viewWidth ?? 640;
  const canvasH = room?.viewHeight ?? 400;

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
      if (!leafDropMode || isGesturing) return;
      if ((e.target as Element).closest?.(".leaf-note-marker, .viewpoint-marker")) return;
      const pt = clientToSvg(e.clientX, e.clientY);
      if (!pt || !currentRoomId) return;
      if (pt.x < 0 || pt.y < 0 || pt.x > canvasW || pt.y > canvasH) return;
      setNoteDialog({ kind: "create", x: pt.x, y: pt.y });
    },
    [leafDropMode, isGesturing, clientToSvg, currentRoomId, canvasW, canvasH]
  );

  const zoomIn = useCallback(() => {
    zoomBy(MAP_INTERACTION.scaleStep);
  }, [zoomBy]);

  const zoomOut = useCallback(() => {
    zoomBy(-MAP_INTERACTION.scaleStep);
  }, [zoomBy]);

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
          <TimelineFilterButton
            filter={timelineFilter}
            onSelect={(next) => {
              setTimelineFilter(next);
              setTimelineOpen(true);
            }}
          />
        </div>
        {activeOverlay?.kind === "collection" && activeOverlayLabel && (
          <div className="room-guide-banner" role="status">
            <span>
              收藏夹高亮：<strong>{activeOverlayLabel}</strong>
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setActiveOverlay(null)}
            >
              清除
            </button>
          </div>
        )}
        {activeGuideRoute && currentGuideStopIndex >= 0 && (
          <div className="room-guide-leg" aria-label="当前攻略站点">
            <button
              type="button"
              className="room-guide-leg-current"
              onClick={() => {
                if (currentGuideStopNote) {
                  setNoteDialog({ kind: "view", note: currentGuideStopNote });
                }
              }}
            >
              <span className="room-guide-leg-index">{currentStopOrder}</span>
              <span className="room-guide-leg-label">
                当前站 · {activeGuideRoute.stops[currentGuideStopIndex].roomLabel}
              </span>
              <span className="room-guide-leg-hint">点击查看便签</span>
            </button>
            {nextGuideStop ? (
              <div className="room-guide-leg-next" role="status">
                <span>下一站：<strong>{nextGuideStop.roomLabel}</strong></span>
                <span className="room-guide-leg-direction">
                  {nextGuideDirection}
                </span>
              </div>
            ) : (
              <div className="room-guide-leg-next room-guide-leg-next--done" role="status">
                已是最后一站
              </div>
            )}
          </div>
        )}
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
        ref={canvasRef}
        className={`room-interior-canvas${isPlacingLeaf ? " room-interior-canvas--drop-mode" : ""}${isGesturing ? " room-interior-canvas--gesturing" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
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
            {currentStopOrder != null && (
              <g className="room-guide-stop-badge" pointerEvents="none">
                <circle
                  cx={40}
                  cy={40}
                  r={22}
                  fill="#ef6c00"
                  stroke="#fff"
                  strokeWidth={3}
                />
                <text
                  x={40}
                  y={46}
                  textAnchor="middle"
                  fontSize={18}
                  fontWeight={700}
                  fill="#fff"
                >
                  {currentStopOrder}
                </text>
              </g>
            )}
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
            {mapNotes
              .filter((note) => routeNoteIdsInRoom.has(note.id))
              .map((note) => (
                <circle
                  key={`route-ring-${note.id}`}
                  cx={note.x}
                  cy={note.y}
                  r={22}
                  fill="none"
                  stroke="#ef6c00"
                  strokeWidth={3}
                  strokeDasharray="4 3"
                  pointerEvents="none"
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
        onSelectGuideStop={(stopIndex) => {
          const stop = activeGuideRoute?.stops[stopIndex];
          if (!stop) return;
          setGuideProgressIndex(stopIndex);
          focusOnMap({
            floorId: stop.floorId,
            roomId: stop.roomId,
            noteId: stop.noteId,
          });
        }}
        showRoute={!activeGuideRoute && isNavigating}
        highlightRoomId={nextRouteRoomId}
        routeRoomIds={floorRoomRoute ?? undefined}
        spotlightRoomIds={spotlightRoomIds}
        guideStops={guideStops}
        guideGeometry={activeGuideRoute?.geometry}
        guideRouteStops={activeGuideRoute?.stops}
        guideActiveLegIndex={guideActiveLegIndex}
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
        onAddToCollection={
          sheetNote ? () => setCollectNote(sheetNote) : undefined
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

      <AddToCollectionSheet
        open={collectNote !== null}
        note={collectNote}
        onClose={() => setCollectNote(null)}
      />

      <TimelineSheet
        open={timelineOpen}
        floorId={floorId}
        roomId={currentRoomId}
        notes={notes}
        filter={timelineFilter}
        onSelectNote={(note) => {
          setTimelineOpen(false);
          setNoteDialog({ kind: "view", note });
        }}
        onClose={() => setTimelineOpen(false)}
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
