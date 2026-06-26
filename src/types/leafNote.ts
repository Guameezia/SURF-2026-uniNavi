import type { BuildingId, FloorId } from "./indoor";

export interface LeafNote {
  id: string;
  building: BuildingId;
  floorId: FloorId;
  x: number;
  y: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type LeafNoteInput = Pick<
  LeafNote,
  "building" | "floorId" | "x" | "y" | "text"
>;
