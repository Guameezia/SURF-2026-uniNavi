import { create } from "zustand";
import type { LeafNoteTagId } from "../types/leafNote";
import type { PendingTopicIntent } from "../types/topic";

interface AppNavState {
  pendingTopic: PendingTopicIntent | null;
  dropLeafOnArrive: boolean;

  participateTopic: (topicId: string, suggestedTags: LeafNoteTagId[]) => void;
  clearPendingTopic: () => void;
  consumeDropLeafIntent: () => PendingTopicIntent | null;
}

export const useAppNavStore = create<AppNavState>((set, get) => ({
  pendingTopic: null,
  dropLeafOnArrive: false,

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
}));
