import { create } from "zustand";
import type {
  GuideCollection,
  GuideOverlay,
  GuideRoute,
  GuideRouteStop,
  GuideRouteTag,
  GuideTheme,
} from "../types/guide";
import type { LeafNote } from "../types/leafNote";
import type { Graph } from "../types/indoor";
import { getRoomById } from "../data/roomConfig";
import { buildGuideRouteGeometry } from "../algorithms/guideRouteGeometry";

const STORAGE_KEY = "uni-navi-guides";

interface GuidePersist {
  collections: GuideCollection[];
  routes: GuideRoute[];
}

interface GuideState {
  collections: GuideCollection[];
  routes: GuideRoute[];
  activeOverlay: GuideOverlay | null;

  refresh: () => void;
  createCollection: (name: string, theme: GuideTheme) => GuideCollection;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  addNoteToCollection: (collectionId: string, noteId: string) => boolean;
  removeNoteFromCollection: (collectionId: string, noteId: string) => void;

  createRoute: (input: {
    name: string;
    noteIds: string[];
    notes: LeafNote[];
    collectionId?: string | null;
    graph?: Graph | null;
    description?: string;
    tags?: GuideRouteTag[];
    estimatedMinutes?: number;
  }) => GuideRoute | null;
  updateRouteDetails: (
    id: string,
    patch: Partial<
      Pick<GuideRoute, "name" | "description" | "tags" | "estimatedMinutes">
    >,
    graph?: Graph | null
  ) => void;
  updateRouteStops: (
    id: string,
    noteIds: string[],
    notes: LeafNote[],
    graph?: Graph | null
  ) => GuideRoute | null;
  deleteRoute: (id: string) => void;
  recomputeRouteGeometries: (graph: Graph) => void;

  setActiveOverlay: (overlay: GuideOverlay | null) => void;
  getCollectionRoomIds: (collectionId: string, notes: LeafNote[]) => string[];
  getRouteRoomIdsOnFloor: (
    routeId: string,
    floorId: string
  ) => string[];
  buildShareText: (
    kind: "collection" | "route",
    id: string,
    notes: LeafNote[]
  ) => string;
}

function createId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const ROUTE_TAG_IDS = new Set<GuideRouteTag>([
  "food",
  "study",
  "tour",
  "accessible",
]);

export function estimateGuideRouteMinutes(stops: GuideRouteStop[]): number {
  const floors = new Set(stops.map((stop) => stop.floorId)).size;
  return Math.max(
    10,
    stops.length * 5 + Math.max(0, stops.length - 1) * 2 + (floors - 1) * 4
  );
}

function normalizeRoute(route: GuideRoute): GuideRoute {
  const tags = Array.isArray(route.tags)
    ? route.tags.filter((tag): tag is GuideRouteTag => ROUTE_TAG_IDS.has(tag))
    : [];
  const normalizedTags = tags.length > 0 ? [...new Set(tags)] : ["tour" as const];
  return {
    ...route,
    description:
      typeof route.description === "string" && route.description.trim()
        ? route.description.trim()
        : `串联 ${route.stops.length} 个校园地点的主题攻略路线。`,
    tags: normalizedTags,
    estimatedMinutes:
      Number.isFinite(route.estimatedMinutes) && route.estimatedMinutes > 0
        ? Math.round(route.estimatedMinutes)
        : estimateGuideRouteMinutes(route.stops),
  };
}

function load(): GuidePersist {
  if (typeof window === "undefined") return { collections: [], routes: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { collections: [], routes: [] };
    const parsed = JSON.parse(raw) as GuidePersist;
    return {
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
      routes: Array.isArray(parsed.routes)
        ? parsed.routes.map((route) => normalizeRoute(route))
        : [],
    };
  } catch {
    return { collections: [], routes: [] };
  }
}

function save(data: GuidePersist) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function stopsFromNotes(noteIds: string[], notes: LeafNote[]): GuideRouteStop[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const stops: GuideRouteStop[] = [];
  for (const noteId of noteIds) {
    const note = byId.get(noteId);
    if (!note) continue;
    const room = getRoomById(note.floorId, note.roomId);
    stops.push({
      noteId: note.id,
      floorId: note.floorId,
      roomId: note.roomId,
      roomLabel: room?.label ?? note.roomId,
      noteText: note.text.slice(0, 80),
    });
  }
  return stops;
}

