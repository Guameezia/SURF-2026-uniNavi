import { create } from "zustand";
import type {
  GuideRoute,
  GuideRouteCompletion,
  GuideRouteProgress,
} from "../types/guide";

const STORAGE_KEY = "uni-navi-guide-progress";

interface PersistedProgress {
  active: GuideRouteProgress | null;
  completion: GuideRouteCompletion | null;
}

interface GuideProgressState extends PersistedProgress {
  startRoute: (route: GuideRoute) => void;
  advanceRoute: (route: GuideRoute) => GuideRouteCompletion | null;
  syncRoute: (route: GuideRoute) => void;
  endRoute: () => void;
  clearCompletion: () => void;
}

function load(): PersistedProgress {
  if (typeof window === "undefined") return { active: null, completion: null };
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}"
    ) as Partial<PersistedProgress>;
    return {
      active: parsed.active ?? null,
      completion: parsed.completion ?? null,
    };
  } catch {
    return { active: null, completion: null };
  }
}

function persist(data: PersistedProgress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures; in-memory progress remains usable.
  }
}

const initial = load();

export const useGuideProgressStore = create<GuideProgressState>((set, get) => ({
  ...initial,

  startRoute: (route) => {
    const now = Date.now();
    const first = route.stops[0];
    if (!first) return;
    const active: GuideRouteProgress = {
      routeId: route.id,
      currentStopIndex: 0,
      currentNoteId: first.noteId,
      startedAt: now,
      updatedAt: now,
    };
    persist({ active, completion: null });
    set({ active, completion: null });
  },

  advanceRoute: (route) => {
    const current = get().active;
    if (!current || current.routeId !== route.id) return null;
    const nextIndex = current.currentStopIndex + 1;
    if (nextIndex >= route.stops.length) {
      const completedAt = Date.now();
      const completion: GuideRouteCompletion = {
        routeId: route.id,
        routeName: route.name,
        completedStops: route.stops.length,
        floors: [...new Set(route.stops.map((stop) => stop.floorId))],
        startedAt: current.startedAt,
        completedAt,
      };
      persist({ active: null, completion });
      set({ active: null, completion });
      return completion;
    }

    const nextStop = route.stops[nextIndex];
    const active: GuideRouteProgress = {
      ...current,
      currentStopIndex: nextIndex,
      currentNoteId: nextStop.noteId,
      updatedAt: Date.now(),
    };
    persist({ active, completion: null });
    set({ active, completion: null });
    return null;
  },

  syncRoute: (route) => {
    const current = get().active;
    if (!current || current.routeId !== route.id || route.stops.length === 0) {
      return;
    }
    const sameNoteIndex = route.stops.findIndex(
      (stop) => stop.noteId === current.currentNoteId
    );
    const currentStopIndex =
      sameNoteIndex >= 0
        ? sameNoteIndex
        : Math.min(current.currentStopIndex, route.stops.length - 1);
    const active: GuideRouteProgress = {
      ...current,
      currentStopIndex,
      currentNoteId: route.stops[currentStopIndex].noteId,
      updatedAt: Date.now(),
    };
    persist({ active, completion: get().completion });
    set({ active });
  },

  endRoute: () => {
    persist({ active: null, completion: get().completion });
    set({ active: null });
  },

  clearCompletion: () => {
    persist({ active: get().active, completion: null });
    set({ completion: null });
  },
}));
