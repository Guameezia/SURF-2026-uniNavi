import type { FloorId, MapEdge, MapNode, MapPoint } from "../types/indoor";

function isSamePoint(a: MapPoint, b: MapPoint): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;
}

function appendUniquePoint(points: MapPoint[], point: MapPoint): void {
  const last = points[points.length - 1];
  if (!last || !isSamePoint(last, point)) {
    points.push(point);
  }
}

export function manhattanDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function isAxisAligned(
  ax: number,
  ay: number,
  bx: number,
  by: number
): boolean {
  return ax === bx || ay === by;
}

const POI_TYPES = new Set(["room", "toilet", "exit", "elevator", "stairs"]);

function isPoiNode(node?: MapNode): boolean {
  return node !== undefined && POI_TYPES.has(node.type);
}

function isEastBlockElevator(node: MapNode): boolean {
  return node.type === "elevator" && (node.block === "SA" || node.block === "SC");
}

function isWestBlockElevator(node: MapNode): boolean {
  return node.type === "elevator" && node.block === "SB";
}

/** SD 0F 电梯厅开口朝东；1F–5F 与 SB 一致朝西 */
function isEastOpeningSdElevator(node: MapNode): boolean {
  return (
    node.type === "elevator" && node.block === "SD" && node.floorId === "0F"
  );
}

function isWestOpeningSdElevator(node: MapNode): boolean {
  return (
    node.type === "elevator" && node.block === "SD" && node.floorId !== "0F"
  );
}

/** 0F SC 东侧电梯厅：先向西出厅，再向北接入走廊（与 SA/SC 高层东侧电梯不同） */
const SC_0F_LOBBY_CORRIDOR_X = 610;

function isSc0FEastLobbyPoi(node?: MapNode): boolean {
  return (
    node !== undefined &&
    node.floorId === "0F" &&
    node.block === "SC" &&
    node.type === "elevator"
  );
}

function buildSc0FEastLobbyHallPoints(
  poi: MapNode,
  junction: MapNode
): MapPoint[] {
  const start: MapPoint = { x: poi.x, y: poi.y, id: poi.id };
  const end: MapPoint = { x: junction.x, y: junction.y, id: junction.id };
  const corridorX = SC_0F_LOBBY_CORRIDOR_X;

  if (isAxisAligned(poi.x, poi.y, junction.x, junction.y)) {
    return [start, end];
  }

  const onCorridor: MapPoint = { x: corridorX, y: poi.y };
  const atJunctionRow: MapPoint = { x: corridorX, y: junction.y };
  if (isSamePoint(atJunctionRow, end)) {
    return [start, onCorridor, end];
  }
  return [start, onCorridor, atJunctionRow, end];
}

function getSc0FEastLobbyEdgeWaypoints(
  poi: MapNode,
  junction: MapNode
): MapPoint[] {
  return buildSc0FEastLobbyHallPoints(poi, junction)
    .slice(1, -1)
    .map((point) => ({ x: point.x, y: point.y }));
}

/** 0F SB 西侧出口：先水平对准中间横向大通道中线，再接入 */
const EXIT_0F_SB_W_IDS = new Set(["S_SB_EXIT_W_0F"]);
/** 0F SC 东侧出口：先沿出口高度水平进入走廊，再拐向电梯厅 */
const EXIT_0F_SC_E_IDS = new Set(["S_SC_EXIT_E_0F"]);

function isExit0FScEast(node?: MapNode): boolean {
  return node !== undefined && EXIT_0F_SC_E_IDS.has(node.id);
}

function isExit0FSbWest(node?: MapNode): boolean {
  return node !== undefined && EXIT_0F_SB_W_IDS.has(node.id);
}

/** 3F 连廊出口（1F↔3F 楼梯间），出口图标位置不动，路径沿连廊中线水平直行 */
const EXIT_1F3F_3F_IDS = new Set([
  "S_SA_EXIT_1F3F_3F",
  "S_SB_EXIT_1F3F_3F",
  "S_SC_EXIT_1F3F_3F",
  "S_SD_EXIT_1F3F_3F",
]);

function isExit1F3F3F(node?: MapNode): boolean {
  return node !== undefined && EXIT_1F3F_3F_IDS.has(node.id);
}

/**
 * 3F 连廊出口 → junction：出口点不动，先沿出口高度水平直行，再在 junction 列垂直到位
 */
