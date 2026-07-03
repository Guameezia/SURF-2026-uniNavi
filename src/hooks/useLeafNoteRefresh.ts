import { useCallback } from "react";
import { useLeafNoteStore } from "../store/leafNoteStore";
import { useTopicStore } from "../store/topicStore";

export function useLeafNoteRefresh() {
  const refreshNotes = useLeafNoteStore((s) => s.refreshNotes);
  const refreshTopics = useTopicStore((s) => s.refreshTopics);

  return useCallback(async () => {
    await new Promise((r) => setTimeout(r, 350));
    refreshNotes();
    refreshTopics();
  }, [refreshNotes, refreshTopics]);
}
