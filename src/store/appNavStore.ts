import { create } from "zustand";
import type { FloorId } from "../types/indoor";
import type { LeafNoteTagId } from "../types/leafNote";
import type { PendingTopicIntent } from "../types/topic";

export interface MapFocusIntent {
  floorId: FloorId;
  roomId: string;
  noteId?: string | null;
}

interface AppNavState {
  pendingTopic: PendingTopicIntent | null;
  dropLeafOnArrive: boolean;
  pendingMapFocus: MapFocusIntent | null;

  participateTopic: (topicId: string, suggestedTags: LeafNoteTagId[]) => void;
  clearPendingTopic: () => void;
  consumeDropLeafIntent: () => PendingTopicIntent | null;

  focusOnMap: (intent: MapFocusIntent) => void;
  consumeMapFocus: () => MapFocusIntent | null;
}

export const useAppNavStore = create<AppNavState>((set, get) => ({
  pendingTopic: null,
  dropLeafOnArrive: false,
  pendingMapFocus: null,

  participateTopic: (topicId, suggestedTags) => {
    set({
      pendingTopic: { topicId, suggestedTags },
      dropLeafOnArrive: true,
    });
  },

  clearPendingTopic: () => {
    set({ pendingTopic: null, dropLeafOnArrive: false });
  },

  consumeDropLeafIntent: () => {
    const { pendingTopic, dropLeafOnArrive } = get();
    if (!dropLeafOnArrive || !pendingTopic) return null;
    set({ dropLeafOnArrive: false });
    return pendingTopic;
  },

  focusOnMap: (intent) => {
    set({ pendingMapFocus: intent });
  },

  consumeMapFocus: () => {
    const intent = get().pendingMapFocus;
    if (!intent) return null;
    set({ pendingMapFocus: null });
    return intent;
  },
}));