export function getExit1F3F3FHallPoints(
  exit: MapNode,
  junction: MapNode
): MapPoint[] {
  const start: MapPoint = { x: exit.x, y: exit.y, id: exit.id };
  const end: MapPoint = { x: junction.x, y: junction.y, id: junction.id };

  if (isAxisAligned(exit.x, exit.y, junction.x, junction.y)) {
    return [start, end];
  }

  const onCorridor: MapPoint = { x: junction.x, y: exit.y };
  if (isSamePoint(onCorridor, end)) {
    return [start, end];
  }
  return [start, onCorridor, end];
}

export function getExit1F3F3FEdgeWaypoints(
  exit: MapNode,
  junction: MapNode
): MapPoint[] {
  return getExit1F3F3FHallPoints(exit, junction)
    .slice(1, -1)
    .map((point) => ({ x: point.x, y: point.y }));
}

function tryGetExit1F3F3FHallPoints(
  _from: MapPoint,
  _to: MapPoint,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] | null {
  const exit =
    isExit1F3F3F(fromNode)
      ? fromNode
      : isExit1F3F3F(toNode)
        ? toNode
        : undefined;
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;

  if (!exit || !junction) return null;

  const forward = fromNode === exit;
  const points = getExit1F3F3FHallPoints(exit, junction);
  return forward ? points : [...points].reverse();
}

function tryGetExit0FScEastHallPoints(
  _from: MapPoint,
  _to: MapPoint,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] | null {
  const exit =
    isExit0FScEast(fromNode)
      ? fromNode
      : isExit0FScEast(toNode)
        ? toNode
        : undefined;
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;

  if (!exit || !junction) return null;

  const forward = fromNode === exit;
  const points = getExit1F3F3FHallPoints(exit, junction);
  return forward ? points : [...points].reverse();
}

function tryGetExit0FSbWestHallPoints(
  _from: MapPoint,
  _to: MapPoint,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] | null {
  const exit =
    isExit0FSbWest(fromNode)
      ? fromNode
      : isExit0FSbWest(toNode)
        ? toNode
        : undefined;
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;

  if (!exit || !junction) return null;

  const forward = fromNode === exit;
  const points = getExit1F3F3FHallPoints(exit, junction);
  return forward ? points : [...points].reverse();
}

function tryGetSc0FEastLobbyHallPoints(
  _from: MapPoint,
  _to: MapPoint,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] | null {
  const poi =
    isSc0FEastLobbyPoi(fromNode)
      ? fromNode
      : isSc0FEastLobbyPoi(toNode)
        ? toNode
        : undefined;
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;

  if (!poi || !junction) return null;

  const forward = fromNode === poi;
  const points = buildSc0FEastLobbyHallPoints(poi, junction);
  return forward ? points : [...points].reverse();
}

/** 东侧电梯出厅向东的短距 stub（SVG 坐标），仅用于表明开门方向 */
const EAST_HALL_EXIT_STUB = 18;

/** 西侧电梯出厅向西的短距 stub（SVG 坐标） */
const WEST_HALL_EXIT_STUB = 18;

type HallExitDirection = "east" | "west";

function getHallExitDirection(node: MapNode): HallExitDirection | null {
  if (isSc0FEastLobbyPoi(node)) return null;
  if (isEastBlockElevator(node) || isEastOpeningSdElevator(node)) return "east";
  if (isWestBlockElevator(node) || isWestOpeningSdElevator(node)) return "west";
  return null;
}

/**
 * 电梯厅 → 走廊 junction 折点
 * 1. 沿开门方向短距出厅
 * 2. 垂直落到走廊中线（junction.y）
 * 3. 最后一段水平与走廊重合，后续路段可共线合并为一条
 */
function buildElevatorCorridorPoints(
  elevator: MapNode,
  junction: MapNode,
  exit: HallExitDirection
): MapPoint[] {
  const start: MapPoint = { x: elevator.x, y: elevator.y, id: elevator.id };
  const end: MapPoint = { x: junction.x, y: junction.y, id: junction.id };
  const { x: ex, y: ey } = elevator;
  const { x: jx, y: jy } = junction;

  if (isAxisAligned(ex, ey, jx, jy)) {
    return [start, end];
  }

  const stub = exit === "east" ? EAST_HALL_EXIT_STUB : WEST_HALL_EXIT_STUB;
  const hallX = exit === "east" ? ex + stub : ex - stub;
  const junctionOnExitSide = exit === "east" ? jx >= ex : jx <= ex;

  if (junctionOnExitSide) {
    return [start, { x: jx, y: ey }, end];
  }

  return [start, { x: hallX, y: ey }, { x: hallX, y: jy }, end];
}

