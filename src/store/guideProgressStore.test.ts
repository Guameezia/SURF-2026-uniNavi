import { beforeEach, describe, expect, it } from "vitest";
import { useGuideProgressStore } from "./guideProgressStore";
import type { GuideRoute } from "../types/guide";

function route(noteIds = ["a", "b", "c"]): GuideRoute {
  return {
    id: "route-1",
    name: "测试路线",
    description: "测试",
    tags: ["tour"],
    estimatedMinutes: 20,
    stops: noteIds.map((noteId, index) => ({
      noteId,
      floorId: "0F",
      roomId: `room-${noteId}`,
      roomLabel: `站点 ${index + 1}`,
      noteText: noteId,
    })),
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("guide progress store", () => {
  beforeEach(() => {
    useGuideProgressStore.setState({ active: null, completion: null });
  });

  it("advances manually and creates a completion summary", () => {
    const target = route();
    useGuideProgressStore.getState().startRoute(target);
    expect(useGuideProgressStore.getState().active?.currentStopIndex).toBe(0);

    useGuideProgressStore.getState().advanceRoute(target);
    expect(useGuideProgressStore.getState().active?.currentStopIndex).toBe(1);
    useGuideProgressStore.getState().advanceRoute(target);
    expect(useGuideProgressStore.getState().active?.currentStopIndex).toBe(2);
    const completion = useGuideProgressStore.getState().advanceRoute(target);

    expect(completion?.completedStops).toBe(3);
    expect(useGuideProgressStore.getState().active).toBeNull();
  });

  it("keeps the same note after route reordering", () => {
    const target = route();
    useGuideProgressStore.getState().startRoute(target);
    useGuideProgressStore.getState().advanceRoute(target);

    const reordered = route(["b", "c", "a"]);
    useGuideProgressStore.getState().syncRoute(reordered);

    expect(useGuideProgressStore.getState().active?.currentNoteId).toBe("b");
    expect(useGuideProgressStore.getState().active?.currentStopIndex).toBe(0);
  });
});
