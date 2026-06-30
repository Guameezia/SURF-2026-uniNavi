import type { FloorId } from "./indoor";

export interface OverviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlaceholderVariant = "classroom" | "canteen";

export interface RoomInterior {
  type: "image" | "placeholder";
  imageSrc?: string;
  placeholderVariant?: PlaceholderVariant;
}

export interface RoomDef {
  id: string;
  label: string;
  floorId: FloorId;
  overviewRect: OverviewRect;
  interior: RoomInterior;
  viewWidth: number;
  viewHeight: number;
}