/**
 * 电梯 ↔ 走廊 junction：按开门方向进出电梯厅
 * - 东侧电梯（SA/SC）：门朝东，先向东出厅，再沿走廊中线（junction.y）接入
 * - 西侧电梯（SB/SD）：门朝西，先向西出厅，再沿走廊中线接入
 */
export function getElevatorHallPoints(
  elevator: MapNode,
  junction: MapNode
): MapPoint[] {
  const exit = getHallExitDirection(elevator);
  if (!exit) {
    const start: MapPoint = { x: elevator.x, y: elevator.y, id: elevator.id };
    const end: MapPoint = { x: junction.x, y: junction.y, id: junction.id };
    return [start, pickPoiJunctionCorner(elevator, junction), end];
  }
  return buildElevatorCorridorPoints(elevator, junction, exit);
}

/** 构图时为电梯边生成 waypoints，使厅→走廊几何固化在边数据上 */
export function getElevatorEdgeWaypoints(
  elevator: MapNode,
  junction: MapNode
): MapPoint[] {
  return getElevatorHallPoints(elevator, junction)
    .slice(1, -1)
    .map((point) => ({ x: point.x, y: point.y }));
}

function tryGetElevatorHallPoints(
  _from: MapPoint,
  _to: MapPoint,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] | null {
  const elevator =
    fromNode?.type === "elevator"
      ? fromNode
      : toNode?.type === "elevator"
        ? toNode
        : undefined;
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;

  if (!elevator || !junction) return null;

  const forward = fromNode === elevator;
  const points = getElevatorHallPoints(elevator, junction);
  return forward ? points : [...points].reverse();
}

/**
 * POI ↔ 走廊 junction：优先沿走廊轴接入，避免先横移再折回（典型 Z 字乱折）
 */
export function pickPoiJunctionCorner(
  poi: MapNode,
  junction: MapNode
): MapPoint {
  const dx = Math.abs(poi.x - junction.x);
  const dy = Math.abs(poi.y - junction.y);
  if (dy <= dx) {
    return { x: poi.x, y: junction.y };
  }
  return { x: junction.x, y: poi.y };
}

/** 正交拐角点（先横后竖 / 先竖后横） */
export function pickOrthogonalCorner(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  directionHint?: string,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint {
  const junction =
    fromNode?.type === "junction"
      ? fromNode
      : toNode?.type === "junction"
        ? toNode
        : undefined;
  const poi =
    junction && isPoiNode(fromNode) && fromNode !== junction
      ? fromNode
      : junction && isPoiNode(toNode) && toNode !== junction
        ? toNode
        : undefined;

  if (junction && poi) {
    if (isExit1F3F3F(poi) || isExit0FScEast(poi) || isExit0FSbWest(poi)) {
      return { x: junction.x, y: poi.y };
    }
    return pickPoiJunctionCorner(poi, junction);
  }

  if (directionHint === "east" || directionHint === "west") {
    return { x: bx, y: ay };
  }
  if (
    directionHint === "south" ||
    directionHint === "north" ||
    directionHint === "up"
  ) {
    return { x: ax, y: by };
  }
  return Math.abs(bx - ax) >= Math.abs(by - ay)
    ? { x: bx, y: ay }
    : { x: ax, y: by };
}

/** 两点间正交折线路径（用于绘制单条边） */
export function getEdgeOrthogonalPoints(
  from: MapPoint,
  to: MapPoint,
  directionHint?: string,
  fromNode?: MapNode,
  toNode?: MapNode
): MapPoint[] {
  if (isAxisAligned(from.x, from.y, to.x, to.y)) {
    return [from, to];
  }

  const exit1F3FHall = tryGetExit1F3F3FHallPoints(from, to, fromNode, toNode);
  if (exit1F3FHall) {
    return exit1F3FHall;
  }

  const exit0FScHall = tryGetExit0FScEastHallPoints(from, to, fromNode, toNode);
  if (exit0FScHall) {
    return exit0FScHall;
  }

  const exit0FSbHall = tryGetExit0FSbWestHallPoints(from, to, fromNode, toNode);
  if (exit0FSbHall) {
    return exit0FSbHall;
  }

  const sc0FLobbyHall = tryGetSc0FEastLobbyHallPoints(from, to, fromNode, toNode);
  if (sc0FLobbyHall) {
    return sc0FLobbyHall;
  }

  const elevatorHall = tryGetElevatorHallPoints(from, to, fromNode, toNode);
  if (elevatorHall) {
    return elevatorHall;
  }

  const corner = pickOrthogonalCorner(
    from.x,
    from.y,
    to.x,
    to.y,
    directionHint,
    fromNode,
    toNode
  );
  return [from, corner, to];
}

/** 将任意点列展开为只包含水平/垂直线段的折线 */
export function expandToOrthogonalPoints(
  points: MapPoint[],
  directionHint?: string,
  anchorNodes?: (MapNode | undefined)[]
): MapPoint[] {
  if (points.length < 2) return points;

  const result: MapPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    const point = points[i];
    const segmentPoints = getEdgeOrthogonalPoints(
      last,
      point,
      directionHint,
      anchorNodes?.[i - 1],
      anchorNodes?.[i]
    );
    for (const segmentPoint of segmentPoints.slice(1)) {
      appendUniquePoint(result, segmentPoint);
    }
  }

  return result;
}

