import type { BuildingId, FloorId } from "./indoor";

export interface LeafNote {
  id: string;
  building: BuildingId;
  floorId: FloorId;
  /** 分房间模式下所属 room；坐标为 room 局部坐标 */
  roomId?: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type LeafNoteInput = Pick<
  LeafNote,
  "building" | "floorId" | "x" | "y" | "text"
> & {
  roomId?: string;
};
