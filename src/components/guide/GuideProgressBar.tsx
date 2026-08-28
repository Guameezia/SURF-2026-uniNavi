import { useGuideStore } from "../../store/guideStore";
import { useGuideProgressStore } from "../../store/guideProgressStore";
import { useMapStore } from "../../store/mapStore";
import { useRoomStore } from "../../store/roomStore";
import { useAppNavStore } from "../../store/appNavStore";
import {
  formatGuideElapsed,
  getGuideLegInstruction,
} from "../../utils/guideProgress";

interface GuideProgressBarProps {
  onShowGuides?: () => void;
}

export function GuideProgressBar({ onShowGuides }: GuideProgressBarProps) {
  const routes = useGuideStore((state) => state.routes);
  const activeOverlay = useGuideStore((state) => state.activeOverlay);
  const setActiveOverlay = useGuideStore((state) => state.setActiveOverlay);
  const { active, completion, startRoute, advanceRoute, endRoute, clearCompletion } =
    useGuideProgressStore();
  const setCurrentFloor = useMapStore((state) => state.setCurrentFloor);
  const setRoom = useRoomStore((state) => state.setRoom);
  const focusOnMap = useAppNavStore((state) => state.focusOnMap);

  const route = active ? routes.find((item) => item.id === active.routeId) : null;

  const goToRouteStop = (
    targetRoute: NonNullable<typeof route>,
    stopIndex: number
  ) => {
    const stop = targetRoute.stops[stopIndex];
    if (!stop) return;
    setActiveOverlay({ kind: "route", id: targetRoute.id });
    setCurrentFloor(stop.floorId);
    setRoom(stop.roomId);
    focusOnMap({ floorId: stop.floorId, roomId: stop.roomId });
  };

  if (completion) {
    const completedRoute = routes.find((item) => item.id === completion.routeId);
    return (
      <div className="guide-completion" role="dialog" aria-label="路线完成">
        <span className="guide-completion-icon" aria-hidden>🎉</span>
        <div>
          <strong>路线完成：{completion.routeName}</strong>
          <p>
            用时 {formatGuideElapsed(completion.startedAt, completion.completedAt)}
            {" · "}
            {completion.completedStops} 站
            {" · "}
            {completion.floors.join("、")}
          </p>
        </div>
        <div className="guide-completion-actions">
          {completedRoute && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                startRoute(completedRoute);
                goToRouteStop(completedRoute, 0);
              }}
            >
              重新开始
            </button>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              clearCompletion();
              onShowGuides?.();
            }}
          >
            返回攻略
          </button>
        </div>
      </div>
    );
  }

  if (!active || !route) return null;
  const current = route.stops[active.currentStopIndex];
  const next = route.stops[active.currentStopIndex + 1];
  if (!current) return null;
  const engaged =
    activeOverlay?.kind === "route" && activeOverlay.id === route.id;

  if (!engaged) {
    return (
      <div className="guide-continue-bar" role="status">
        <span>🧭</span>
        <div>
          <strong>继续路线：{route.name}</strong>
          <small>
            第 {active.currentStopIndex + 1} / {route.stops.length} 站 ·{" "}
            {current.roomLabel}
          </small>
        </div>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => goToRouteStop(route, active.currentStopIndex)}
        >
          继续路线
        </button>
      </div>
    );
  }

  return (
    <div className="guide-progress-bar" role="status">
      <div className="guide-progress-main">
        <span className="guide-progress-index">
          {active.currentStopIndex + 1}
        </span>
        <div>
          <strong>当前站：{current.roomLabel}</strong>
          <small>
            {next
              ? `下一站：${next.roomLabel} · ${getGuideLegInstruction(
                  route,
                  active.currentStopIndex
                )}`
              : "已到达路线最后一站"}
          </small>
        </div>
      </div>
      <span className="guide-progress-remaining">
        剩余 {Math.max(0, route.stops.length - active.currentStopIndex - 1)} 站
      </span>
      <div className="guide-progress-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() =>
            focusOnMap({
              floorId: current.floorId,
              roomId: current.roomId,
              noteId: current.noteId,
            })
          }
        >
          查看便签
        </button>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            const completed = advanceRoute(route);
            if (completed) return;
            const nextProgress = useGuideProgressStore.getState().active;
            if (nextProgress) {
              goToRouteStop(route, nextProgress.currentStopIndex);
            }
          }}
        >
          {next ? "已到达，前往下一站" : "完成路线"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            endRoute();
            setActiveOverlay(null);
          }}
        >
          结束
        </button>
      </div>
    </div>
  );
}