/** 合并共线中间点，去掉冗余折角 */
export function simplifyOrthogonalPath(points: MapPoint[]): MapPoint[] {
  if (points.length < 3) return points;

  const result: MapPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const collinearX =
      Math.abs(prev.x - curr.x) < 0.01 && Math.abs(curr.x - next.x) < 0.01;
    const collinearY =
      Math.abs(prev.y - curr.y) < 0.01 && Math.abs(curr.y - next.y) < 0.01;
    if (!collinearX && !collinearY) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export function getPolylineDistance(points: MapPoint[]): number {
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += manhattanDistance(
      points[i].x,
      points[i].y,
      points[i + 1].x,
      points[i + 1].y
    );
  }
  return distance;
}

/** 获取边在 edge.from → edge.to 方向上的真实正交几何 */
export function getEdgePathPoints(
  edge: MapEdge,
  nodesById: Record<string, MapNode>
): MapPoint[] {
  const from = nodesById[edge.from];
  const to = nodesById[edge.to];
  if (!from || !to) return [];

  const anchorNodes: (MapNode | undefined)[] = [
    from,
    ...(edge.waypoints ?? []).map(() => undefined),
    to,
  ];
  const basePoints: MapPoint[] = [
    { x: from.x, y: from.y, id: from.id },
    ...(edge.waypoints ?? []).map((point) => ({ x: point.x, y: point.y })),
    { x: to.x, y: to.y, id: to.id },
  ];

  return simplifyOrthogonalPath(
    expandToOrthogonalPoints(basePoints, edge.directionHint, anchorNodes)
  );
}

/** 获取按实际经过方向排列的边几何，避免反向走边时折角被镜像到走廊外 */
export function getTraversedEdgePathPoints(
  edge: MapEdge,
  nodesById: Record<string, MapNode>,
  fromNodeId: string
): MapPoint[] {
  const points = getEdgePathPoints(edge, nodesById);
  return fromNodeId === edge.to ? [...points].reverse() : points;
}

function cornerNodeId(floorId: FloorId, x: number, y: number): string {
  return `__corner__${floorId}__${x}_${y}`;
}

function axisDirectionHint(
  ax: number,
  ay: number,
  bx: number,
  by: number
): string {
  if (bx !== ax) return bx > ax ? "east" : "west";
  return by > ay ? "south" : "north";
}

function makeFlatEdge(
  from: string,
  to: string,
  fromNode: MapNode,
  toNode: MapNode,
  directionHint: string
): MapEdge {
  return {
    from,
    to,
    distance: manhattanDistance(fromNode.x, fromNode.y, toNode.x, toNode.y),
    edgeType: "flat",
    directionHint,
  };
}

/**
 * 将路网规范为可步行正交图：
 * - 同层 flat 边距离改为边几何折线长度
 * - 走廊 junction 之间禁止斜连，自动拆成直角折线
 * - POI ↔ junction 保留斜连，距离按曼哈顿（表示沿走廊拐入房间）
 * - 带 waypoints 的边按显式折点作为真实路径
 */
