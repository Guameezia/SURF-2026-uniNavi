import { create } from "zustand";
import type {
  LeafNote,
  LeafNoteInput,
  LeafNoteUpdate,
} from "../types/leafNote";
import { inferIconFromTags } from "../utils/leafNoteIcons";
import {
  inferTagsFromText,
  inferTypeFromTags,
  mergeTags,
} from "../utils/leafNoteTags";
import { useTopicStore } from "./topicStore";

const STORAGE_KEY = "uni-navi-leaf-notes";
const LIKES_KEY = "uni-navi-leaf-likes";

function loadLikedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LIKES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveLikedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(LIKES_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function migrateNote(raw: Record<string, unknown>): LeafNote {
  const text = String(raw.text ?? "");
  const tags = Array.isArray(raw.tags)
    ? (raw.tags as LeafNote["tags"])
    : inferTagsFromText(text);
  const iconLocked = Boolean(raw.iconLocked);
  const iconId =
    (raw.iconId as LeafNote["iconId"]) ??
    inferIconFromTags(tags);

  return {
    id: String(raw.id ?? createId()),
    building: raw.building as LeafNote["building"],
    floorId: raw.floorId as LeafNote["floorId"],
    roomId: String(raw.roomId ?? ""),
    x: Number(raw.x ?? 0),
    y: Number(raw.y ?? 0),
    text,
    type: (raw.type as LeafNote["type"]) ?? inferTypeFromTags(tags),
    tags,
    iconId,
    iconLocked,
    status: (raw.status as LeafNote["status"]) ?? "active",
    helpfulCount: Number(raw.helpfulCount ?? 0),
    topicId: raw.topicId != null ? String(raw.topicId) : null,
    createdAt: Number(raw.createdAt ?? Date.now()),
    updatedAt: Number(raw.updatedAt ?? raw.createdAt ?? Date.now()),
  };
}

function loadNotes(): LeafNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) return [];
    const notes = parsed.map(migrateNote);
    saveNotes(notes);
    return notes;
  } catch {
    return [];
  }
}

function saveNotes(notes: LeafNote[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore quota errors
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveIconForNote(
  tags: LeafNote["tags"],
  iconId?: LeafNote["iconId"],
  iconLocked?: boolean
): LeafNote["iconId"] {
  if (iconLocked && iconId) return iconId;
  return iconId ?? inferIconFromTags(tags);
}

interface LeafNoteState {
  notes: LeafNote[];
  likedNoteIds: Set<string>;
  lastRefreshedAt: number | null;
  addNote: (input: LeafNoteInput) => LeafNote;
  updateNote: (id: string, update: LeafNoteUpdate) => void;
  deleteNote: (id: string) => void;
  setNoteStatus: (id: string, status: LeafNote["status"]) => void;
  markHelpful: (id: string) => boolean;
  hasLiked: (id: string) => boolean;
  refreshNotes: () => void;
}

export const useLeafNoteStore = create<LeafNoteState>((set, get) => ({
  notes: loadNotes(),
  likedNoteIds: loadLikedIds(),
  lastRefreshedAt: null,

  refreshNotes: () => {
    const notes = loadNotes();
    set({
      notes,
      likedNoteIds: loadLikedIds(),
      lastRefreshedAt: Date.now(),
    });
    useTopicStore.getState().syncFromNotes(notes);
  },

  addNote: (input) => {
    const now = Date.now();
    const tags = mergeTags(input.tags, input.text);
    const type = input.type ?? inferTypeFromTags(tags);
    const iconLocked = input.iconLocked ?? false;
    const iconId = resolveIconForNote(tags, input.iconId, iconLocked);
    const note: LeafNote = {
      id: createId(),
      building: input.building,
      floorId: input.floorId,
      roomId: input.roomId,
      x: input.x,
      y: input.y,
      text: input.text,
      type,
      tags,
      iconId,
      iconLocked,
      status: input.status ?? "active",
      helpfulCount: 0,
      topicId: input.topicId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const notes = [...state.notes, note];
      saveNotes(notes);
      useTopicStore.getState().syncFromNotes(notes);
      return { notes };
    });
    return note;
  },

  updateNote: (id, update) => {
    set((state) => {
      const notes = state.notes.map((n) => {
        if (n.id !== id) return n;
        const text = update.text ?? n.text;
        const tags =
          update.tags !== undefined
            ? mergeTags(update.tags, text)
            : mergeTags(n.tags, text);
        const type = update.type ?? inferTypeFromTags(tags);
        const iconLocked = update.iconLocked ?? n.iconLocked;
        const iconId = resolveIconForNote(
          tags,
          update.iconId ?? n.iconId,
          iconLocked
        );
        return {
          ...n,
          ...update,
          text,
          tags,
          type,
          iconId,
          iconLocked,
          updatedAt: Date.now(),
        };
      });
      saveNotes(notes);
      return { notes };
    });
  },

  deleteNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      saveNotes(notes);
      const likedNoteIds = new Set(state.likedNoteIds);
      likedNoteIds.delete(id);
      saveLikedIds(likedNoteIds);
      return { notes, likedNoteIds };
    });
  },

  setNoteStatus: (id, status) => {
    get().updateNote(id, { status });
  },

  hasLiked: (id) => get().likedNoteIds.has(id),

  markHelpful: (id) => {
    const { likedNoteIds } = get();
    if (likedNoteIds.has(id)) return false;

    const nextLiked = new Set(likedNoteIds);
    nextLiked.add(id);
    saveLikedIds(nextLiked);

    set((state) => {
      const notes = state.notes.map((n) =>
        n.id === id
          ? { ...n, helpfulCount: n.helpfulCount + 1, updatedAt: Date.now() }
          : n
      );
      saveNotes(notes);
      useTopicStore.getState().syncFromNotes(notes);
      return { notes, likedNoteIds: nextLiked };
    });
    return true;
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === LIKES_KEY) {
      useLeafNoteStore.getState().refreshNotes();
    }
  });
}
