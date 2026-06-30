import { create } from "zustand";
import type { LeafNote, LeafNoteInput } from "../types/leafNote";

const STORAGE_KEY = "uni-navi-leaf-notes";

function loadNotes(): LeafNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeafNote[];
    return Array.isArray(parsed) ? parsed : [];
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

interface LeafNoteState {
  notes: LeafNote[];
  addNote: (input: LeafNoteInput) => LeafNote;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
}

export const useLeafNoteStore = create<LeafNoteState>((set) => ({
  notes: loadNotes(),

  addNote: (input) => {
    const now = Date.now();
    const note: LeafNote = {
      id: createId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const notes = [...state.notes, note];
      saveNotes(notes);
      return { notes };
    });
    return note;
  },

  updateNote: (id, text) => {
    set((state) => {
      const notes = state.notes.map((n) =>
        n.id === id ? { ...n, text, updatedAt: Date.now() } : n
      );
      saveNotes(notes);
      return { notes };
    });
  },

  deleteNote: (id) => {
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      saveNotes(notes);
      return { notes };
    });
  },
}));
