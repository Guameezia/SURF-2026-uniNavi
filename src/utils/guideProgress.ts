import type { GuideRoute } from "../types/guide";
import { VERTICAL_SHAFTS } from "../data/floorPortals";
import { getRoomById } from "../data/roomConfig";

function floorNumber(floorId: string): number {
  return Number.parseInt(floorId, 10);
}

export function getGuideLegInstruction(
  route: GuideRoute,
  currentStopIndex: number
): string {
  const from = route.stops[currentStopIndex];
  const to = route.stops[currentStopIndex + 1];
  if (!from || !to) return "已到达路线最后一站";

  if (from.floorId !== to.floorId) {
    const leg = route.geometry?.legs[currentStopIndex];
    const nodeIds = new Set(
      leg?.segments.flatMap((segment) => segment.nodeIds) ?? []
    );
    const shaft = VERTICAL_SHAFTS.find((candidate) => {
      const matchedFloors = candidate.floors.filter((binding) =>
        nodeIds.has(binding.nodeId)
      );
      return matchedFloors.length >= 2;
    });
    const direction =
      floorNumber(to.floorId) > floorNumber(from.floorId) ? "上至" : "下至";
    if (shaft) {
      const [block] = shaft.shaftKey.split("-");
      const side = shaft.isWest ? "西侧" : "东侧";
      const kind = shaft.kind === "elevator" ? "电梯" : "楼梯";
      return `前往 ${block.toUpperCase()} ${side}${kind}，${direction} ${to.floorId}`;
    }
    return `前往楼梯或电梯，${direction} ${to.floorId}`;
  }

  const fromRoom = getRoomById(from.floorId, from.roomId);
  const toRoom = getRoomById(to.floorId, to.roomId);
  if (!fromRoom || !toRoom) return "沿小地图橙色路线前进";
  const a = fromRoom.overviewRect;
  const b = toRoom.overviewRect;
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "向东，沿橙色路线前进" : "向西，沿橙色路线前进";
  }
  return dy >= 0 ? "向南，沿橙色路线前进" : "向北，沿橙色路线前进";
}

export function formatGuideElapsed(startedAt: number, endedAt = Date.now()): string {
  const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}
