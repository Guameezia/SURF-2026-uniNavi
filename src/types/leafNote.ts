import type { BuildingId, FloorId } from "./indoor";

export interface LeafNote {
  id: string;
  building: BuildingId;
  floorId: FloorId;
  roomId: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type LeafNoteInput = Pick<
  LeafNote,
  "building" | "floorId" | "roomId" | "x" | "y" | "text"
>;