const initial = load();

export const useGuideStore = create<GuideState>((set, get) => ({
  collections: initial.collections,
  routes: initial.routes,
  activeOverlay: null,

  refresh: () => {
    const data = load();
    set({ collections: data.collections, routes: data.routes });
  },

  createCollection: (name, theme) => {
    const trimmed = name.trim() || "未命名收藏夹";
    const now = Date.now();
    const collection: GuideCollection = {
      id: createId(),
      name: trimmed,
      theme,
      noteIds: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const collections = [collection, ...s.collections];
      save({ collections, routes: s.routes });
      return { collections };
    });
    return collection;
  },

  renameCollection: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => {
      const collections = s.collections.map((c) =>
        c.id === id ? { ...c, name: trimmed, updatedAt: Date.now() } : c
      );
      save({ collections, routes: s.routes });
      return { collections };
    });
  },

  deleteCollection: (id) => {
    set((s) => {
      const collections = s.collections.filter((c) => c.id !== id);
      const routes = s.routes.map((r) =>
        r.collectionId === id ? { ...r, collectionId: null } : r
      );
      const activeOverlay =
        s.activeOverlay?.kind === "collection" && s.activeOverlay.id === id
          ? null
          : s.activeOverlay;
      save({ collections, routes });
      return { collections, routes, activeOverlay };
    });
  },

  addNoteToCollection: (collectionId, noteId) => {
    const target = get().collections.find((c) => c.id === collectionId);
    if (!target) return false;
    if (target.noteIds.includes(noteId)) return true;
    set((s) => {
      const collections = s.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              noteIds: [...c.noteIds, noteId],
              updatedAt: Date.now(),
            }
          : c
      );
      save({ collections, routes: s.routes });
      return { collections };
    });
    return true;
  },

  removeNoteFromCollection: (collectionId, noteId) => {
    set((s) => {
      const collections = s.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              noteIds: c.noteIds.filter((id) => id !== noteId),
              updatedAt: Date.now(),
            }
          : c
      );
      save({ collections, routes: s.routes });
      return { collections };
    });
  },

  createRoute: ({
    name,
    noteIds,
    notes,
    collectionId,
    graph,
    description,
    tags = ["tour"],
    estimatedMinutes,
  }) => {
    const unique = [...new Set(noteIds)];
    if (unique.length < 3 || unique.length > 8) return null;
    const stops = stopsFromNotes(unique, notes);
    if (stops.length < 3) return null;
    const now = Date.now();
    const routeTags = tags.length > 0 ? [...new Set(tags)] : ["tour" as const];
    const accessible = routeTags.includes("accessible");
    const geometry = graph
      ? buildGuideRouteGeometry(graph, stops, accessible)
      : undefined;
    const route: GuideRoute = {
      id: createId(),
      name: name.trim() || "未命名路线",
      description:
        description?.trim() ||
        `串联 ${stops.length} 个校园地点的主题攻略路线。`,
      tags: routeTags,
      estimatedMinutes:
        estimatedMinutes && estimatedMinutes > 0
          ? Math.round(estimatedMinutes)
          : estimateGuideRouteMinutes(stops),
      collectionId: collectionId ?? null,
      stops,
      geometry,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const routes = [route, ...s.routes];
      save({ collections: s.collections, routes });
      return { routes };
    });
    return route;
  },

  updateRouteDetails: (id, patch, graph) => {
    set((s) => {
      const routes = s.routes.map((route) => {
        if (route.id !== id) return route;
        const tags =
          patch.tags && patch.tags.length > 0
            ? [...new Set(patch.tags)]
            : route.tags;
        const next = normalizeRoute({
          ...route,
          ...patch,
          name: patch.name?.trim() || route.name,
          description: patch.description?.trim() || route.description,
          tags,
          estimatedMinutes:
            patch.estimatedMinutes && patch.estimatedMinutes > 0
              ? Math.round(patch.estimatedMinutes)
              : route.estimatedMinutes,
          updatedAt: Date.now(),
        });
        if (!graph || tags.includes("accessible") === route.tags.includes("accessible")) {
          return next;
        }
        return {
          ...next,
          geometry: buildGuideRouteGeometry(
            graph,
            next.stops,
            tags.includes("accessible")
          ),
        };
      });
      save({ collections: s.collections, routes });
      return { routes };
    });
  },

  updateRouteStops: (id, noteIds, notes, graph) => {
    const unique = [...new Set(noteIds)];
    if (unique.length < 3 || unique.length > 8) return null;
    const stops = stopsFromNotes(unique, notes);
    if (stops.length !== unique.length) return null;

    let updated: GuideRoute | null = null;
    set((s) => {
      const routes = s.routes.map((route) => {
        if (route.id !== id) return route;
        updated = {
          ...route,
          stops,
          geometry: graph
            ? buildGuideRouteGeometry(
                graph,
                stops,
                route.tags.includes("accessible")
              )
            : undefined,
          estimatedMinutes: estimateGuideRouteMinutes(stops),
          updatedAt: Date.now(),
        };
        return updated;
      });
      save({ collections: s.collections, routes });
      return { routes };
    });
    return updated;
  },

  recomputeRouteGeometries: (graph) => {
    set((s) => {
      const routes = s.routes.map((r) => ({
        ...r,
        geometry: buildGuideRouteGeometry(
          graph,
          r.stops,
          r.tags.includes("accessible")
        ),
        updatedAt: Date.now(),
      }));
      save({ collections: s.collections, routes });
      return { routes };
    });
  },

  deleteRoute: (id) => {
    set((s) => {
      const routes = s.routes.filter((r) => r.id !== id);
      const activeOverlay =
        s.activeOverlay?.kind === "route" && s.activeOverlay.id === id
          ? null
          : s.activeOverlay;
      save({ collections: s.collections, routes });
      return { routes, activeOverlay };
    });
  },

  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  getCollectionRoomIds: (collectionId, notes) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return [];
    const idSet = new Set(collection.noteIds);
    const rooms = new Set<string>();
    for (const note of notes) {
      if (idSet.has(note.id)) rooms.add(note.roomId);
    }
    return [...rooms];
  },

  getRouteRoomIdsOnFloor: (routeId, floorId) => {
    const route = get().routes.find((r) => r.id === routeId);
    if (!route) return [];
    return route.stops
      .filter((s) => s.floorId === floorId)
      .map((s) => s.roomId);
  },

  buildShareText: (kind, id, notes) => {
    if (kind === "collection") {
      const collection = get().collections.find((c) => c.id === id);
      if (!collection) return "";
      const byId = new Map(notes.map((n) => [n.id, n]));
      const lines = collection.noteIds
        .map((nid, i) => {
          const note = byId.get(nid);
          if (!note) return null;
          const room = getRoomById(note.floorId, note.roomId);
          return `${i + 1}. [${note.floorId}] ${room?.label ?? note.roomId} — ${note.text.slice(0, 40)}`;
        })
        .filter(Boolean);
      return [
        `【UniNavi 收藏夹】${collection.name}`,
        `主题：${collection.theme} · ${collection.noteIds.length} 个地点`,
        "",
        ...lines,
        "",
        "（截图或复制此文本即可分享）",
      ].join("\n");
    }

    const route = get().routes.find((r) => r.id === id);
    if (!route) return "";
    const lines = route.stops.map(
      (s, i) =>
        `${i + 1}. [${s.floorId}] ${s.roomLabel} — ${s.noteText.slice(0, 40)}`
    );
    return [
      `【UniNavi 主题路线】${route.name}`,
      route.description,
      `${route.estimatedMinutes} 分钟 · ${route.stops.length} 站 · ${[...new Set(route.stops.map((stop) => stop.floorId))].join("、")}`,
      `标签：${route.tags.join("、")}`,
      "",
      ...lines,
      "",
      "（截图或复制此文本即可分享）",
    ].join("\n");
  },
}));