export function normalizeOrthogonalGraph(
  nodes: MapNode[],
  edges: MapEdge[]
): { nodes: MapNode[]; edges: MapEdge[] } {
  const nodesById: Record<string, MapNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const normalizedEdges: MapEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (edge: MapEdge) => {
    const from = nodesById[edge.from];
    const to = nodesById[edge.to];
    if (!from || !to) return;

    const key =
      edge.from < edge.to
        ? `${edge.from}|${edge.to}`
        : `${edge.to}|${edge.from}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);

    normalizedEdges.push({
      ...edge,
      distance:
        edge.edgeType === "flat"
          ? getPolylineDistance(getEdgePathPoints(edge, nodesById))
          : edge.distance,
    });
  };

  const ensureCornerNode = (
    floorId: FloorId,
    x: number,
    y: number,
    building: string
  ): MapNode => {
    const id = cornerNodeId(floorId, x, y);
    const existing = nodesById[id];
    if (existing) return existing;

    const node: MapNode = {
      id,
      type: "junction",
      label: "",
      building,
      floorId,
      block: "virtual",
      x,
      y,
    };
    nodesById[id] = node;
    return node;
  };

  for (const edge of edges) {
    if (edge.edgeType !== "flat") {
      addEdge(edge);
      continue;
    }

    const from = nodesById[edge.from];
    const to = nodesById[edge.to];
    if (!from || !to) continue;

    if (from.floorId !== to.floorId) {
      addEdge(edge);
      continue;
    }

    if (edge.waypoints && edge.waypoints.length > 0) {
      addEdge(edge);
      continue;
    }

    const isElevatorJunction =
      (from.type === "elevator" && to.type === "junction") ||
      (to.type === "elevator" && from.type === "junction");
    if (isElevatorJunction) {
      const elevator = from.type === "elevator" ? from : to;
      const junction = from.type === "junction" ? from : to;
      const waypoints = isSc0FEastLobbyPoi(elevator)
        ? getSc0FEastLobbyEdgeWaypoints(elevator, junction)
        : getElevatorEdgeWaypoints(elevator, junction);
      addEdge({
        ...edge,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      });
      continue;
    }

    const isExit0FSbJunction =
      (isExit0FSbWest(from) && to.type === "junction") ||
      (isExit0FSbWest(to) && from.type === "junction");
    if (isExit0FSbJunction) {
      const exit = isExit0FSbWest(from) ? from : to;
      const junction = from.type === "junction" ? from : to;
      const waypoints = getExit1F3F3FEdgeWaypoints(exit, junction);
      addEdge({
        ...edge,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      });
      continue;
    }

    const isExit0FScJunction =
      (isExit0FScEast(from) && to.type === "junction") ||
      (isExit0FScEast(to) && from.type === "junction");
    if (isExit0FScJunction) {
      const exit = isExit0FScEast(from) ? from : to;
      const junction = from.type === "junction" ? from : to;
      const waypoints = getExit1F3F3FEdgeWaypoints(exit, junction);
      addEdge({
        ...edge,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      });
      continue;
    }

    const isExit1F3F3FJunction =
      (isExit1F3F3F(from) && to.type === "junction") ||
      (isExit1F3F3F(to) && from.type === "junction");
    if (isExit1F3F3FJunction) {
      const exit = isExit1F3F3F(from) ? from : to;
      const junction = from.type === "junction" ? from : to;
      const waypoints = getExit1F3F3FEdgeWaypoints(exit, junction);
      addEdge({
        ...edge,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      });
      continue;
    }

    const aligned = isAxisAligned(from.x, from.y, to.x, to.y);

    // POI ↔ 走廊：允许 L 形接入
    if (from.type !== "junction" || to.type !== "junction") {
      addEdge(edge);
      continue;
    }

    if (aligned) {
      addEdge(edge);
      continue;
    }

    // 走廊 junction 斜连 → 拆成正交两段
    const corner = pickOrthogonalCorner(
      from.x,
      from.y,
      to.x,
      to.y,
      edge.directionHint
    );
    const cornerNode = ensureCornerNode(
      from.floorId,
      corner.x,
      corner.y,
      from.building
    );

    addEdge(
      makeFlatEdge(
        edge.from,
        cornerNode.id,
        from,
        cornerNode,
        axisDirectionHint(from.x, from.y, corner.x, corner.y)
      )
    );
    addEdge(
      makeFlatEdge(
        cornerNode.id,
        edge.to,
        cornerNode,
        to,
        axisDirectionHint(corner.x, corner.y, to.x, to.y)
      )
    );
  }

  return {
    nodes: Object.values(nodesById),
    edges: normalizedEdges,
  };
}
